import { defineConfig, devices } from '@playwright/test';

const BASE_URL   = process.env.E2E_BASE_URL  ?? 'http://localhost:3000';
const API_URL    = process.env.TEST_API_URL  ?? 'http://localhost:3001/api/v1';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  /* Run tests sequentially — avoids shared-state races with the DB */
  workers: 1,
  fullyParallel: false,

  /* Retry flaky tests once on CI */
  retries: process.env.CI ? 1 : 0,

  timeout: 30_000,
  expect: { timeout: 8_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/reports', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    /* Record a video only on first retry (CI debugging) */
    video: process.env.CI ? 'on-first-retry' : 'off',
    screenshot: 'only-on-failure',
    /* Give each test its own isolated browser context */
    storageState: undefined,
    extraHTTPHeaders: {},
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the Next.js dev server automatically if E2E_BASE_URL is not set */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
        env: {
          NEXT_PUBLIC_API_URL: API_URL,
        },
      },
});
