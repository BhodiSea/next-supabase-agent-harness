import { existsSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Auth routing acceptance net. The signed-in case runs under the seeded user's storageState
// (e2e/auth.setup.ts) and self-skips when the local stack is not configured; the signed-out case
// needs no session. SOURCE: docs/harness/README.md (auth redirect contract)
const USER_STATE = 'e2e/.auth/user.json'
const authed = existsSync(USER_STATE)

test.describe('signed out', () => {
  test('access to the protected page bounces to login', async ({ page }) => {
    await page.goto('/protected')
    await page.waitForURL('**/auth/login')
    expect(new URL(page.url()).pathname).toBe('/auth/login')
  })
})

test.describe('signed in', () => {
  test.use({ storageState: USER_STATE })
  test.beforeEach(() => {
    test.skip(!authed, 'local stack not configured — authed redirect checks skipped')
  })

  test('the protected page renders a main landmark', async ({ page }) => {
    await page.goto('/protected')
    await expect(page.getByRole('main')).toBeVisible()
  })
})
