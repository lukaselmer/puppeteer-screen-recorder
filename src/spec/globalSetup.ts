import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const promisifiedExec = promisify(exec)

export async function setup() {
  await tryToKillChromeForTesting()
}

export async function teardown() {
  await tryToKillChromeForTesting()
}

async function tryToKillChromeForTesting() {
  await promisifiedExec('pkill "Google Chrome for Testing"').catch(() => {})
}
