import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: { timeout: 15_000 },
  fullyParallel: false,
  outputDir: 'test-results/playwright',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/playwright-report' }]],
  retries: 0,
  testDir: './tests/e2e',
  timeout: 90_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev:local',
    reuseExistingServer: true,
    timeout: 120_000,
    url: 'http://127.0.0.1:4173',
  },
  workers: 1,
});
