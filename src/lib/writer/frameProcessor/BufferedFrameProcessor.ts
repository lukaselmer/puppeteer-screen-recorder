import { Logger } from '../../logger'
import { PageScreenFrame } from '../../PageScreenFrame'
import { BufferedFrameProcessorOptions } from './BufferedFrameProcessorOptions'
import { SortedQueue } from './SortedQueue'
import { frameIsOutOfOrderErrorMessage, UnbufferedFrameProcessor } from './UnbufferedFrameProcessor'

export class BufferedFrameProcessor {
  private readonly buffer: SortedQueue<PageScreenFrame> = new SortedQueue((frame) => frame.timestamp)
  private readonly unbufferedFrameProcessor: UnbufferedFrameProcessor

  constructor(
    private readonly logger: Logger,
    private options: BufferedFrameProcessorOptions,
    outputStream: NodeJS.WritableStream
  ) {
    this.unbufferedFrameProcessor = new UnbufferedFrameProcessor(options, outputStream)
  }

  processFrame(frame: PageScreenFrame): void {
    this.buffer.enqueue(frame)

    const upToLength = Math.max(0, this.options.inputFramesToBuffer)
    this.processBufferedFrames(upToLength)
  }

  drainFrames(): void {
    this.processBufferedFrames(0)
  }

  private processBufferedFrames(upToLength: number) {
    while (this.buffer.length > upToLength) {
      const frameToProcess = this.buffer.removeMinimum()
      if (!frameToProcess) throw new Error('Invalid state: buffer is empty')

      this.gracefulProcessBufferedFrame(frameToProcess)
    }
  }

  gracefulProcessBufferedFrame(frameToProcess: PageScreenFrame) {
    try {
      this.unbufferedFrameProcessor.processFrame(frameToProcess)
    } catch (error) {
      if (error instanceof Error && error.message === frameIsOutOfOrderErrorMessage)
        this.logger.warn('Frame is out of order, skipping frame')
      else throw error
    }
  }
}
