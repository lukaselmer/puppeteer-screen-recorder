import fs from 'fs'
import { dirname } from 'path'

import puppeteer, { Page } from 'puppeteer'
import { describe, ExpectStatic, it, TestContext } from 'vitest'

import { PuppeteerScreenRecorder, PuppeteerScreenRecorderOptions } from '..'

describe.concurrent(
  'ShortPuppeteerScreenRecorder',
  () => {
    {
      const outputVideoPath = outputPath(`1-github-and-google.${'mp4'}`)
      it(`Records github and google to ${outputVideoPath}`, async ({ expect }) => {
        await recordWithFormat(outputVideoPath, expect, 'mp4')
      })
    }

    {
      const outputVideoPath = outputPath(`1-github-and-google.${'mov'}`)
      it(`Records github and google to ${outputVideoPath}`, async ({ expect }) => {
        await recordWithFormat(outputVideoPath, expect, 'mov')
      })
    }

    {
      const outputVideoPath = outputPath(`1-github-and-google.${'webm'}`)
      it(`Records github and google to ${outputVideoPath}`, async ({ expect }) => {
        await recordWithFormat(outputVideoPath, expect, 'webm')
      })
    }

    {
      const outputVideoPath = outputPath(`1-github-and-google.${'avi'}`)
      it(`Records github and google to ${outputVideoPath}`, async ({ expect }) => {
        await recordWithFormat(outputVideoPath, expect, 'avi')
      })
    }

    {
      const outputVideoPath = outputPath('2-different-frame-rate-height-aspect-ratio.mp4')
      it(`Changes the frame width, height and aspect ratio to ${outputVideoPath}`, async ({
        expect,
      }) => {
        /** setup */
        await withBrowser(async (page) => {
          const options: PuppeteerScreenRecorderOptions = {
            followNewTab: false,
            videoFrame: {
              width: 1024,
              height: 1024,
            },
            aspectRatio: '4:3',
          }
          const recorder = new PuppeteerScreenRecorder(page, options)
          await recorder.start(outputVideoPath)

          /** execute */
          await goToGithub(page)

          /** cleanup */
          await recorder.stop()

          assertSuccessfulRecording(expect, recorder, outputVideoPath)
        })
      })
    }

    it('Throws an error with an invalid savePath argument', async ({ expect }) => {
      /** setup */
      await withBrowser(async (page) => {
        try {
          const outputVideoPath = outputPath('./tes')
          const recorder = new PuppeteerScreenRecorder(page)
          await recorder.start(outputVideoPath)
          /** execute */
          await goToGithubAndGoogle(page)

          /** cleanup */
          await recorder.stop()
        } catch (error) {
          expect((error as Error).message).toMatchInlineSnapshot('"File format is not supported"')
        }
      })
    })

    {
      const outputVideoPath = outputPath('4-streamed.mp4')
      it(`Streams the video to ${outputVideoPath}`, async ({ expect }) => {
        /** setup */
        await withBrowser(async (page) => {
          try {
            fs.mkdirSync(dirname(outputVideoPath), { recursive: true })
          } catch (e) {
            console.error(e)
          }

          const fileWriteStream = fs.createWriteStream(outputVideoPath)

          const recorder = new PuppeteerScreenRecorder(page)
          await recorder.startStream(fileWriteStream)

          /** execute */
          await goToGithubAndGoogle(page)

          /** cleanup */
          await recorder.stop()

          /** assert */
          expect(fs.existsSync(outputVideoPath)).toBeTruthy()
          fileWriteStream.on('end', () => {
            expect(fileWriteStream.writableFinished).toBeTruthy()
          })
        })
      })
    }

    {
      const outputVideoPath = outputPath('5a-gray-autopad-color.mp4')
      it(`Records with the autopad color to gray to ${outputVideoPath}`, async ({ expect }) => {
        /** setup */
        await withBrowser(async (page) => {
          const options: PuppeteerScreenRecorderOptions = {
            followNewTab: false,
            videoFrame: {
              width: 1024,
              height: 1024,
            },
            autopad: {
              color: 'gray',
            },
          }
          const recorder = new PuppeteerScreenRecorder(page, options)
          await recorder.start(outputVideoPath)

          /** execute */
          await goToGithub(page)

          /** cleanup */
          await recorder.stop()

          /** assert */
          expect(fs.existsSync(outputVideoPath)).toBeTruthy()
        })
      })
    }

    {
      const outputVideoPath = outputPath('5b-hex-autopad-color.mp4')
      it(`Records with the autopad color #008000 to ${outputVideoPath}`, async ({ expect }) => {
        /** setup */
        await withBrowser(async (page) => {
          const options: PuppeteerScreenRecorderOptions = {
            followNewTab: false,
            videoFrame: {
              width: 1024,
              height: 1024,
            },
            autopad: {
              color: '#008000',
            },
          }
          const recorder = new PuppeteerScreenRecorder(page, options)
          await recorder.start(outputVideoPath)

          /** execute */
          await goToGithub(page)

          /** cleanup */
          await recorder.stop()

          assertSuccessfulRecording(expect, recorder, outputVideoPath)
        })
      })
    }

    {
      const outputVideoPath = outputPath('5b-default-autopad-color.mp4')
      it(`Records with the default autopad color to ${outputVideoPath}`, async ({ expect }) => {
        /** setup */
        await withBrowser(async (page) => {
          const options: PuppeteerScreenRecorderOptions = {
            followNewTab: false,
            videoFrame: {
              width: 1024,
              height: 1024,
            },
            autopad: {},
          }
          const recorder = new PuppeteerScreenRecorder(page, options)
          await recorder.start(outputVideoPath)

          /** execute */
          await goToGithub(page)

          /** cleanup */
          await recorder.stop()

          assertSuccessfulRecording(expect, recorder, outputVideoPath)
        })
      })
    }

    {
      const outputVideoPath = outputPath('6-custom-crf.mp4')
      it(`Records with a custom crf to ${outputVideoPath}`, async ({ expect }) => {
        /** setup */
        await withBrowser(async (page) => {
          const options: PuppeteerScreenRecorderOptions = {
            followNewTab: false,
            videoFrame: {
              width: 1024,
              height: 1024,
            },
            videoCrf: 0,
          }
          const recorder = new PuppeteerScreenRecorder(page, options)
          await recorder.start(outputVideoPath)

          /** execute */
          await goToGithub(page)

          /** cleanup */
          await recorder.stop()

          assertSuccessfulRecording(expect, recorder, outputVideoPath)
        })
      })
    }
  },
  { retry: 3 }
)

async function recordWithFormat(outputVideoPath: string, expect: ExpectStatic, format: string) {
  await withBrowser(async (page) => {
    const recorder = new PuppeteerScreenRecorder(page)
    await recorder.start(outputVideoPath)

    await goToGithubAndGoogle(page)

    await recorder.stop()

    assertSuccessfulRecording(expect, recorder, outputVideoPath, format !== 'webm')
  })
}

async function goToGithubAndGoogle(page: Page) {
  await goToGithub(page)
  await goToGoogle(page)
}

async function goToGithub(page: Page) {
  await page.goto('https://github.com', { waitUntil: 'load' })
}

async function goToGoogle(page: Page) {
  await page.goto('https://google.com', { waitUntil: 'load' })
}

function outputPath(filename: string) {
  return `./test-output/${filename}`
}

function assertSuccessfulRecording(
  expect: TestContext['expect'],
  recorder: PuppeteerScreenRecorder,
  outputVideoPath: string,
  checkDuration = true
) {
  expect(fs.existsSync(outputVideoPath)).toBeTruthy()

  if (checkDuration) {
    const duration = recorder.getRecordDuration()
    expect(duration).not.toEqual('00:00:00:00')
  }
}

async function withBrowser(fn: (page: Page) => Promise<void>) {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  const browser = await puppeteer.launch({
    headless: 'new',
    ...(executablePath ? { executablePath } : {}),
  })

  try {
    const page = await browser.newPage()
    try {
      await fn(page)
    } finally {
      await page.close()
    }
  } finally {
    await browser.close()
  }
}
