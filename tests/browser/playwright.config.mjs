import { defineConfig } from '@playwright/test'

export const contextOptions = {
  locale: 'zh-CN',
  reducedMotion: 'reduce',
  serviceWorkers: 'block'
}

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  timeout: 60_000,
  reporter: 'list',
  outputDir: '.local/playwright',
  workers: 1,
  use: {
    browserName: 'chromium',
    ...contextOptions,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
    ...(process.env.BROWSER_TEST_CHROMIUM
      ? { launchOptions: { executablePath: process.env.BROWSER_TEST_CHROMIUM } }
      : {})
  }
})
