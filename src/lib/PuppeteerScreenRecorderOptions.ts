import { Logger } from './logger'
import { PageVideoStreamReaderOptions } from './reader/PageVideoStreamReaderOptions'
import { PageVideoStreamWriterOptions } from './writer/frameProcessor/PageVideoStreamWriterOptions'
import { OutputFormat } from './writer/OutputFormat'

export function toDefinedOptions(
  options: PuppeteerScreenRecorderOptions
): DefinedPuppeteerScreenRecorderOptions {
  const {
    followNewTab = true,
    fps = 15,
    inputFramesToBuffer = 100,
    inputQuality = 100,
    inputFormat = 'jpeg',
    outputFormat,
    ffmpegPath,
    videoFrame,
    aspectRatio = '4:3',
    videoCodec,
    minVideoBitrate = 1_000,
    maxVideoBitrate = 10_000,
    videoCrf = 23,
    videoPreset = 'ultrafast',
    videoPixelFormat = 'yuv420p',
    autoPad = 'off',
    autoStopAfterSeconds,
    logger = console,
    keyframeIntervalInSeconds,
  } = options

  if (fps < 0) throw new Error('fps must be at least 0')
  if (inputFramesToBuffer < 0) throw new Error('inputFramesToBuffer must be at least 0')
  if (inputQuality < 0 || inputQuality > 100) throw new Error('quality must be between 0 and 100')
  if (videoCrf < 0) throw new Error('videoCrf must be at least 0')
  if (minVideoBitrate < 0) throw new Error('minVideoBitrate must be at least 0')
  if (maxVideoBitrate < 0) throw new Error('maxVideoBitrate must be at least 0')
  if (minVideoBitrate > maxVideoBitrate) throw new Error('minVideoBitrate must be <= maxVideoBitrate')
  if (typeof autoStopAfterSeconds === 'number' && autoStopAfterSeconds < 1)
    throw new Error('autoStopAfterSeconds must be at least 1 second')

  const inputOptions: PageVideoStreamReaderOptions = {
    followNewTab,
    inputQuality,
    inputFormat,
    logger,
  }
  const outputOptions: PageVideoStreamWriterOptions = {
    fps,
    inputFramesToBuffer,
    outputFormat: outputFormat ?? 'mp4',
    outputFormatProvided: !!outputFormat,
    ffmpegPath,
    videoFrame,
    aspectRatio,
    videoCodec,
    minVideoBitrate,
    maxVideoBitrate,
    videoCrf,
    videoPreset,
    videoPixelFormat,
    autoPad: autoPad === 'off' ? 'off' : !autoPad.color ? 'on' : { color: autoPad.color },
    keyframeIntervalInSeconds,
    autoStopAfterSeconds,
    logger,
  }
  return { inputOptions, outputOptions, logger }
}

export interface PuppeteerScreenRecorderOptions {
  /**
   * @description Boolean value which is indicate whether to follow the tab or not. Default value is true.
   * @default true
   * */
  readonly followNewTab?: boolean

  /**
   * @description Numeric value which denotes no.of Frames per second in which the video should be recorded.
   * @default 15
   */
  readonly fps?: number

  /**
   * @description Numeric value which denotes no.of quality of individual frame captured by chrome. Value accepted 0 - 100.  100 denotes the highest quality and 0 denotes the lowest quality
   * @default 100
   */
  readonly inputQuality?: number

  /**
   * @description specify the image format for recording the video
   * @default jpeg
   */
  readonly inputFormat?: 'jpeg' | 'png'

  /**
   * @description specify the video format. Can be any of @SupportedFileFormat.
   * @default mp4
   */
  readonly outputFormat?: OutputFormat

  /**
   * @description String value pointing to the installation of FFMPEG. Default is to automatically install FFMPEG and use it.
   * @default undefined
   */
  readonly ffmpegPath?: string

  /**
   * @description An object which specifies the width and height of the output video frame.
   * Note: VideoFrame option is not applicable for capturing the video.
   */
  readonly videoFrame?: {
    width: number
    height: number
  }

  /**
   * @description Specify the aspect ratio of the video. Default value is 4:3.
   * @default 4:3
   */
  readonly aspectRatio?: '3:2' | '4:3' | '16:9'

  /**
   * @description Specify the codec used by FFMPEG when creating the final video file. E.g.: libx264, libx265, mpeg4, divx, libvpx, libvpx-vp9. Run `ffmpeg -codecs` to see a list of codecs, or see https://ffmpeg.org/ffmpeg-codecs.html for more information
   * @default libvpx-vp9 for webm, libx264 for everything else
   */
  readonly videoCodec?: string

  /**
   * @description Specify the minimum target bitrate of the final video file in bits/s
   * @default 1_000
   */
  readonly minVideoBitrate?: number

  /**
   * @description Specify the maximum target bitrate of the final video file in bits/s
   * @default 10_000
   */
  readonly maxVideoBitrate?: number

  /**
   * @description Specify the crf of the final video file
   * @default 23
   */
  readonly videoCrf?: number

  /**
   * @description Specify the preset to use when encoding the video file
   * @default ultrafast
   */
  readonly videoPreset?: string

  /**
   * @description Specify the pixel format to use when encoding the video file. Run `ffmpeg -pix_fmts` to list supported pixel formats.
   * @default yuv420p
   */
  readonly videoPixelFormat?: string

  /**
   * @description Specify whether autoPad option is used and its color. Default to autoPad deactivation mode.
   */
  readonly autoPad?: {
    color?: string
  }

  /**
   * @description Enforces a keyframe every n seconds. Small values make video more seekable at the cost of compression. `undefined` / 0 means using the default value of the codec.
   * @default undefined
   */
  readonly keyframeIntervalInSeconds?: number

  /**
   * @description Specify seconds after which the recording is stopped automatically. If set, it must be at least 1 second. By default video keeps recording until `stop()` is called.
   * @default undefined
   */
  readonly autoStopAfterSeconds?: number

  /**
   * @description Specify number of frames to buffer. Useful if the screencast frames are received out of order: https://chromedevtools.github.io/devtools-protocol/tot/Page/#event-screencastFrame
   * @default 100
   */
  readonly inputFramesToBuffer?: number

  /**
   * @description Specify the logger to use.
   * @default console
   */
  readonly logger?: Logger
}

export interface DefinedPuppeteerScreenRecorderOptions {
  readonly logger: Logger
  readonly inputOptions: PageVideoStreamReaderOptions
  readonly outputOptions: PageVideoStreamWriterOptions
}
