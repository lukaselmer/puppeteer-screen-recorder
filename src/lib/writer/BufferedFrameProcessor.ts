import { PageScreenFrame } from '../PageScreenFrame'
import { SortedQueue } from './SortedQueue'
import { UnbufferedFrameProcessor } from './UnbufferedFrameProcessor'

export class BufferedFrameProcessor {
  private readonly buffer: SortedQueue<PageScreenFrame> = new SortedQueue((frame) => frame.timestamp)
  private readonly unbufferedFrameProcessor: UnbufferedFrameProcessor

  constructor(
    private options: BufferedFrameProcessorOptions,
    outputStream: NodeJS.WritableStream
  ) {
    this.unbufferedFrameProcessor = new UnbufferedFrameProcessor(options, outputStream)
  }

  processFrame(frame: PageScreenFrame): void {
    this.buffer.enqueue(frame)

    while (this.buffer.length > Math.max(0, this.options.inputFramesToBuffer)) {
      const frameToProcess = this.buffer.removeMinimum()
      if (!frameToProcess) throw new Error('Invalid state: buffer is empty')

      this.unbufferedFrameProcessor.processFrame(frameToProcess)
    }
  }

  drainFrames(): void {
    this.buffer
      .removeAllSortedByMinimumFirst()
      .forEach((frame) => this.unbufferedFrameProcessor.processFrame(frame))
  }
}

export interface BufferedFrameProcessorOptions {
  fps: number
  inputFramesToBuffer: number
}
