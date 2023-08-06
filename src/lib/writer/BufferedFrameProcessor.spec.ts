import { describe, expect, it } from 'vitest'
import {
  createBufferedFrameProcessor,
  inconsistentFpsInputBetween1sAnd10s,
  inputWithWrongOrderAt10FpsInputBetween1sAnd5s,
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

  describe('inconsistent fps input between at 1s and 10s', () => {
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

  describe('input with wrong order at 10fps between at 1s and 3.999s', () => {
    it('fixes the frame order at 100fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 1 })
      processFrames(processor, inputWithWrongOrderAt10FpsInputBetween1sAnd5s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,3,4,5,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('5')
    })

    it('skips & fills in frames at 2fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 2 })
      processFrames(processor, inputWithWrongOrderAt10FpsInputBetween1sAnd5s())
      expect(stream.read()).toMatchInlineSnapshot('"1,1.5,2,2.5,3,3.5,4,5,5,5.53333,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('10')
    })

    it('skips & fills in frames at 10fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 10 })
      processFrames(processor, inputWithWrongOrderAt10FpsInputBetween1sAnd5s())
      expect(stream.read()).toMatchInlineSnapshot(
        '"1,1.1,1.25,1.35,1.45,1.55,1.65,1.75,1.85,1.95,2.1,2.2,2.3,2.4,2.5,2.6,2.7,2.8,2.9,3,3.05,3.15,3.25,3.35,3.45,3.55,3.65,3.75,3.85,3.95,5,5,5,5,5,5,5,5,5,5,5,5.13333,5.2,5.33333,5.4,5.53333,5.6,5.73333,5.8,5.93333,"'
      )
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('50')
    })

    it('skips & fills in frames at 100fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 100 })
      processFrames(processor, inputWithWrongOrderAt10FpsInputBetween1sAnd5s())
      expect(stream.read()).toMatchInlineSnapshot(
        '"1,1.05,1.05,1.05,1.05,1.05,1.1,1.1,1.1,1.1,1.1,1.15,1.15,1.15,1.15,1.2,1.2,1.2,1.2,1.2,1.25,1.25,1.25,1.25,1.25,1.3,1.3,1.3,1.3,1.3,1.35,1.35,1.35,1.35,1.35,1.4,1.4,1.4,1.4,1.4,1.45,1.45,1.45,1.45,1.45,1.5,1.5,1.5,1.5,1.5,1.55,1.55,1.55,1.55,1.55,1.6,1.6,1.6,1.6,1.6,1.65,1.65,1.65,1.65,1.65,1.7,1.7,1.7,1.7,1.7,1.75,1.75,1.75,1.75,1.75,1.8,1.8,1.8,1.8,1.8,1.85,1.85,1.85,1.85,1.85,1.9,1.9,1.9,1.9,1.9,1.95,1.95,1.95,1.95,1.95,2,2,2,2,2,2.1,2.1,2.1,2.1,2.1,2.1,2.1,2.1,2.1,2.1,2.1,2.2,2.2,2.2,2.2,2.2,2.2,2.2,2.2,2.2,2.2,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.4,2.4,2.4,2.4,2.4,2.4,2.4,2.4,2.4,2.4,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.6,2.6,2.6,2.6,2.6,2.6,2.6,2.6,2.6,2.6,2.7,2.7,2.7,2.7,2.7,2.7,2.7,2.7,2.7,2.7,2.8,2.8,2.8,2.8,2.8,2.8,2.8,2.8,2.8,2.8,2.9,2.9,2.9,2.9,2.9,2.9,2.9,2.9,2.9,2.9,3,3,3,3,3,3,3,3,3,3,3.05,3.05,3.05,3.05,3.05,3.1,3.1,3.1,3.1,3.1,3.15,3.15,3.15,3.15,3.15,3.2,3.2,3.2,3.2,3.2,3.25,3.25,3.25,3.25,3.25,3.3,3.3,3.3,3.3,3.3,3.35,3.35,3.35,3.35,3.35,3.4,3.4,3.4,3.4,3.4,3.45,3.45,3.45,3.45,3.45,3.5,3.5,3.5,3.5,3.5,3.55,3.55,3.55,3.55,3.55,3.6,3.6,3.6,3.6,3.6,3.65,3.65,3.65,3.65,3.65,3.7,3.7,3.7,3.7,3.7,3.75,3.75,3.75,3.75,3.75,3.8,3.8,3.8,3.8,3.8,3.85,3.85,3.85,3.85,3.85,3.9,3.9,3.9,3.9,3.9,3.95,3.95,3.95,3.95,3.95,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5.06667,5.06667,5.06667,5.06667,5.06667,5.06667,5.13333,5.13333,5.13333,5.13333,5.13333,5.13333,5.13333,5.2,5.2,5.2,5.2,5.2,5.2,5.2,5.26667,5.26667,5.26667,5.26667,5.26667,5.26667,5.33333,5.33333,5.33333,5.33333,5.33333,5.33333,5.33333,5.4,5.4,5.4,5.4,5.4,5.4,5.4,5.46667,5.46667,5.46667,5.46667,5.46667,5.46667,5.53333,5.53333,5.53333,5.53333,5.53333,5.53333,5.53333,5.6,5.6,5.6,5.6,5.6,5.6,5.6,5.66667,5.66667,5.66667,5.66667,5.66667,5.66667,5.73333,5.73333,5.73333,5.73333,5.73333,5.73333,5.73333,5.8,5.8,5.8,5.8,5.8,5.8,5.8,5.86667,5.86667,5.86667,5.86667,5.86667,5.86667,5.93333,5.93333,5.93333,5.93333,5.93333,5.93333,5.93333,"'
      )
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('5')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('10')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('494')
    })

    it('skips & fills in frames at 0.5fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 0.5 })
      processFrames(processor, inputWithWrongOrderAt10FpsInputBetween1sAnd5s())
      expect(stream.read()).toMatchInlineSnapshot('"1,3,5,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('3')
    })

    it('skips frames at 0.1fps', () => {
      const { processor, stream } = createBufferedFrameProcessor({ fps: 0.1 })
      processFrames(processor, inputWithWrongOrderAt10FpsInputBetween1sAnd5s())
      expect(stream.read()).toMatchInlineSnapshot('"1,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('0')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('1')
    })
  })
})
