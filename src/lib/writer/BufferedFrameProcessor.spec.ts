import { describe, expect, it } from 'vitest'
import {
  createBufferedFrameProcessor,
  inconsistentFpsInputBetween1sAnd10s,
  processFrames,
  threeFrameAt1s2s3s,
  twentyFpsInputBetween1sAnd3s,
} from './writerTestUtils'

describe('BufferedFrameProcessor', () => {
  describe('frames at 1s, 2s, 3s', () => {
    it('writes single frames at 1fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 1 })
      processFrames(processor, threeFrameAt1s2s3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,3,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('3')
    })
  })

  describe('20 fps input between at 1s and 3.999s', () => {
    it('writes single frames at 1fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 1 })
      processFrames(processor, twentyFpsInputBetween1sAnd3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,3,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('3')
    })
  })

  describe('inconsistent fps input between at 1s and 3.999s', () => {
    it('writes single frames at 1fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 1 })
      processFrames(processor, inconsistentFpsInputBetween1sAnd10s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,3,4,5,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('5')
    })
  })
})
