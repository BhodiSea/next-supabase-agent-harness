import { defineConfig, devices } from '@playwright/test'

// Playwright drives the a11y regression net (axe-core) against a real build.
// CI/manual only — not part of the Stop gate or `pnpm validate`.
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000'

export default defineConfig({
  projects: [
    // Seeds the e2e user + saves storageState (self-skips when the stack is unconfigured).
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      dependencies: ['setup'],
      name: 'chromium',
      testMatch: /\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: process.env['CI'] ? 'github' : 'list',
  testDir: './e2e',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm build && pnpm start',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
    url: baseURL,
  },
})
