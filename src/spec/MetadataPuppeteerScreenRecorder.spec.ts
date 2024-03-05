import { createWriteStream, existsSync, WriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import puppeteer, { Page } from 'puppeteer'
import { describe, it } from 'vitest'
import { PuppeteerScreenRecorder, PuppeteerScreenRecorderOptions } from '..'

describe.concurrent(
  'MetadataPuppeteerScreenRecorder',
  () => {
    {
      const outputVideoPath = outputPath('metadata-stream-libx264.mp4')
      it(`Writes the video to ${outputVideoPath}`, async ({ expect }) => {
        await withBrowser(async (page) => {
          await mkdir(dirname(outputVideoPath), { recursive: true })

          const options: PuppeteerScreenRecorderOptions = { ...commonOptions(), videoCodec: 'libx264' }

          await recordFile(page, options, outputVideoPath)

          expect(existsSync(outputVideoPath)).toBeTruthy()
        })
      })
    }

    {
      const outputVideoPath = outputPath('metadata-file-libx264.mp4')
      it(`Streams the video to ${outputVideoPath}`, async ({ expect }) => {
        await withBrowser(async (page) => {
          await mkdir(dirname(outputVideoPath), { recursive: true })

          const fileWriteStream = createWriteStream(outputVideoPath)

          const options: PuppeteerScreenRecorderOptions = { ...commonOptions(), videoCodec: 'libx264' }

          await recordStream(page, options, fileWriteStream)

          expect(existsSync(outputVideoPath)).toBeTruthy()
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
    metadata: {
      title: 'Awesome video',
      comment: 'example comment',
      description: 'example description',
      year: '2023',
    },
    ffmpegPath,
  }
}

async function recordFile(page: Page, options: PuppeteerScreenRecorderOptions, output: string) {
  await goToClock(page)
  const recorder = new PuppeteerScreenRecorder(page, options)
  await recorder.startWritingToFile(output)
  await recorder.sleepUntilAutoStopped()
}

async function recordStream(page: Page, options: PuppeteerScreenRecorderOptions, output: WriteStream) {
  await goToClock(page)
  const recorder = new PuppeteerScreenRecorder(page, options)
  await recorder.startWritingToStream(output)
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

const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'
