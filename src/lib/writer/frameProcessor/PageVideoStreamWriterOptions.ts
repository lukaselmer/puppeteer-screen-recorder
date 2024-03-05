import { Logger } from '../../logger'
import { OutputFormat } from '../OutputFormat'

export interface PageVideoStreamWriterOptions {
  readonly fps: number
  readonly inputFramesToBuffer: number
  readonly outputFormatProvided: boolean
  readonly outputFormat: OutputFormat
  readonly ffmpegPath: string
  readonly videoFrame: { width: number; height: number } | undefined
  readonly aspectRatio: '3:2' | '4:3' | '16:9'
  readonly videoCodec?: string
  readonly minVideoBitrate: number
  readonly maxVideoBitrate: number
  readonly videoCrf: number
  readonly videoPreset: string
  readonly videoPixelFormat: string
  readonly autoPad: 'on' | 'off' | { color: string }
  readonly keyframeIntervalInSeconds: number | undefined
  readonly autoStopAfterSeconds: number | undefined
  readonly logger: Logger
  readonly ffmpegLogger: Logger
  readonly metadata: Record<string, string>
}
