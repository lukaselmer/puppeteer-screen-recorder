import { PageScreenFrame } from '../PageScreenFrame'
import { UnbufferedFrameProcessor } from './UnbufferedFrameProcessor'

export class BufferedFrameProcessor {
  private unbufferedFrameProcessor: UnbufferedFrameProcessor

  constructor(options: BufferedFrameProcessorOptions, outputStream: NodeJS.WritableStream) {
    this.unbufferedFrameProcessor = new UnbufferedFrameProcessor(options, outputStream)
  }

  processFrame(frame: PageScreenFrame): void {
    this.unbufferedFrameProcessor.processFrame(frame)
  }
}

export interface BufferedFrameProcessorOptions {
  fps: number
}
