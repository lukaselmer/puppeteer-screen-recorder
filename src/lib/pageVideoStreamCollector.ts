import { EventEmitter } from 'events'
import { CDPSession, Page } from 'puppeteer'
import { PuppeteerScreenRecorderOptions } from './pageVideoStreamTypes'

export class PageVideoStreamCollector extends EventEmitter {
  private page: Page
  private options: PuppeteerScreenRecorderOptions
  private sessionsStack: CDPSession[] = []
  private isStreamingEnded = false

  private isFrameAckReceived: Promise<void> | undefined

  constructor(page: Page, options: PuppeteerScreenRecorderOptions) {
    super()
    this.page = page
    this.options = options
  }

  private async getPageSession(page: Page): Promise<CDPSession | null> {
    try {
      const context = page.target()
      return await context.createCDPSession()
    } catch (error) {
      console.log('Failed to create CDP Session', error)
      return null
    }
  }

  private getCurrentSession(): CDPSession | undefined {
    return this.sessionsStack.at(-1)
  }

  private addListenerOnTabOpens(page: Page): void {
    page.on('popup', (newPage) => this.registerTabListener(newPage))
  }

  private removeListenerOnTabClose(page: Page): void {
    page.off('popup', (newPage) => this.registerTabListener(newPage))
  }

  private async registerTabListener(newPage: Page): Promise<void> {
    await this.startSession(newPage)
    newPage.once('close', () => this.gracefulEndSession())
  }

  private async startScreenCast(shouldDeleteSessionOnFailure = false) {
    const currentSession = this.getCurrentSession()
    // if (!currentSession) throw new Error('No current session found')

    try {
      await currentSession!.send('Animation.setPlaybackRate', {
        playbackRate: 1,
      })
      await currentSession!.send('Page.startScreencast', {
        everyNthFrame: 1,
        format: this.options.format || 'jpeg',
        quality: this.quality,
      })
    } catch (e) {
      if (shouldDeleteSessionOnFailure) await this.endSession()
    }
  }

  private async stopScreenCast() {
    const currentSession = this.getCurrentSession()
    if (!currentSession) return

    await currentSession.send('Page.stopScreencast')
  }

  private async startSession(page: Page): Promise<void> {
    const pageSession = await this.getPageSession(page)
    if (!pageSession) {
      return
    }
    await this.stopScreenCast()
    this.sessionsStack.push(pageSession)
    this.handleScreenCastFrame(pageSession)
    await this.startScreenCast(true)
  }

  private handleScreenCastFrame(session: CDPSession) {
    this.isFrameAckReceived = new Promise((resolve) => {
      session.on('Page.screencastFrame', async ({ metadata, data, sessionId }) => {
        if (!metadata.timestamp || this.isStreamingEnded) {
          return resolve()
        }

        const ackPromise = session.send('Page.screencastFrameAck', {
          sessionId,
        })

        this.emit('pageScreenFrame', {
          blob: Buffer.from(data, 'base64'),
          timestamp: metadata.timestamp,
        })

        try {
          await ackPromise
        } catch (error) {
          console.error('Error in sending Acknowledgment for PageScreenCast', (error as Error).message)
        }
      })
    })
  }

  private async gracefulEndSession(): Promise<void> {
    try {
      await this.endSession()
    } catch (error) {
      console.error('Error while ending the session', error)
    }
  }

  private async endSession(): Promise<void> {
    this.sessionsStack.pop()
    await this.startScreenCast()
  }

  async start(): Promise<void> {
    await this.startSession(this.page)
    this.page.once('close', () => this.gracefulEndSession())

    if (this.shouldFollowPopupWindow) {
      this.addListenerOnTabOpens(this.page)
    }
  }

  async stop(): Promise<boolean> {
    if (this.isStreamingEnded) {
      return this.isStreamingEnded
    }

    if (this.shouldFollowPopupWindow) {
      this.removeListenerOnTabClose(this.page)
    }

    await Promise.race([this.isFrameAckReceived, new Promise((resolve) => setTimeout(resolve, 1000))])

    this.isStreamingEnded = true

    try {
      for (const currentSession of this.sessionsStack) {
        await currentSession.detach()
      }
    } catch (e) {
      console.warn('Error detaching session', (e as Error).message)
    }

    return true
  }

  private get quality(): number {
    return clamp(this.options.quality || 100, 0, 100)
  }

  private get shouldFollowPopupWindow(): boolean {
    return typeof this.options.followNewTab === 'boolean' ? this.options.followNewTab : true
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
