// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 40_000,
    retry: 3,
    minThreads: 10,
    maxThreads: 20,
    maxConcurrency: 20,
    include: ['src/**/*.spec.ts'],
    globalSetup: 'src/spec/globalSetup.ts',
  },
})
