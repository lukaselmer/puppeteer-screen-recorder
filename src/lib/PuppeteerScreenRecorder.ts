import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Writable } from 'node:stream'
import { Page } from 'puppeteer'
import {
  DefinedPuppeteerScreenRecorderOptions,
  PuppeteerScreenRecorderOptions,
  toDefinedOptions,
} from './PuppeteerScreenRecorderOptions'
import { PageVideoStreamReader } from './reader/PageVideoStreamReader'
import { PageVideoStreamWriter } from './writer/pageVideoStreamWriter'

/**
 * PuppeteerScreenRecorder class is responsible for managing the video
 *
 * ```typescript
 * const screenRecorderOptions = {
 *   followNewTab: true,
 *   fps: 15,
 *   outputFormat: 'mp4',
 * }
 * const savePath = "./test/demo.mp4";
 * const screenRecorder = new PuppeteerScreenRecorder(page, screenRecorderOptions);
 * await screenRecorder.statWritingToFile(savePath);
 *  // some puppeteer action or test
 * await screenRecorder.stop()
 * ```
 */
export class PuppeteerScreenRecorder {
  private options: DefinedPuppeteerScreenRecorderOptions
  private streamReader: PageVideoStreamReader
  private streamWriter!: PageVideoStreamWriter
  private stopRecordingPromise: Promise<void> | undefined
  recorderErrors: Error[] = []

  constructor(
    private page: Page,
    options: PuppeteerScreenRecorderOptions = {}
  ) {
    this.options = toDefinedOptions(options)
    this.streamReader = new PageVideoStreamReader(page, this.options.inputOptions)
  }

  /**
   * @description return the total duration of the video recorded,
   *  1. if this method is called before calling the stop method, it would be return the time till it has recorded.
   *  2. if this method is called after stop method, it would give the total time for recording
   * @returns total duration of video
   */
  get recordDuration(): string {
    return this.streamWriter?.duration ?? '00:00:00:00'
  }

  /**
   * @param savePath accepts a path string to store the video
   * @description Start the video capturing session
   * @example
   * ```
   *  const savePath = './test/demo.mp4'
   *  await recorder.statWritingToFile(savePath)
   * ```
   */
  async statWritingToFile(savePath: string): Promise<void> {
    await this.ensureDirectoryExist(dirname(savePath))

    this.streamWriter = new PageVideoStreamWriter(savePath, this.options.outputOptions)
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
   *  await recorder.startWritingToStream(stream);
   * ```
   */
  async startWritingToStream(stream: Writable): Promise<void> {
    this.streamWriter = new PageVideoStreamWriter(stream, this.options.outputOptions)
    await this.streamWriter.startStreamWriter()
    await this.startStreamReader()
  }

  /**
   * @description start listening for video stream from the page.
   */
  private async startStreamReader(): Promise<void> {
    this.setupListeners()
    await this.streamReader.start()
  }

  private setupListeners(): void {
    this.page.once('close', () => this.gracefulStop())

    this.streamReader.on('pageScreenFrame', (pageScreenFrame) =>
      this.streamWriter.gracefulInsert(pageScreenFrame)
    )

    this.streamWriter.once('videoStreamWriterError', async (error) => {
      this.recorderErrors.push(error as Error)
      console.error('Error from vide stream writer', error)
      await this.gracefulStop()
    })
  }

  async gracefulStop() {
    try {
      await this.stop()
    } catch (error) {
      this.recorderErrors.push(error as Error)
      console.error('Error while stopping the video recording', error)
    }
  }

  /**
   * @description stop the video capturing session
   * @throws {Error} if the video could not be captured
   */
  async stop(): Promise<void> {
    if (!this.stopRecordingPromise) this.stopRecordingPromise = this.stopInternal()
    await this.stopRecordingPromise
  }

  private async stopInternal(): Promise<void> {
    await this.streamWriter.stop()
    await this.streamReader.stop()
  }
}
