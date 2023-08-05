import { EventEmitter } from 'events'
import os from 'os'
import { PassThrough, Writable } from 'stream'
import ffmpeg, { Codec, Codecs, FfmpegCommand, setFfmpegPath } from 'fluent-ffmpeg'
import {
  PageScreenFrame,
  PuppeteerScreenRecorderOptions,
  VideoWriteStatus,
} from './pageVideoStreamTypes'
import { fileFormatFor, SupportedVideoFileFormat } from './supportedFileFormats'

export class PageVideoStreamWriter extends EventEmitter {
  private readonly screenLimit = 10
  private screenCastFrames: PageScreenFrame[] = []
  duration = '00:00:00:00'

  private status: VideoWriteStatus = 'notStarted'
  private options: PuppeteerScreenRecorderOptions

  private videoMediatorStream: PassThrough = new PassThrough()
  private writerPromise: Promise<void> | undefined

  constructor(
    private destination: string | Writable,
    options: PuppeteerScreenRecorderOptions
  ) {
    super()
    this.options = options
  }

  async startStreamWriter(): Promise<void> {
    await this.configureFfmpegPath()

    if (typeof this.destination === 'string') await this.configureVideoFile(this.destination)
    else if (this.destination.writable) await this.configureVideoWritableStream(this.destination)
    else throw new Error('Output should be a path or a writable stream')
  }

  private async configureVideoFile(destinationPath: string) {
    const outputFormat = fileFormatFor(destinationPath) || this.outputFormat
    const outputStream = await this.getDestinationStream(
      outputFormat,
      this.videoFileCodec(destinationPath)
    )

    this.writerPromise = new Promise((resolve, reject) => {
      outputStream
        .on('error', (e: Error) => {
          this.handleWriteStreamError(e.message)
          reject(e)
        })
        .on('end', resolve)
        .save(destinationPath)

      if (outputFormat == 'webm') {
        outputStream
          .videoBitrate(this.options.videoBitrate || 1000, true)
          .outputOptions('-flags', '+global_header', '-psnr')
      }
    })
  }

  private async configureVideoWritableStream(writableStream: Writable) {
    const outputStream = await this.getDestinationStream(this.outputFormat, this.videoStreamCodec())

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

        outputStream.toFormat(this.outputFormat)
        if (this.outputFormat == 'webm') {
          outputStream
            .videoBitrate(this.options.videoBitrate || 1000, true)
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

  private async getDestinationStream(
    outputFormat: SupportedVideoFileFormat,
    videoCodec: string
  ): Promise<FfmpegCommand> {
    await checkVideoCodec(videoCodec)
    const threads = Math.max(1, os.cpus().length - 1)

    const outputStream = ffmpeg({
      source: this.videoMediatorStream,
      priority: 20,
    })
      .videoCodec(videoCodec)
      .size(this.videoFrameSize)
      .aspect(this.options.aspectRatio || '4:3')
      .autopad(this.autopad.activation, this.autopad?.color)
      .inputFormat('image2pipe')
      .inputFPS(this.fps)
      .outputOptions(`-crf ${this.options.videoCrf ?? 23}`)

    if (outputFormat !== 'webm') {
      outputStream
        .outputOptions(`-preset ${this.options.videoPreset || 'ultrafast'}`)
        .outputOptions(`-pix_fmt ${this.options.videoPixelFormat || 'yuv420p'}`)
        .outputOptions(`-minrate ${this.options.videoBitrate || 1000}`)
        .outputOptions(`-maxrate ${this.options.videoBitrate || 1000}`)
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
        .outputOptions('-g 20')
    }

    outputStream.outputOptions(`-threads ${threads}`).on('progress', (progressDetails) => {
      this.duration = progressDetails.timemark
    })

    if (this.options.recordDurationLimit) {
      outputStream.duration(this.options.recordDurationLimit)
    }

    return outputStream
  }

  private get outputFormat(): SupportedVideoFileFormat {
    return this.options.outputFormat || 'mp4'
  }

  private handleWriteStreamError(errorMessage: string): void {
    this.emit('videoStreamWriterError', errorMessage)

    if (
      this.status !== 'inProgress' &&
      this.status !== 'stopping' &&
      errorMessage.includes('pipe:0: End of file')
    )
      return

    return console.error(`Error unable to capture video stream: ${errorMessage}`)
  }

  private findSlot(timestamp: number): number {
    if (this.screenCastFrames.length === 0) return 0

    let i: number
    let frame: PageScreenFrame

    for (i = this.screenCastFrames.length - 1; i >= 0; i--) {
      frame = this.screenCastFrames[i]

      if (timestamp > frame.timestamp) break
    }

    return i + 1
  }

  insert(frame: PageScreenFrame): void {
    if (this.status === 'stopping' || this.status === 'completed') return

    // reduce the queue into half when it is full
    if (this.screenCastFrames.length === this.screenLimit) {
      const numberOfFramesToSplice = Math.floor(this.screenLimit / 2)
      const framesToProcess = this.screenCastFrames.splice(0, numberOfFramesToSplice)
      this.processFrameBeforeWrite(framesToProcess, this.screenCastFrames[0].timestamp)
    }

    const insertionIndex = this.findSlot(frame.timestamp)

    if (insertionIndex === this.screenCastFrames.length) {
      this.screenCastFrames.push(frame)
    } else {
      this.screenCastFrames.splice(insertionIndex, 0, frame)
    }
  }

  async stop(stoppedTime = Date.now() / 1000): Promise<void> {
    if (!this.writerPromise)
      throw new Error('Writer promise not initialized: did startStreamWriter() throw?')

    if (this.status === 'completed' || this.status === 'stopping') return this.writerPromise

    this.status = 'stopping'
    this.drainFrames(stoppedTime)

    this.videoMediatorStream.end()
    this.status = 'completed'

    await this.writerPromise
  }

  private drainFrames(stoppedTime: number): void {
    this.processFrameBeforeWrite(this.screenCastFrames, stoppedTime)
    this.screenCastFrames = []
  }

  private processFrameBeforeWrite(frames: PageScreenFrame[], chunkEndTime: number): void {
    const processedFrames = this.trimFrame(frames, chunkEndTime)

    processedFrames.forEach(({ blob, duration }) => this.write(blob, duration))
  }

  private trimFrame(fameList: PageScreenFrame[], chunkEndTime: number): PageScreenFrame[] {
    return fameList.map((currentFrame: PageScreenFrame, index: number) => {
      const endTime = index !== fameList.length - 1 ? fameList[index + 1].timestamp : chunkEndTime
      const duration = endTime - currentFrame.timestamp

      return { ...currentFrame, duration }
    })
  }

  private write(data: Buffer, durationSeconds = 1): void {
    if (this.status === 'notStarted') this.status = 'inProgress'

    const numberOfFps = Math.max(Math.floor(durationSeconds * this.fps), 1)

    for (let i = 0; i < numberOfFps; i++) {
      if (this.videoMediatorStream.writable) this.videoMediatorStream.write(data)
    }
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
      return null
    }
  }

  private get fps(): number {
    return this.options.fps ?? 25
  }

  private videoFileCodec(filePath: string): string {
    return this.options.videoCodec
      ? this.options.videoCodec
      : fileFormatFor(filePath) === 'webm'
      ? 'libvpx-vp9'
      : 'libx265'
  }

  private videoStreamCodec(): string {
    return this.options.videoCodec
      ? this.options.videoCodec
      : this.options.outputFormat === 'webm'
      ? 'libvpx-vp9'
      : 'libx265'
  }

  private get videoFrameSize(): string {
    const { width, height } = this.options.videoFrame || {}
    return typeof width === 'number' && typeof height === 'number' ? `${width}x${height}` : '100%'
  }

  private get autopad(): { activation: boolean; color?: string } {
    const autopad = this.options.autopad

    return !autopad ? { activation: false } : { activation: true, color: autopad.color }
  }
}

async function checkVideoCodec(codec: string) {
  const availableCodecsMap = await getAvailableCodecs()
  const found = availableCodecsMap[codec]

  if (!found || !found.canEncode) {
    const list = listAvailableEncodingCodecs(availableCodecsMap)
    throw new Error(`Video codec ${codec} is not available for encoding. Available codecs:\n${list}`)
  }
}

function getAvailableCodecs() {
  return new Promise<Codecs>((resolve, reject) =>
    ffmpeg().getAvailableCodecs((err, codecs) => {
      if (err) reject(err)
      else resolve(codecs)
    })
  )
}

function listAvailableEncodingCodecs(availableCodecsMap: Record<string, Codec>) {
  return Object.entries(availableCodecsMap)
    .filter(([, { canEncode }]) => canEncode)
    .map(([codec, { description }]) => `- ${codec}: ${description}`)
    .join('\n')
}
