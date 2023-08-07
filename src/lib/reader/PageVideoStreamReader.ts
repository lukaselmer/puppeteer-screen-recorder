import { CDPSession, Page } from 'puppeteer'
import { TypedEmitter } from 'tiny-typed-emitter'
import { Logger } from '../logger'
import { PageScreenFrame } from '../PageScreenFrame'
import { PageVideoStreamReaderOptions } from './PageVideoStreamReaderOptions'

export class PageVideoStreamReader extends TypedEmitter<PageVideoStreamReaderEvents> {
  private page: Page
  private sessionsStack: CDPSession[] = []
  private streamingEnded = false
  private onTabOpenListener: (page: Page) => void

  private frameAckReceived: Promise<void> | undefined

  constructor(
    page: Page,
    private options: PageVideoStreamReaderOptions
  ) {
    super()
    this.page = page
    this.onTabOpenListener = (newPage) => this.onTabOpen(newPage)
  }

  async start(): Promise<void> {
    await this.startSession(this.page)
    this.page.once('close', () => this.gracefulEndSession())

    if (this.options.followNewTab) this.addListenerOnTabOpen(this.page)
  }

  async stop(): Promise<void> {
    if (this.streamingEnded) return
    this.streamingEnded = true

    if (this.options.followNewTab) this.removeListenerOnTabClose(this.page)

    await Promise.race([this.frameAckReceived, new Promise((resolve) => setTimeout(resolve, 1000))])

    try {
      for (const currentSession of this.sessionsStack) await currentSession.detach()
    } catch (e) {
      this.logger.warn('Error detaching session', (e as Error).message)
    }
  }

  private addListenerOnTabOpen(page: Page): void {
    page.on('popup', this.onTabOpenListener)
  }

  private removeListenerOnTabClose(page: Page): void {
    page.off('popup', this.onTabOpenListener)
  }

  private async onTabOpen(newPage: Page): Promise<void> {
    await this.startSession(newPage)
    newPage.once('close', () => this.gracefulEndSession())
  }

  private async startSession(page: Page): Promise<void> {
    const pageSession = await createCDPSession(this.logger, page)
    if (!pageSession) return

    await this.stopScreenCast()
    this.sessionsStack.push(pageSession)
    this.handleScreenCastFrame(pageSession)
    await this.startScreenCast(true)
  }

  private async stopScreenCast() {
    const currentSession = this.getCurrentSession()
    if (!currentSession) return

    await currentSession.send('Page.stopScreencast')
  }

  private handleScreenCastFrame(session: CDPSession) {
    this.frameAckReceived = new Promise((resolve) => {
      session.on('Page.screencastFrame', async ({ metadata, data, sessionId }: ScreencastFrame) => {
        if (this.streamingEnded) return resolve()

        const ackPromise = session.send('Page.screencastFrameAck', { sessionId })

        if (!metadata.timestamp) return resolve()

        const blob = Buffer.from(data, 'base64')
        const frame: PageScreenFrame = { blob, timestamp: metadata.timestamp }
        this.emit('pageScreenFrame', frame)

        try {
          await ackPromise
        } catch (error) {
          this.logger.error('Error sending screencastFrameAck', error)
        }
      })
    })
  }

  private async gracefulEndSession(): Promise<void> {
    try {
      await this.endSession()
    } catch (error) {
      this.logger.error('Error while ending the session', error)
    }
  }

  private async endSession(): Promise<void> {
    this.sessionsStack.pop()
    await this.startScreenCast(false)
  }

  private async startScreenCast(shouldDeleteSessionOnFailure: boolean) {
    const currentSession = this.getCurrentSession()
    if (!currentSession) {
      if (shouldDeleteSessionOnFailure) await this.endSession()
      return
    }

    try {
      await currentSession.send('Animation.setPlaybackRate', { playbackRate: 1 })
      await currentSession.send('Page.startScreencast', {
        everyNthFrame: 1,
        format: this.options.inputFormat,
        quality: this.options.inputQuality,
      })
    } catch {
      if (shouldDeleteSessionOnFailure) await this.endSession()
    }
  }

  private getCurrentSession(): CDPSession | undefined {
    return this.sessionsStack.at(-1)
  }

  private get logger() {
    return this.options.logger
  }
}

async function createCDPSession(logger: Logger, page: Page): Promise<CDPSession | null> {
  try {
    return await page.target().createCDPSession()
  } catch (error) {
    logger.warn('Failed to create CDP Session', error)
    return null
  }
}

export type PageVideoStreamReaderEvents = {
  pageScreenFrame: (pageScreenFrame: PageScreenFrame) => void
}

// https://chromedevtools.github.io/devtools-protocol/tot/Page/#event-screencastFrame
export interface ScreencastFrame {
  metadata: ScreencastFrameMetadata
  data: string
  sessionId: number
}

// https://chromedevtools.github.io/devtools-protocol/tot/Page/#type-ScreencastFrameMetadata
export interface ScreencastFrameMetadata {
  timestamp: number
}
