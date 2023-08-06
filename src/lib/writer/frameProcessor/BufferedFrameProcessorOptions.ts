import { Logger } from '../../logger'

export interface BufferedFrameProcessorOptions {
  readonly fps: number
  readonly inputFramesToBuffer: number
  logger: Logger
}
