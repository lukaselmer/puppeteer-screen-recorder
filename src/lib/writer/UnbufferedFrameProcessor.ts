import { PageScreenFrame } from '../PageScreenFrame'

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
      throw new Error('Frame is out of order')

    if (this.previousFrame && this.previousFrame.timestamp === frame.timestamp) return

    this.handleWrite(frame)
  }

  private handleWrite(currentFrame: PageScreenFrame) {
    if (!this.outputStream.writable) return

    if (!this.lastWriteTime) {
      this.lastWriteTime = currentFrame.timestamp
      this.outputStream.write(currentFrame.blob)
      return
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const nextWriteTime = this.lastWriteTime + this.frameDuration
      if (currentFrame.timestamp < nextWriteTime) return

      if (!this.outputStream.writable) return

      this.outputStream.write(currentFrame.blob)
      this.lastWriteTime += this.frameDuration
    }
  }
}

export interface UnbufferedFrameProcessorOptions {
  fps: number
}
