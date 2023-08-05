import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import { Writable } from 'stream'
import { Page } from 'puppeteer'
import { PageVideoStreamCollector } from './pageVideoStreamCollector'
import { PuppeteerScreenRecorderOptions } from './pageVideoStreamTypes'
import { PageVideoStreamWriter } from './pageVideoStreamWriter'

/**
 * @ignore
 * @default
 * @description This will be option passed to the puppeteer screen recorder
 */
const defaultPuppeteerScreenRecorderOptions: PuppeteerScreenRecorderOptions = {
  followNewTab: true,
  fps: 15,
  quality: 100,
  ffmpegPath: null,
  videoFrame: {
    width: null,
    height: null,
  },
  aspectRatio: '4:3',
}

/**
 * PuppeteerScreenRecorder class is responsible for managing the video
 *
 * ```typescript
 * const screenRecorderOptions = {
 *  followNewTab: true,
 *  fps: 15,
 * }
 * const savePath = "./test/demo.mp4";
 * const screenRecorder = new PuppeteerScreenRecorder(page, screenRecorderOptions);
 * await screenRecorder.start(savePath);
 *  // some puppeteer action or test
 * await screenRecorder.stop()
 * ```
 */
export class PuppeteerScreenRecorder {
  private page: Page
  private options: PuppeteerScreenRecorderOptions
  private streamReader: PageVideoStreamCollector
  private streamWriter!: PageVideoStreamWriter
  private stopRecordingPromise: Promise<void> | undefined

  constructor(page: Page, options = {}) {
    this.options = Object.assign({}, defaultPuppeteerScreenRecorderOptions, options)
    this.streamReader = new PageVideoStreamCollector(page, this.options)
    this.page = page
  }

  /**
   * @description return the total duration of the video recorded,
   *  1. if this method is called before calling the stop method, it would be return the time till it has recorded.
   *  2. if this method is called after stop method, it would give the total time for recording
   * @returns total duration of video
   */
  getRecordDuration(): string {
    if (!this.streamWriter) {
      return '00:00:00:00'
    }
    return this.streamWriter.duration
  }

  /**
   * @param savePath accepts a path string to store the video
   * @description Start the video capturing session
   * @example
   * ```
   *  const savePath = './test/demo.mp4'; //.mp4 is required
   *  await recorder.start(savePath);
   * ```
   */
  async start(savePath: string): Promise<void> {
    await this.ensureDirectoryExist(dirname(savePath))

    this.streamWriter = new PageVideoStreamWriter(savePath, this.options)
    await this.streamWriter.startStreamWriter()
    await this.startStreamReader()
  }

  private async ensureDirectoryExist(dirPath: string) {
    await mkdir(dirPath, { recursive: true })
  }

  /**
   * @description Start the video capturing session in a stream
   * @example
   * ```
   *  const stream = new PassThrough();
   *  await recorder.startStream(stream);
   * ```
   */
  async startStream(stream: Writable): Promise<void> {
    this.streamWriter = new PageVideoStreamWriter(stream, this.options)
    await this.streamWriter.startStreamWriter()
    await this.startStreamReader()
  }

  /**
   * @description start listening for video stream from the page.
   * @returns PuppeteerScreenRecorder
   */
  private async startStreamReader(): Promise<PuppeteerScreenRecorder> {
    this.setupListeners()

    await this.streamReader.start()
    return this
  }

  private setupListeners(): void {
    this.page.once('close', () => this.gracefulStop())

    this.streamReader.on('pageScreenFrame', (pageScreenFrame) => {
      this.streamWriter.insert(pageScreenFrame)
    })

    this.streamWriter.once('videoStreamWriterError', () => this.gracefulStop())
  }

  async gracefulStop() {
    try {
      await this.stop()
    } catch (error) {
      console.error('Error while stopping the video recording', error)
    }
  }

  /**
   * @description stop the video capturing session
   * @throws {Error} if the video could not be captured
   */
  async stop(): Promise<void> {
    if (this.stopRecordingPromise) await this.stopRecordingPromise

    this.stopRecordingPromise = this.stopInternal()
    await this.stopRecordingPromise
  }

  private async stopInternal(): Promise<void> {
    await this.streamWriter.stop()
    await this.streamReader.stop()
  }
}
