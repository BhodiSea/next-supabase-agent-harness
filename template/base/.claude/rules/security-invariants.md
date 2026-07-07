# Security invariants (always loaded; also hook- and lint-enforced)

These are non-negotiable. They are enforced deterministically by PreToolUse/Stop
hooks and by ESLint; write code that already satisfies them so the gates never fire.
SOURCE: docs/harness/README.md (security-invariants rule)

- **Never use the server-side cookie session read** (`supabase.auth.getSession()` on
  the server) — it trusts unverified cookie data. Use `getClaims()` (preferred) or
  `getUser()`.
- **Never reference the `service_role` key / `SUPABASE_SERVICE_ROLE_KEY`** in app or
  test code — it bypasses RLS. There is no legitimate in-app use.
- **Never use `dangerouslySetInnerHTML`** — sanitize and render text, or request review.
- **The DAL is server-only.** Every `lib/dal/**` module begins with `import 'server-only'`
  and returns DTOs, never raw rows. Client components must never import the DAL.
- **`proxy.ts` is never the authorization boundary** (post-CVE-2025-29927 the
  `x-middleware-subrequest` header is spoofable). Optimistic session-presence checks
  only; authorize in the DAL, close to the data.
- **RLS** uses `ENABLE` + `FORCE ROW LEVEL SECURITY` and the `(select auth.uid())`
  initPlan pattern; auth/cohort data comes from `app_metadata` / `auth.jwt()`, never
  `user_metadata`. (Enforced in CI via the Supabase advisors + pgTAP, not lint.)
- **No `rm -rf`, no `git push --force`, no `git reset --hard`, no reading `.env` files.**
