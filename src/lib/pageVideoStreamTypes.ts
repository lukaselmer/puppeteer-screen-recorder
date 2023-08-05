import { SupportedVideoFileFormat } from './supportedFileFormats'

export type VideoWriteStatus = 'notStarted' | 'inProgress' | 'stopping' | 'completed'

export interface PageScreenFrame {
  readonly blob: Buffer
  readonly timestamp: number
  readonly duration?: number
}

export interface PuppeteerScreenRecorderOptions {
  /**
   * @name followNewTab
   * @member PuppeteerScreenRecorderOptions
   * @description Boolean value which is indicate whether to follow the tab or not. Default value is true.
   * @default true
   * */
  readonly followNewTab?: boolean

  /**
   * @name fps
   * @member PuppeteerScreenRecorderOptions
   * @description Numeric value which denotes no.of Frames per second in which the video should be recorded. default value is 25.
   * @default 25
   */
  readonly fps?: number

  /**
   * @name quality
   * @member PuppeteerScreenRecorderOptions
   * @description Numeric value which denotes no.of quality of individual frame captured by chrome. Value accepted 0 - 100.  100 denotes the highest quality and 0 denotes the lowest quality
   * @default 100
   */
  readonly quality?: number

  /**
   * @name format
   * @member PuppeteerScreenRecorderOptions
   * @description specify the image format for recording the video
   * @default jpeg
   */
  readonly format?: 'jpeg' | 'png'

  /**
   * @name outputFormat
   * @member PuppeteerScreenRecorderOptions
   * @description specify the video format if not defined by file path. Can be any of @SupportedFileFormat
   * @default mp4
   */
  readonly outputFormat?: SupportedVideoFileFormat | null

  /**
   * @name ffmpegPath
   * @member PuppeteerScreenRecorderOptions
   * @description String value pointing to the installation of FFMPEG. Default is null (Automatically install the FFMPEG and use it).
   * @default null
   */
  readonly ffmpegPath?: string | null

  /**
   * @name videoFrame
   * @member PuppeteerScreenRecorderOptions
   * @description An object which specifies the width and height of the output video frame.
   * Note: VideoFrame option is not applicable for capturing the video.
   */
  readonly videoFrame?: {
    width: number | null
    height: number | null
  }

  /**
   * @name aspectRatio
   * @member PuppeteerScreenRecorderOptions
   * @description Specify the aspect ratio of the video. Default value is 4:3.
   * @default 4:3
   */
  readonly aspectRatio?: '3:2' | '4:3' | '16:9'

  /**
   * @name videoCodec
   * @member PuppeteerScreenRecorderOptions
   * @description Specify the codec used by FFMPEG when creating the final video file. E.g.: libx264, libx265, mpeg4, divx, libvpx, libvpx-vp9. Run `ffmpeg -codecs` to see a list of codecs, or see https://ffmpeg.org/ffmpeg-codecs.html for more information
   * @default libx265
   */
  readonly videoCodec?: string

  /**
   * @name videoBitrate
   * @member PuppeteerScreenRecorderOptions
   * @description Specify the target bitrate of the final video file in bits/s
   * @default 1000
   */
  readonly videoBitrate?: number

  /**
   * @name videoCrf
   * @member PuppeteerScreenRecorderOptions
   * @description Specify the crf of the final video file
   * @default 23
   */
  readonly videoCrf?: number

  /**
   * @name videoPreset
   * @member PuppeteerScreenRecorderOptions
   * @description Specify the preset to use when encoding the video file
   * @default ultrafast
   */
  readonly videoPreset?: string

  /**
   * @name videoPixelFormat
   * @member PuppeteerScreenRecorderOptions
   * @description Specify the pixel format to use when encoding the video file. Run `ffmpeg -pix_fmts` to list supported pixel formats.
   * @default yuv420p
   */
  readonly videoPixelFormat?: string

  /**
   * @name autopad
   * @member PuppeteerScreenRecorderOptions
   * @description Specify whether autopad option is used and its color. Default to autopad deactivation mode.
   */
  readonly autopad?: {
    color?: string
  }

  /**
   * @name recordDurationLimit
   * @member PuppeteerScreenRecorderOptions
   * @description  Numerical value specify duration (in seconds) to record the video. By default video is recorded till stop method is invoked`. (Note: It's mandatory to invoke Stop() method even if this value is set)
   */
  readonly recordDurationLimit?: number
}
