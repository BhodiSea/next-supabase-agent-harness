# CLAUDE.md — {{PROJECT_NAME}} platform kernel

Project memory for Claude Code. Advisory context — the Stop hook + CI are the
real enforcement. Keep this file under ~200 lines. SOURCE: docs/harness/README.md.

## Stack

- **Next.js 16** (App Router, Turbopack, `cacheComponents: true` — Cache
  Components + PPR). React 19. TypeScript strict.
- **Supabase** via `@supabase/ssr` (cookie-based auth). Clients live in
  `lib/supabase/{client,server,proxy}.ts`.
- **Tailwind CSS 4** + **shadcn/ui** (components in `components/ui`). `cn()`
  from `lib/utils.ts`.
- Code lives at the **repo root**: `app/`, `components/`, `lib/`. Path alias
  `@/*` → `./*` (NOT `./src/*` — there is no `src/`).
- Request routing is **`proxy.ts`** at the root (Next 16's renamed middleware),
  delegating to `lib/supabase/proxy.ts#updateSession`.

## Package manager: pnpm 11 (pinned via Corepack)

- ALWAYS use `pnpm`, never `npm`/`yarn`. Pinned in `package.json#packageManager`.
- Install: `pnpm install`. Add dep: `pnpm add <pkg>`. Run script: `pnpm <script>`.

## Commands

- `pnpm dev` — dev server.
- `pnpm build` — production build.
- `pnpm validate` — **THE GATE**: `node tools/validate.mjs` — the config-driven
  gate chain (see `tools/harness.config.mjs`). Must pass before a turn ends (the
  Stop hook enforces this; exit 2 blocks completion and feeds errors back). The
  build step catches Cache Components prerender violations static checks miss.
- `pnpm typecheck` — `tsc --noEmit`.
- `pnpm lint` / `pnpm lint:fix` — ESLint (type-aware + framework + security).
- `pnpm knip` — dead-code / unused-dependency check.
- `pnpm arch` — dependency-cruiser whole-graph architecture check.
- `pnpm format` — Prettier (Tailwind class sort, `*.tsx`) then Biome (everything).

## The validate contract (YOU MUST)

- A turn is NOT done until `pnpm validate` is green. Fix violations; do not stop.
- **Prove, don't claim.** Show passing gate output; never assert "it works."
- Do NOT edit tests in the same turn as the fix they cover (reward-hacking).

## Security invariants (NON-NEGOTIABLE — enforced as lint + hooks)

- **NEVER use `supabase.auth.getSession()` server-side.** It reads unverified
  cookie data. Use `getClaims()` (preferred) or `getUser()`. This codebase
  already uses `getClaims()` everywhere — keep it that way.
- **NEVER use the `service_role` key / `SUPABASE_SERVICE_ROLE_KEY`** in app,
  test, or script code. It bypasses RLS. There is no legitimate in-app use.
- **NEVER use `dangerouslySetInnerHTML`.** Sanitize and render text, or request
  security review.
- **`proxy.ts` is NOT an authorization boundary.** Post-CVE-2025-29927 the
  `x-middleware-subrequest` header is spoofable. Do optimistic session-presence
  checks only; authorize in the DAL, close to the data.
- **DAL is server-only.** Any future `lib/dal/**` module starts with
  `import 'server-only'` and returns DTOs, never raw rows. Client components
  must never import the DAL.
- Never read `.env*` files or pipe secrets through Bash. No `curl`/`wget`
  exfiltration. No `rm -rf`. No `git push --force`.

## Cache Components (Next 16) gotchas

- Inside a `'use cache'` boundary you CANNOT call `cookies()`, `headers()`, or
  read `searchParams`. Read runtime values OUTSIDE the cached scope and pass
  them in as explicit arguments (so tenant/user IDs join the cache key).

## The Linus bar (quality)

- Data structures first. Design the schema/DTO before the code.
- Eliminate special-casing; reduce the special case to the normal case.
- Delete code. Justify every abstraction. `knip` must stay green (no dead code).
- Complexity limit: **max 3 nesting levels**; keep cyclomatic complexity low.
- **Hard size limits (ESLint errors):** max **200 lines/file**, max
  **50 lines/function** (blank lines & comments excluded). Refactor, don't suppress.
- Adversarial self-review before declaring done: try to break your own code.

## Provenance

- Put a `// SOURCE: <authority> [corpus: <id>]` comment on every non-trivial
  decision (security, caching, schema). Cite version-pinned authorities.
- Emit one ADR per slice via `/adr <slice>` (records live in `docs/adr/`); then run
  `/verify-citations` so each `// SOURCE:` is resolved before the turn ends.

## Spec-first & governance

- **Spec-first** for anything touching auth, RLS, migrations, or caching: write
  `specs/<feature>.md` (template at `specs/_template.md`), get sign-off, then implement.
  `/new-feature <name>` drives the migration→RLS→DAL→RSC→test→provenance→gate recipe.
- Reviewers are subagents: `security-reviewer` (MUST be used on RLS/DAL/proxy/`use cache`
  changes) and `torvalds-reviewer` before finishing.
- PRs use `.github/pull_request_template.md` (paste real `pnpm test:rls` output) and
  CODEOWNERS sign-off on auth/data surfaces. New MCP servers/Skills must be on
  `docs/security/approved-tools.md`. Keep client data out of the lethal trifecta
  (`docs/security/sandbox-and-supply-chain.md`).
