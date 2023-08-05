import { OutputFormat } from './OutputFormat'

export interface PageVideoStreamWriterOptions {
  readonly fps: number
  readonly outputFormatProvided: boolean
  readonly outputFormat: OutputFormat
  readonly ffmpegPath: string | undefined
  readonly videoFrame: { width: number; height: number } | undefined
  readonly aspectRatio: '3:2' | '4:3' | '16:9' | undefined
  readonly videoCodec: string
  readonly minVideoBitrate: number
  readonly maxVideoBitrate: number
  readonly videoCrf: number
  readonly videoPreset: string
  readonly videoPixelFormat: string
  readonly autoPad: 'on' | 'off' | { color: string }
  readonly autoStopAfterSeconds: number | undefined
}
