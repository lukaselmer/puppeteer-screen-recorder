import { PageScreenFrame } from '../PageScreenFrame'
import { UnbufferedFrameProcessor } from './UnbufferedFrameProcessor'

export class BufferedFrameProcessor {
  private readonly buffer: PageScreenFrame[] = []
  private readonly unbufferedFrameProcessor: UnbufferedFrameProcessor

  constructor(
    private options: BufferedFrameProcessorOptions,
    outputStream: NodeJS.WritableStream
  ) {
    this.unbufferedFrameProcessor = new UnbufferedFrameProcessor(options, outputStream)
  }

  processFrame(frame: PageScreenFrame): void {
    this.buffer.push(frame)

    while (this.buffer.length > Math.max(0, this.options.inputFramesToBuffer)) {
      const frameToProcess = this.buffer.shift()
      if (!frameToProcess) throw new Error('Invalid state: buffer is empty')

      this.unbufferedFrameProcessor.processFrame(frameToProcess)
    }
  }

  drainFrames(): void {
    this.buffer.forEach((frame) => this.unbufferedFrameProcessor.processFrame(frame))
    clearArray(this.buffer)
  }
}

function clearArray(array: any[]): void {
  array.splice(0, array.length)
}

export interface BufferedFrameProcessorOptions {
  fps: number
  inputFramesToBuffer: number
}
