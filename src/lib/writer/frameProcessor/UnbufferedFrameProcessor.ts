import { PageScreenFrame } from '../../PageScreenFrame'
import { UnbufferedFrameProcessorOptions } from './UnbufferedFrameProcessorOptions'

export class UnbufferedFrameProcessor {
  private previousFrame: PageScreenFrame | undefined
  private lastWriteTime: number | undefined
  private frameDuration: number

  constructor(
    private readonly options: UnbufferedFrameProcessorOptions,
    private readonly outputStream: NodeJS.WritableStream
  ) {
    this.frameDuration = 1 / this.options.fps
  }

  processFrame(frame: PageScreenFrame): void {
    if (this.previousFrame && this.previousFrame.timestamp > frame.timestamp)
      throw new Error(frameIsOutOfOrderErrorMessage)

    if (this.previousFrame && this.previousFrame.timestamp === frame.timestamp) return

    this.previousFrame = frame

    this.handleWrite(frame)
  }

  private handleWrite(currentFrame: PageScreenFrame) {
    if (!this.outputStream.writable) return

    if (!this.lastWriteTime) {
      this.lastWriteTime = currentFrame.timestamp
      this.outputStream.write(currentFrame.blob)
      return
    }

    while (true) {
      const nextWriteTime = this.lastWriteTime + this.frameDuration
      if (currentFrame.timestamp < nextWriteTime) return

      if (!this.outputStream.writable) return

      this.outputStream.write(currentFrame.blob)
      this.lastWriteTime += this.frameDuration
    }
  }
}

export const frameIsOutOfOrderErrorMessage = 'Frame is out of order'
