import { PassThrough } from 'stream'
import { Logger } from '../../logger'
import { PageScreenFrame } from '../../PageScreenFrame'
import { BufferedFrameProcessor } from './BufferedFrameProcessor'
import { BufferedFrameProcessorOptions } from './BufferedFrameProcessorOptions'
import { UnbufferedFrameProcessor } from './UnbufferedFrameProcessor'

export function threeFrameAt1s2s3s(): PageScreenFrame[] {
  return [frame(1), frame(2), frame(3)]
}

export function batchOf100x1s100x3s100x2s(): PageScreenFrame[] {
  return [...nFrames(1, 100), ...nFrames(3, 100), ...nFrames(2, 100)]
}

export function nFrames(timestamp: number, times: number): PageScreenFrame[] {
  return Array.from({ length: times }, () => frame(timestamp))
}

export function threeFrameAt1s3s2s(): PageScreenFrame[] {
  return [frame(1), frame(3), frame(2)]
}

export function twentyFpsInputBetween1sAnd3s(): PageScreenFrame[] {
  return generateFrames(1, 3.999, 20)
}

export function inconsistentFpsInputBetween1sAnd10s(): PageScreenFrame[] {
  return [
    ...generateFrames(1, 1.999, 20),
    ...generateFrames(2, 2.999, 3),
    ...generateFrames(3, 3.999, 100),
    ...generateFrames(4, 4.999, 1),
    ...generateFrames(5, 5.999, 100),
  ]
}

export function inputWithWrongOrderAt10FpsInputBetween1sAnd5s(): PageScreenFrame[] {
  return [
    ...generateFrames(1, 1.999, 20),
    ...generateFrames(3, 3.999, 20),
    ...generateFrames(2, 2.999, 10),
    ...generateFrames(5, 5.999, 15),
    ...generateFrames(4, 4.999, 1),
  ]
}

function generateFrames(fromSecond: number, upToSecond: number, fps: number): PageScreenFrame[] {
  let elapsedSeconds = fromSecond
  const maximumSeconds = upToSecond

  const frames: PageScreenFrame[] = []
  while (elapsedSeconds < maximumSeconds) {
    frames.push(frame(Math.round(elapsedSeconds * 100000) / 100000))
    elapsedSeconds += 1 / fps
  }

  return frames
}

export function processFrames(
  processor: BufferedFrameProcessor | UnbufferedFrameProcessor,
  frames: PageScreenFrame[]
) {
  frames.forEach((f) => processor.processFrame(f))
  if ('drainFrames' in processor) processor.drainFrames()
}

export function createBufferedFrameProcessor(options: Partial<BufferedFrameProcessorOptions>) {
  const stream = new PassThroughWithBuffer({ encoding: 'utf-8' })
  const logger = inMemoryLogger()
  const processor = new BufferedFrameProcessor(
    { inputFramesToBuffer: 100, fps: 1, logger, ...options },
    stream
  )
  return { processor, stream, logger }
}

export function createUnbufferedFrameProcessor({ fps }: { fps: number }) {
  const stream = new PassThroughWithBuffer({ encoding: 'utf-8' })
  const processor = new UnbufferedFrameProcessor({ fps }, stream)
  return { processor, stream }
}

function frame(timestamp: number, optionalText?: string): PageScreenFrame {
  const text = optionalText ?? timestamp.toString()
  return { blob: Buffer.from(`${text},`), timestamp }
}

class PassThroughWithBuffer extends PassThrough {
  buffer: any

  read(size?: number): string | Buffer {
    this.buffer = super.read(size)
    return this.buffer
  }

  frameCount(content: string) {
    if (typeof this.buffer !== 'string') throw new Error('Buffer is not a string')
    return this.buffer.split(',').filter((s) => s === content).length
  }

  totalFrameCount(): number {
    if (typeof this.buffer !== 'string') throw new Error('Buffer is not a string')
    return this.buffer.split(',').length - 1
  }
}

export function inMemoryLogger(): TestLogger {
  const logs: any[] = []
  return {
    log: (...args) => void logs.push(args),
    warn: (...args) => void logs.push(args),
    error: (...args) => void logs.push(args),
    logs,
  }
}

interface TestLogger extends Logger {
  logs: any[]
}
