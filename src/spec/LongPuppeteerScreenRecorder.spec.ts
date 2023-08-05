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

    it(`Streams the video to ${outputPath('long-libx264.mp4')}`, async ({ expect }) => {
      const outputVideoPath = outputPath('long-libx264.mp4')

      await withBrowser(async (page) => {
        await mkdir(dirname(outputVideoPath), { recursive: true })

        const fileWriteStream = fs.createWriteStream(outputVideoPath)

        const options: PuppeteerScreenRecorderOptions = {
          fps: 20,
          videoFrame: { width: 1920, height: 1080 },
          videoCodec: 'libx264',
        }

        await record(page, options, fileWriteStream)

        expect(fs.existsSync(outputVideoPath)).toBeTruthy()
        fileWriteStream.on('end', () => {
          expect(fileWriteStream.writableFinished).toBeTruthy()
        })
      })
    })

    it(`Streams the video to ${outputPath('long-libx265.mp4')}`, async ({ expect }) => {
      const outputVideoPath = outputPath('long-libx265.mp4')

      await withBrowser(async (page) => {
        await mkdir(dirname(outputVideoPath), { recursive: true })

        const fileWriteStream = fs.createWriteStream(outputVideoPath)

        const options: PuppeteerScreenRecorderOptions = {
          fps: 20,
          videoFrame: { width: 1920, height: 1080 },
          videoCodec: 'libx265',
        }

        await record(page, options, fileWriteStream)

        expect(fs.existsSync(outputVideoPath)).toBeTruthy()
        fileWriteStream.on('end', () => {
          expect(fileWriteStream.writableFinished).toBeTruthy()
        })
      })
    })

    it.only(`Streams the video to ${outputPath('long-streamed.webm')}`, async ({ expect }) => {
      const outputVideoPath = outputPath('long-streamed.webm')

      await withBrowser(async (page) => {
        await mkdir(dirname(outputVideoPath), { recursive: true })

        const fileWriteStream = fs.createWriteStream(outputVideoPath)

        const options: PuppeteerScreenRecorderOptions = {
          fps: 20,
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
  },
  { retry: 0, timeout: 600_000 }
)

async function record(
  page: Page,
  options: PuppeteerScreenRecorderOptions,
  fileWriteStream: fs.WriteStream
) {
  await goToClock(page)
  const recorder = new PuppeteerScreenRecorder(page, options)
  await recorder.startWritingToStream(fileWriteStream)
  await sleep(10_000)
  await recorder.stop()
}

async function goToClock(page: Page) {
  await page.goto('https://clock.zone/europe/zurich', { waitUntil: 'load' })
}

// async function goToGithubAndGoogle(page: Page) {
//   await goToGithub(page)
//   await goToGoogle(page)
// }

// async function goToGithub(page: Page) {
//   await page.goto('https://github.com', { waitUntil: 'load' })
//   await sleep(1000)
// }

// async function goToGoogle(page: Page) {
//   await page.goto('https://google.com', { waitUntil: 'load' })
//   await sleep(1000)
// }

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function outputPath(filename: string) {
  return `./test-output/${new Date().toISOString()}-${filename}`
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
