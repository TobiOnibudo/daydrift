import { defineConfig, devices } from '@playwright/test';

import { BASE_URL } from './env';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // Tests share one API, worker and database; keep them in order for predictable state.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
