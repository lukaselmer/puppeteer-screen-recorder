import { describe, expect, it } from 'vitest'
import {
  createUnbufferedFrameProcessor,
  inconsistentFpsInputBetween1sAnd10s,
  processFrames,
  threeFrameAt1s2s3s,
  threeFrameAt1s3s2s,
  twentyFpsInputBetween1sAnd3s,
} from './writerTestUtils'

describe('UnbufferedFrameProcessor', () => {
  describe('frames at 1s, 2s, 3s', () => {
    it('writes single frames at 1fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 1 })
      processFrames(processor, threeFrameAt1s2s3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,3,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('3')
    })

    it('fills the missing frames with the next frames at 2fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 2 })
      processFrames(processor, threeFrameAt1s2s3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,2,3,3,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('2')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('2')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('5')
    })

    it('fills the missing frames with the next frames at 10fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 10 })
      processFrames(processor, threeFrameAt1s2s3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,"')
      // it would be better if the frames were evenly distributed, but this is good enough for now
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('9')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('10')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('20')
    })

    it('writes 100x frames in order at 100fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 100 })
      processFrames(processor, threeFrameAt1s2s3s())
      expect(stream.read()).toMatchInlineSnapshot(
        '"1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,"'
      )
      // it would be better if the frames were evenly distributed, but this is good enough for now
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('99')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('101')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('201')
    })

    it('skips frame 2 at 0.5fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 0.5 })
      processFrames(processor, threeFrameAt1s2s3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,3,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('2')
    })

    it('skips frame 2 and 3 at 0.1fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 0.1 })
      processFrames(processor, threeFrameAt1s2s3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('0')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('1')
    })
  })

  describe('20 fps input between at 1s and 3.999s', () => {
    it('writes single frames at 1fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 1 })
      processFrames(processor, twentyFpsInputBetween1sAnd3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,3,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('3')
    })

    it('skips some frames at 2fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 2 })
      processFrames(processor, twentyFpsInputBetween1sAnd3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,1.5,2,2.5,3,3.5,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('6')
    })

    it('skips less frames at 10fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 10 })
      processFrames(processor, twentyFpsInputBetween1sAnd3s())
      expect(stream.read()).toMatchInlineSnapshot(
        '"1,1.1,1.25,1.35,1.45,1.55,1.65,1.75,1.85,1.95,2.05,2.15,2.25,2.35,2.45,2.55,2.65,2.75,2.85,2.95,3.05,3.15,3.25,3.35,3.45,3.55,3.65,3.75,3.85,3.95,"'
      )
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('0')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('30')
    })

    it('fills the missing frames with the next at 100fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 100 })
      processFrames(processor, twentyFpsInputBetween1sAnd3s())
      expect(stream.read()).toMatchInlineSnapshot(
        '"1,1.05,1.05,1.05,1.05,1.05,1.1,1.1,1.1,1.1,1.1,1.15,1.15,1.15,1.15,1.2,1.2,1.2,1.2,1.2,1.25,1.25,1.25,1.25,1.25,1.3,1.3,1.3,1.3,1.3,1.35,1.35,1.35,1.35,1.35,1.4,1.4,1.4,1.4,1.4,1.45,1.45,1.45,1.45,1.45,1.5,1.5,1.5,1.5,1.5,1.55,1.55,1.55,1.55,1.55,1.6,1.6,1.6,1.6,1.6,1.65,1.65,1.65,1.65,1.65,1.7,1.7,1.7,1.7,1.7,1.75,1.75,1.75,1.75,1.75,1.8,1.8,1.8,1.8,1.8,1.85,1.85,1.85,1.85,1.85,1.9,1.9,1.9,1.9,1.9,1.95,1.95,1.95,1.95,1.95,2,2,2,2,2,2.05,2.05,2.05,2.05,2.05,2.05,2.1,2.1,2.1,2.1,2.1,2.15,2.15,2.15,2.15,2.15,2.2,2.2,2.2,2.2,2.2,2.25,2.25,2.25,2.25,2.25,2.3,2.3,2.3,2.3,2.3,2.35,2.35,2.35,2.35,2.35,2.4,2.4,2.4,2.4,2.4,2.45,2.45,2.45,2.45,2.45,2.5,2.5,2.5,2.5,2.5,2.55,2.55,2.55,2.55,2.55,2.6,2.6,2.6,2.6,2.6,2.65,2.65,2.65,2.65,2.65,2.7,2.7,2.7,2.7,2.7,2.75,2.75,2.75,2.75,2.75,2.8,2.8,2.8,2.8,2.8,2.85,2.85,2.85,2.85,2.85,2.9,2.9,2.9,2.9,2.9,2.95,2.95,2.95,2.95,2.95,3,3,3,3,3,3.05,3.05,3.05,3.05,3.05,3.1,3.1,3.1,3.1,3.1,3.15,3.15,3.15,3.15,3.15,3.2,3.2,3.2,3.2,3.2,3.25,3.25,3.25,3.25,3.25,3.3,3.3,3.3,3.3,3.3,3.35,3.35,3.35,3.35,3.35,3.4,3.4,3.4,3.4,3.4,3.45,3.45,3.45,3.45,3.45,3.5,3.5,3.5,3.5,3.5,3.55,3.55,3.55,3.55,3.55,3.6,3.6,3.6,3.6,3.6,3.65,3.65,3.65,3.65,3.65,3.7,3.7,3.7,3.7,3.7,3.75,3.75,3.75,3.75,3.75,3.8,3.8,3.8,3.8,3.8,3.85,3.85,3.85,3.85,3.85,3.9,3.9,3.9,3.9,3.9,3.95,3.95,3.95,3.95,3.95,"'
      )
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('5')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('5')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('296')
    })

    it('skips frame 2 at 0.5fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 0.5 })
      processFrames(processor, twentyFpsInputBetween1sAnd3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,3,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('2')
    })

    it('skips frame 2 and 3 at 0.1fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 0.1 })
      processFrames(processor, twentyFpsInputBetween1sAnd3s())
      expect(stream.read()).toMatchInlineSnapshot('"1,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('0')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('1')
    })
  })

  describe('inconsistent fps input between at 1s and 10s', () => {
    it('writes single frames at 1fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 1 })
      processFrames(processor, inconsistentFpsInputBetween1sAnd10s())
      expect(stream.read()).toMatchInlineSnapshot('"1,2,3,4,5,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('5')
    })

    it('skips & fills in frames at 2fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 2 })
      processFrames(processor, inconsistentFpsInputBetween1sAnd10s())
      expect(stream.read()).toMatchInlineSnapshot('"1,1.5,2,2.66667,3,3.5,4,5,5,5.5,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('10')
    })

    it('skips & fills in frames at 10fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 10 })
      processFrames(processor, inconsistentFpsInputBetween1sAnd10s())
      expect(stream.read()).toMatchInlineSnapshot(
        '"1,1.1,1.25,1.35,1.45,1.55,1.65,1.75,1.85,1.95,2.33333,2.33333,2.33333,2.33333,2.66667,2.66667,2.66667,3,3,3,3.01,3.11,3.21,3.31,3.41,3.51,3.61,3.71,3.81,3.91,5,5,5,5,5,5,5,5,5,5,5,5.1,5.2,5.3,5.4,5.5,5.6,5.7,5.8,5.9,"'
      )
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('3')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('50')
    })

    it('skips & fills in frames at 100fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 100 })
      processFrames(processor, inconsistentFpsInputBetween1sAnd10s())
      expect(stream.read()).toMatchInlineSnapshot(
        '"1,1.05,1.05,1.05,1.05,1.05,1.1,1.1,1.1,1.1,1.1,1.15,1.15,1.15,1.15,1.2,1.2,1.2,1.2,1.2,1.25,1.25,1.25,1.25,1.25,1.3,1.3,1.3,1.3,1.3,1.35,1.35,1.35,1.35,1.35,1.4,1.4,1.4,1.4,1.4,1.45,1.45,1.45,1.45,1.45,1.5,1.5,1.5,1.5,1.5,1.55,1.55,1.55,1.55,1.55,1.6,1.6,1.6,1.6,1.6,1.65,1.65,1.65,1.65,1.65,1.7,1.7,1.7,1.7,1.7,1.75,1.75,1.75,1.75,1.75,1.8,1.8,1.8,1.8,1.8,1.85,1.85,1.85,1.85,1.85,1.9,1.9,1.9,1.9,1.9,1.95,1.95,1.95,1.95,1.95,2,2,2,2,2,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.33333,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,2.66667,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3.01,3.02,3.03,3.04,3.05,3.06,3.07,3.08,3.09,3.1,3.11,3.12,3.13,3.14,3.15,3.16,3.17,3.18,3.19,3.2,3.21,3.22,3.23,3.24,3.25,3.26,3.27,3.28,3.29,3.3,3.31,3.32,3.33,3.34,3.35,3.36,3.37,3.38,3.39,3.4,3.41,3.42,3.43,3.44,3.45,3.46,3.47,3.48,3.49,3.5,3.51,3.52,3.53,3.54,3.55,3.56,3.57,3.58,3.59,3.6,3.61,3.62,3.63,3.64,3.65,3.66,3.67,3.68,3.69,3.7,3.71,3.72,3.73,3.74,3.75,3.76,3.77,3.78,3.79,3.8,3.81,3.82,3.83,3.84,3.85,3.86,3.87,3.88,3.89,3.9,3.91,3.92,3.93,3.94,3.95,3.96,3.97,3.98,3.99,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5.01,5.02,5.03,5.04,5.05,5.06,5.07,5.08,5.09,5.1,5.11,5.12,5.13,5.14,5.15,5.16,5.17,5.18,5.19,5.2,5.21,5.22,5.23,5.24,5.25,5.26,5.27,5.28,5.29,5.3,5.31,5.32,5.33,5.34,5.35,5.36,5.37,5.38,5.39,5.4,5.41,5.42,5.43,5.44,5.45,5.46,5.47,5.48,5.49,5.5,5.51,5.52,5.53,5.54,5.55,5.56,5.57,5.58,5.59,5.6,5.61,5.62,5.63,5.64,5.65,5.66,5.67,5.68,5.69,5.7,5.71,5.72,5.73,5.74,5.75,5.76,5.77,5.78,5.79,5.8,5.81,5.82,5.83,5.84,5.85,5.86,5.87,5.88,5.89,5.9,5.91,5.92,5.93,5.94,5.95,5.96,5.97,5.98,5.99,"'
      )
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('5')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('34')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('500')
    })

    it('skips & fills in frames at 0.5fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 0.5 })
      processFrames(processor, inconsistentFpsInputBetween1sAnd10s())
      expect(stream.read()).toMatchInlineSnapshot('"1,3,5,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('1')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('3')
    })

    it('skips frames at 0.1fps', () => {
      const { processor, stream } = createUnbufferedFrameProcessor({ fps: 0.1 })
      processFrames(processor, inconsistentFpsInputBetween1sAnd10s())
      expect(stream.read()).toMatchInlineSnapshot('"1,"')
      expect(stream.frameCount('1')).toMatchInlineSnapshot('1')
      expect(stream.frameCount('2')).toMatchInlineSnapshot('0')
      expect(stream.frameCount('3')).toMatchInlineSnapshot('0')
      expect(stream.totalFrameCount()).toMatchInlineSnapshot('1')
    })
  })

  describe('invalid order', () => {
    it('throws an error when the frames are not in order', () => {
      const { processor } = createUnbufferedFrameProcessor({ fps: 1 })
      expect(() => {
        processFrames(processor, threeFrameAt1s3s2s())
      }).toThrowErrorMatchingInlineSnapshot('"Frame is out of order"')
    })
  })
})
