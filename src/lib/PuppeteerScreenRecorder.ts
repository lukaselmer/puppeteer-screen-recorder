import { createReadStream } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Writable } from 'node:stream'
import ffmpeg from 'fluent-ffmpeg'
import { Page } from 'puppeteer'
import {
  DefinedPuppeteerScreenRecorderOptions,
  PuppeteerScreenRecorderOptions,
  toDefinedOptions,
} from './PuppeteerScreenRecorderOptions'
import { PageVideoStreamReader } from './reader/PageVideoStreamReader'
import { PageVideoStreamWriter } from './writer/PageVideoStreamWriter'

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
  private readonly options: DefinedPuppeteerScreenRecorderOptions
  private readonly streamReader: PageVideoStreamReader
  private streamWriter: PageVideoStreamWriter | undefined
  private stopRecordingPromise: Promise<void> | undefined
  readonly recorderErrors: Error[] = []
  private destination: { type: 'file'; path: string } | { type: 'stream'; stream: Writable } | undefined

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
   * @description Start the video capturing session in a stream
   * @example
   * ```
   *  const stream = new PassThrough();
   *  await recorder.startWritingToStream(stream);
   * ```
   */
  async startWritingToStream(stream: Writable): Promise<void> {
    this.destination = { type: 'stream', stream }

    if (this.options.twoPassEncoding) {
      await this.ensureDirectoryExist(dirname(this.options.twoPassEncoding[0]))
      await this.ensureDirectoryExist(dirname(this.options.twoPassEncoding[1]))
      await this.startWritingFirstPassToFile(this.options.twoPassEncoding[0])
    } else {
      await this.startWritingToStreamDirectly(stream)
    }
  }

  private async startWritingToStreamDirectly(stream: Writable) {
    if (this.stoppingOrStopped) throw new Error('Invalid state: recording has already been stopped')

    this.streamWriter = new PageVideoStreamWriter(stream, this.options.outputOptions)
    await this.streamWriter.startStreamWriter()
    this.setupAutoStop()
    await this.startStreamReader()
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
  async startWritingToFile(finalSavePath: string): Promise<void> {
    this.destination = { type: 'file', path: finalSavePath }

    await this.ensureDirectoryExist(dirname(finalSavePath))
    if (this.options.twoPassEncoding)
      await this.ensureDirectoryExist(dirname(this.options.twoPassEncoding[0]))

    const savePath = this.options.twoPassEncoding ? this.options.twoPassEncoding[0] : finalSavePath
    await this.startWritingFirstPassToFile(savePath)
  }

  private async startWritingFirstPassToFile(savePath: string) {
    if (this.stoppingOrStopped) throw new Error('Invalid state: recording has already been stopped')

    this.streamWriter = new PageVideoStreamWriter(savePath, this.options.outputOptions)
    await this.streamWriter.startStreamWriter()
    this.setupAutoStop()
    await this.startStreamReader()
  }

  private async ensureDirectoryExist(dirPath: string) {
    await mkdir(dirPath, { recursive: true })
  }

  private setupAutoStop() {
    if (!this.options.outputOptions.autoStopAfterSeconds) return

    setTimeout(() => this.gracefulStop(), this.options.outputOptions.autoStopAfterSeconds * 1000)
  }

  /**
   * @description start listening for video stream from the page.
   */
  private async startStreamReader(): Promise<void> {
    this.setupListeners()
    await this.streamReader.start()
  }

  private setupListeners(): void {
    if (!this.streamWriter) throw new Error('Invalid state: streamWriter is undefined')

    this.page.once('close', () => this.gracefulStop())

    this.streamReader.on(
      'pageScreenFrame',
      (pageScreenFrame) => this.streamWriter?.gracefulInsert(pageScreenFrame)
    )

    this.streamWriter.once('videoStreamWriterError', async (error) => {
      this.recorderErrors.push(error as Error)
      this.logger.error('Error from video stream writer', error)
      await this.gracefulStop()
    })
  }

  async gracefulStop() {
    try {
      await this.stop()
    } catch (error) {
      this.recorderErrors.push(error as Error)
      this.logger.error('Error while stopping the video recording', error)
    }
  }

  async sleepUntilAutoStopped() {
    if (!this.options.outputOptions.autoStopAfterSeconds)
      throw new Error('Set autoStopAfterSeconds to sleep until auto stop')
    await this.sleepUntilStopped()
  }

  async sleepUntilStopped() {
    while (!this.stoppingOrStopped) await sleep(100)
    await this.stop()
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
    await this.streamWriter?.stop()
    await this.streamReader.stop()
    await this.runSecondPassIfRequired()
  }

  private async runSecondPassIfRequired() {
    if (!this.options.twoPassEncoding) return

    if (!this.destination) throw new Error('Invalid state: destination is undefined')

    if (this.destination.type === 'file') {
      await encodeWithSecondPass({
        source: this.options.twoPassEncoding[0],
        output: this.destination.path,
      })
      await rm(this.options.twoPassEncoding[0])
    } else if (this.destination.type === 'stream') {
      await encodeWithSecondPass({
        source: this.options.twoPassEncoding[0],
        output: this.options.twoPassEncoding[1],
      })
      await this.streamTemporaryFileToStream(this.options.twoPassEncoding[1], this.destination.stream)
      await rm(this.options.twoPassEncoding[0])
      await rm(this.options.twoPassEncoding[1])
    }
  }

  private async streamTemporaryFileToStream(temporaryFilePath: string, stream: Writable) {
    const temporaryFile = createReadStream(temporaryFilePath)
    const temporaryFilePromise = new Promise((resolve, reject) =>
      temporaryFile.on('error', reject).on('end', resolve)
    )
    temporaryFile.pipe(stream, { end: true })
    await temporaryFilePromise
  }

  private get stoppingOrStopped() {
    return !!this.stopRecordingPromise
  }

  private get logger() {
    return this.options.logger
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function encodeWithSecondPass({ source, output }: { source: string; output: string }) {
  if (source === output) throw new Error('Invalid state: source and output cannot be the same')
  await new Promise((resolve, reject) => {
    ffmpeg({ source, priority: 20 }).on('error', reject).on('end', resolve).save(output)
  })
}
