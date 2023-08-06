import fs from 'fs'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import puppeteer, { Page } from 'puppeteer'
import { describe, it } from 'vitest'
import { PuppeteerScreenRecorder, PuppeteerScreenRecorderOptions } from '..'

describe.concurrent(
  'LongPuppeteerScreenRecorder',
  () => {
    it(
      `throws with an invalid codec`,
      async ({ expect }) => {
        const outputVideoPath = outputPath('long-invalid-codec-streamed.invalid')
        await withBrowser(async (page) => {
          try {
            fs.mkdirSync(dirname(outputVideoPath), { recursive: true })
          } catch (e) {
            console.error(e)
          }

          const fileWriteStream = fs.createWriteStream(outputVideoPath)

          await expect(async () => {
            const options: PuppeteerScreenRecorderOptions = { videoCodec: 'invalid-codec' }
            const recorder = new PuppeteerScreenRecorder(page, options)
            await recorder.startWritingToStream(fileWriteStream)
          }).rejects.toThrow(
            'Video codec invalid-codec is not available for encoding. Available codecs:'
          )
        })
      },
      { retry: 0 }
    )

    {
      const outputVideoPath = outputPath('long-libx264.mp4')
      it(`Streams the video to ${outputVideoPath}`, async ({ expect }) => {
        await withBrowser(async (page) => {
          await mkdir(dirname(outputVideoPath), { recursive: true })

          const fileWriteStream = fs.createWriteStream(outputVideoPath)

          const options: PuppeteerScreenRecorderOptions = { ...commonOptions(), videoCodec: 'libx264' }

          await record(page, options, fileWriteStream)

          expect(fs.existsSync(outputVideoPath)).toBeTruthy()
          fileWriteStream.on('end', () => {
            expect(fileWriteStream.writableFinished).toBeTruthy()
          })
        })
      })
    }

    {
      const outputVideoPath = outputPath('long-libx265.mp4')
      it(`Streams the video to ${outputVideoPath}`, async ({ expect }) => {
        await withBrowser(async (page) => {
          await mkdir(dirname(outputVideoPath), { recursive: true })

          const fileWriteStream = fs.createWriteStream(outputVideoPath)

          const options: PuppeteerScreenRecorderOptions = { ...commonOptions(), videoCodec: 'libx265' }

          await record(page, options, fileWriteStream)

          expect(fs.existsSync(outputVideoPath)).toBeTruthy()
          fileWriteStream.on('end', () => {
            expect(fileWriteStream.writableFinished).toBeTruthy()
          })
        })
      })
    }

    {
      const outputVideoPath = outputPath('long-streamed.webm')
      it(`Streams the video to ${outputVideoPath}`, async ({ expect }) => {
        await withBrowser(async (page) => {
          await mkdir(dirname(outputVideoPath), { recursive: true })

          const fileWriteStream = fs.createWriteStream(outputVideoPath)

          const options: PuppeteerScreenRecorderOptions = {
            ...commonOptions(),
            videoCodec: 'libvpx-vp9',
            outputFormat: 'webm',
          }

          await record(page, options, fileWriteStream)

          expect(fs.existsSync(outputVideoPath)).toBeTruthy()
          fileWriteStream.on('end', () => {
            expect(fileWriteStream.writableFinished).toBeTruthy()
          })
        })
      })
    }
  },
  { retry: 0, timeout: 600_000 }
)

function commonOptions(): PuppeteerScreenRecorderOptions {
  return {
    fps: 20,
    keyframeIntervalInSeconds: 1,
    videoFrame: { width: 1920, height: 1080 },
    autoStopAfterSeconds: 10,
    minVideoBitrate: 1000,
    maxVideoBitrate: 1000,
  }
}

async function record(
  page: Page,
  options: PuppeteerScreenRecorderOptions,
  fileWriteStream: fs.WriteStream
) {
  await goToClock(page)
  const recorder = new PuppeteerScreenRecorder(page, options)
  await recorder.startWritingToStream(fileWriteStream)
  await recorder.sleepUntilAutoStopped()
}

async function goToClock(page: Page) {
  await page.goto('https://clock.zone/europe/zurich', { waitUntil: 'load' })
}

function outputPath(filename: string) {
  return `./test-output/${new Date().toISOString().split(':').join('-')}-${filename}`
}

async function withBrowser(fn: (page: Page) => Promise<void>) {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [`--window-size=1920,1080`, '--no-sandbox'],
    defaultViewport: { width: 1920, height: 900 },
    ...(executablePath ? { executablePath } : {}),
  })

  try {
    const page = await browser.newPage()
    try {
      await fn(page)
    } finally {
      if (!page.isClosed()) await page.close()
    }
  } finally {
    await browser.close()
  }
}
