import os from 'os'
import { PassThrough, Writable } from 'stream'
import ffmpeg, { FfmpegCommand, setFfmpegPath } from 'fluent-ffmpeg'
import { TypedEmitter } from 'tiny-typed-emitter'
import { PageScreenFrame } from '../PageScreenFrame'
import { validateVideoCodec } from '../videoCodecs'
import { BufferedFrameProcessor } from './frameProcessor/BufferedFrameProcessor'
import { PageVideoStreamWriterOptions } from './frameProcessor/PageVideoStreamWriterOptions'
import { OutputFormat, outputFormatFor } from './OutputFormat'
import { VideoWriteStatus } from './VideoWriteStatus'

export class PageVideoStreamWriter extends TypedEmitter<PageVideoStreamWriterEvents> {
  duration = '00:00:00:00'

  private status: VideoWriteStatus = 'notStarted'

  private readonly videoMediatorStream = new PassThrough()
  // private readonly temporaryDestination = new PassThrough()
  private readonly frameProcessor: BufferedFrameProcessor

  private writerPromise: Promise<void> | undefined

  constructor(
    private readonly destination: string | Writable,
    private readonly options: PageVideoStreamWriterOptions
  ) {
    super()
    this.frameProcessor = new BufferedFrameProcessor(options, this.videoMediatorStream)
  }

  async startStreamWriter(): Promise<void> {
    await this.configureFfmpegPath()

    if (typeof this.destination === 'string') await this.configureDestinationFile(this.destination)
    else if (this.destination.writable) {
      // this.configureFinalDestination(this.destination)
      // await this.configureDestinationStream(this.temporaryDestination)
      await this.configureDestinationStream(this.destination)
    } else throw new Error('Output should be a path or a writable stream')
  }

  // private configureFinalDestination(destination: Writable) {
  //   ffmpeg({ source: this.temporaryDestination, priority: 20 })
  //     .writeToStream(destination)
  // }

  private async configureDestinationFile(destinationPath: string) {
    const outputFormat = this.outputFormatFor(destinationPath)
    const outputStream = await this.configureDestination(
      outputFormat,
      this.videoFileCodec(destinationPath)
    )

    this.writerPromise = new Promise((resolve, reject) => {
      outputStream
        .on('error', (error: Error) => {
          this.handleWriteFileError(error)
          reject(error)
        })
        .on('end', resolve)
        .save(destinationPath)

      if (outputFormat == 'webm') {
        outputStream
          .videoBitrate(this.options.maxVideoBitrate || 1000, true)
          .outputOptions('-flags', '+global_header', '-psnr')
      }
    })
  }

  private videoFileCodec(filePath: string): string {
    return this.options.videoCodec
      ? this.options.videoCodec
      : outputFormatFor(filePath) === 'webm'
      ? 'libvpx-vp9'
      : 'libx264'
  }

  private videoStreamCodec(): string {
    return this.options.videoCodec
      ? this.options.videoCodec
      : this.options.outputFormat === 'webm'
      ? 'libvpx-vp9'
      : 'libx264'
  }

  private handleWriteFileError(error: Error): void {
    this.emit('videoStreamWriterError', error)

    if (
      this.status !== 'inProgress' &&
      this.status !== 'stopping' &&
      error.message.includes('pipe:0: End of file')
    )
      return

    return this.logger.error(`Error unable to capture video stream`, error)
  }

  private async configureDestinationStream(writableStream: Writable) {
    const outputStream = await this.configureDestination(
      this.options.outputFormat,
      this.videoStreamCodec()
    )

    this.writerPromise = new Promise<void>((resolve, reject) => {
      try {
        outputStream
          .on('error', (e) => {
            writableStream.emit('error', e)
            reject(e)
          })
          .on('end', () => {
            writableStream.end()
            resolve()
          })

        outputStream.toFormat(this.options.outputFormat)
        if (this.options.outputFormat == 'webm') {
          outputStream
            .videoBitrate(this.options.maxVideoBitrate || 1000, true)
            .addOutputOptions('-flags', '+global_header', '-psnr')
        }
        outputStream.addOutputOptions(
          '-movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov'
        )

        outputStream.pipe(writableStream)
      } catch (error) {
        reject(error)
      }
    })
  }

  private async configureDestination(
    outputFormat: OutputFormat,
    videoCodec: string
  ): Promise<FfmpegCommand> {
    await validateVideoCodec(videoCodec)
    const threads = Math.max(1, os.cpus().length - 1)

    const outputStream = ffmpeg({
      source: this.videoMediatorStream,
      priority: 20,
    })
      .videoCodec(videoCodec)
      .size(this.videoFrameSize)
      .aspect(this.options.aspectRatio)
      .autoPad(this.autoPad.activation, this.autoPad?.color)
      .inputFormat('image2pipe')
      .inputFPS(this.fps)
      .outputOptions(`-crf ${this.options.videoCrf ?? 23}`)

    Object.entries(this.options.metadata).forEach(([key, value]) => {
      outputStream.outputOptions('-metadata', `${key}=${value}`)
    })

    if (this.options.keyframeIntervalInSeconds)
      outputStream.outputOptions(`-g ${this.options.keyframeIntervalInSeconds * this.options.fps}`)

    if (outputFormat !== 'webm') {
      outputStream
        .outputOptions(`-preset ${this.options.videoPreset}`)
        .outputOptions(`-pix_fmt ${this.options.videoPixelFormat}`)
        .outputOptions(`-minrate ${this.options.minVideoBitrate}`)
        .outputOptions(`-maxrate ${this.options.maxVideoBitrate}`)
        .outputOptions('-framerate 1')
    }

    if (outputFormat === 'webm') {
      outputStream
        .outputOptions('-quality realtime')
        .outputOptions('-speed 8')
        .outputOptions('-qmin 4')
        .outputOptions('-qmax 48')
        .outputOptions('-tile-columns 4')
        .outputOptions('-frame-parallel 1')
        .outputOptions('-row-mt 1')
    }

    outputStream.outputOptions(`-threads ${threads}`).on('progress', (progressDetails) => {
      this.duration = progressDetails.timemark
    })

    if (this.options.autoStopAfterSeconds) {
      outputStream.duration(this.options.autoStopAfterSeconds)
      outputStream.setDuration(this.options.autoStopAfterSeconds)
    }

    return outputStream
  }

  private outputFormatFor(filePath: string): OutputFormat {
    return this.options.outputFormatProvided
      ? this.options.outputFormat
      : outputFormatFor(filePath) || this.options.outputFormat
  }

  gracefulInsert(frame: PageScreenFrame): void {
    try {
      this.insert(frame)
    } catch (error) {
      this.emit('videoStreamWriterError', error as Error)
    }
  }

  private insert(frame: PageScreenFrame): void {
    if (this.status === 'stopping' || this.status === 'completed') return
    this.frameProcessor.processFrame(frame)
  }

  async stop(): Promise<void> {
    if (!this.writerPromise)
      throw new Error('Writer promise not initialized: did startStreamWriter() throw?')

    if (this.status === 'completed' || this.status === 'stopping') return this.writerPromise

    this.status = 'stopping'
    this.frameProcessor.drainFrames()

    // this.temporaryDestination.end()
    this.videoMediatorStream.end()
    this.status = 'completed'

    await this.writerPromise
  }

  private async configureFfmpegPath(): Promise<void> {
    const ffmpegPath = await this.getFfmpegPath()

    if (!ffmpegPath) {
      throw new Error('FFmpeg path is missing, \n Set the FFMPEG_PATH env variable')
    }

    setFfmpegPath(ffmpegPath)
  }

  private async getFfmpegPath(): Promise<string | null> {
    if (this.options.ffmpegPath) return this.options.ffmpegPath

    try {
      // eslint-disable-next-line import/no-extraneous-dependencies
      const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg')
      if (ffmpegInstaller.path) return ffmpegInstaller.path

      return null
    } catch (e) {
      this.logger.error(e)
      return null
    }
  }

  private get fps(): number {
    return this.options.fps ?? 25
  }

  private get videoFrameSize(): string {
    const { width, height } = this.options.videoFrame || {}
    return typeof width === 'number' && typeof height === 'number' ? `${width}x${height}` : '100%'
  }

  private get autoPad(): { activation: boolean; color?: string } {
    const autoPad = this.options.autoPad

    return autoPad === 'off'
      ? { activation: false }
      : autoPad === 'on'
      ? { activation: true }
      : { activation: true, color: autoPad.color }
  }

  private get logger() {
    return this.options.logger
  }

  get stopped() {
    return this.status === 'completed'
  }
}

export interface PageVideoStreamWriterEvents {
  videoStreamWriterError: (error: Error) => void
}
