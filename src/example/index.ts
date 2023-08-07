/* eslint-disable no-console */
import fs from 'fs'
import { PassThrough } from 'stream'

import puppeteer from 'puppeteer'

import { PuppeteerScreenRecorder } from '../lib/PuppeteerScreenRecorder'

async function testStartMethod(format: string, isStream: boolean) {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  const browser = await puppeteer.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: false,
  })
  const page = await browser.newPage()
  const recorder = new PuppeteerScreenRecorder(page)
  if (isStream) {
    const passthrough = new PassThrough()
    format = format.replace('video', 'stream')
    const fileWriteStream = fs.createWriteStream(format)
    passthrough.pipe(fileWriteStream)
    await recorder.startWritingToStream(passthrough)
  } else {
    await recorder.startWritingToFile(format)
  }
  await page.goto('https://developer.mozilla.org/en-US/docs/Web/CSS/animation')
  await sleep(10 * 1000)
  await recorder.stop()
  await browser.close()
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

async function executeSample(format: string) {
  const argList = process.argv.slice(2)
  const isStreamTest = argList.includes('stream')

  console.log(`Testing with Method using ${isStreamTest ? 'stream' : 'normal'} mode`)
  await testStartMethod(format, isStreamTest)
}

executeSample('./report/video/simple1.mp4')
  .then(() => console.log('completed'))
  .catch(console.error)
