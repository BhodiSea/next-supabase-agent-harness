import { existsSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

// axe-core is an automated regression net, not a full WCAG conformance audit — it catches the
// machine-detectable subset. Public routes run unauthenticated; the protected routes run under the
// seeded user's storageState (e2e/auth.setup.ts) so every screen is actually rendered, not bounced
// to the login page. SOURCE: docs/harness/README.md (axe regression net)
const USER_STATE = 'e2e/.auth/user.json'
const authed = existsSync(USER_STATE)

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  expect(results.violations).toEqual([])
}

const PUBLIC_ROUTES = ['/', '/auth/login']
const AUTHED_ROUTES = ['/protected']

test.describe('public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(route)
      await expectNoViolations(page)
    })
  }
})

test.describe('authenticated routes', () => {
  test.use({ storageState: USER_STATE })
  test.beforeEach(() => {
    test.skip(!authed, 'local stack not configured — authed axe skipped')
  })
  for (const route of AUTHED_ROUTES) {
    test(`${route} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(route)
      await expectNoViolations(page)
    })
  }
})
