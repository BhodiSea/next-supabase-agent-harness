import { test as setup } from '@playwright/test'

// Sign the seeded test user in through the real login form so the @supabase/ssr cookies are set,
// then persist storageState for the authenticated runs. The user is seeded by the runner
// (tests/a11y/run-a11y.mjs), which passes its credentials via env — so supabase-js never has to load
// inside Playwright's module loader (its conditional exports break it). Self-skips when the runner
// did not seed (unconfigured stack), so the public-route checks still run.
// SOURCE: docs/harness/README.md (axe regression net — the runner seeds, setup signs in via the form)

const USER = {
  email: process.env['E2E_USER_EMAIL'],
  password: process.env['E2E_USER_PASSWORD'],
}

setup('authenticate user', async ({ page }) => {
  setup.skip(USER.email === undefined, 'no seeded user — authed e2e skipped')
  if (USER.email === undefined || USER.password === undefined) return
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(USER.email)
  await page.getByLabel('Password').fill(USER.password)
  await page.getByRole('button', { name: 'Login' }).click()
  // The form redirects off /auth once the session cookies are set; that's all storageState needs.
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 })
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
