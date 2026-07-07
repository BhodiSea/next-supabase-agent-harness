<!-- SOURCE: docs/harness/README.md (pre-merge human-review checklist; test-evidence over assertion) -->

## What & why

<!-- One-liner + link to specs/<feature>.md if this touches auth/RLS/migrations/caching. -->

## Test evidence (prove, don't claim)

Paste the REAL output of the gate, not a claim that it passed:

```
$ pnpm validate
<paste>
$ pnpm test:rls        # if this PR touches RLS / the DAL / tenant data
<paste cross-tenant isolation output — must show fail-closed (0 cross-tenant rows)>
```

## Security & regulated-work checklist (tick what applies; CODEOWNERS sign-off required)

- [ ] RLS `ENABLE` + `FORCE` on every new/changed exposed table; policy in the SAME
      migration; `TO authenticated`; `(select auth.uid())` initPlan; policy columns indexed;
      no `FOR ALL`; UPDATE paired with SELECT.
- [ ] Authorization in the DAL only; `import 'server-only'`; verified-claims auth
      (getClaims/getUser, never the cookie session server-side); minimal DTOs; no DB
      client/secrets outside the DAL.
- [ ] No authorization logic in `proxy.ts`; auth re-verified at the data boundary.
- [ ] **Caching-security audit:** every `'use cache'` boundary takes an explicit
      tenant/user cache-key argument; no ambient `cookies()`/`headers()`/`searchParams`
      reads inside a cached scope; no ISR on auth routes.
- [ ] Auth/cohort data from `app_metadata` / `auth.jwt()`, not `user_metadata`.
- [ ] No `service_role` key in app/test code; isolation suite passes from a real client JWT.
- [ ] WCAG 2.2 AA checks pass (axe) for UI changes.
- [ ] Every non-trivial decision carries a `// SOURCE:`; ADR emitted (`/adr`);
      `/verify-citations` is CLEAN.
- [ ] Any new MCP server / Skill is on `docs/security/approved-tools.md` (scanned, version-pinned).

<!-- Add your project's design-system review checklist here (see docs/harness/gates-catalog.md). -->
