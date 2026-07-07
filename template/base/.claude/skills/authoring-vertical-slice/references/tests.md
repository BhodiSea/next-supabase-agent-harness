# Tests reference

Tests for a slice live at `lib/dal/__tests__/`:

- `<feature>.rls.test.sql` — pgTAP. Schema shape + each RLS policy. The cross-tenant
  isolation test: set tenant A's JWT, attempt to read tenant B's rows, assert 0 rows
  (fail-closed). This is the keystone check.
- `<feature>.test.ts` — Vitest. DAL DTO mapping, the `undefined` branches that
  `noUncheckedIndexedAccess` forces, and pure logic. Write mutation-survivable
  assertions: assert specific values, not just that a line ran.
- Playwright + axe-core: E2E on the new `app/<feature>` route; assert no WCAG 2.2 AA
  violations.

Commands (these test scripts may not exist yet — reference them as the intended gate):

- `pnpm test:rls` — pgTAP cross-tenant isolation suite.
- `pnpm test` — Vitest unit suite.
- `pnpm playwright test` — E2E.
- `pnpm test:a11y` — Playwright + axe (WCAG 2.2 AA).

Annotate non-obvious fixtures (JWT minting, tenant seeding) with `// SOURCE:`.
