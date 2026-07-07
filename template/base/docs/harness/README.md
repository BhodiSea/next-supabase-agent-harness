# The harness doctrine

This document is the canonical reference for every `// SOURCE: docs/harness/README.md`
citation in the codebase. It explains **why** each enforcement mechanism exists, **which
script implements it**, and **where the honest limits are**. The per-gate reference lives
in [gates-catalog.md](./gates-catalog.md).

The one-sentence thesis: **quality is a deterministic gate, not a request.** Memory files
(CLAUDE.md, `.claude/rules/*.md`) are advisory context; hooks and CI are the enforcement.
The harness is built so the model produces green-on-first-try code and the gate rarely has
to fire — but when it does fire, it cannot be talked out of it.

## The six-layer model

Every mechanism in this template belongs to one of six layers:

| # | Layer | Concrete mechanisms |
|---|---|---|
| 1 | **Grounding / context** | CLAUDE.md + `.claude/rules/*.md`, the pinned corpus (`tools/mcp/corpus/index.json`), the `authoring-vertical-slice` skill, `specs/_template.md` |
| 2 | **Generation** | plan-mode design first; data structures before code (the Linus bar in CLAUDE.md) |
| 3 | **In-loop verification** | mid-turn MCP tools (`corpus_search`, `rls_verify`, the Supabase advisors), `posttool-fast-check.mjs` per-edit feedback |
| 4 | **Provenance capture** | `// SOURCE:` + `[corpus: <id>]` comments, `posttool-source-check.mjs`, `tools/check-sources.mjs`, one ADR per slice (`/adr`) |
| 5 | **Adversarial review** | read-only reviewer subagents (`security-reviewer`, `torvalds-reviewer`, `citation-verifier` via `/verify-citations`) |
| 6 | **Gated completion** | the Stop hook (`stop-validate-gate.mjs`) running the full validate chain with exit-2 semantics; CI as the floor |

Layers 1–2 raise the probability of correct output; layers 3–6 make incorrect output
unable to ship. Doctrine: never rely on a layer-1 instruction for anything a layer-3/6
gate could enforce deterministically.

## The hook map (deterministic enforcement)

Exit-code semantics (the crux of the whole design):

- **exit 0** — proceed. Stdout may carry a structured JSON decision
  (e.g. `hookSpecificOutput.permissionDecision: "deny"` on PreToolUse).
- **exit 2** — block, and **stderr is fed back to the model** as the correction signal.
  On `PreToolUse` this blocks the tool call; on `Stop` it forces the turn to continue.
- **any other non-zero** — non-blocking error; the action proceeds. Security hooks must
  therefore always use exit 2 (or the structured deny), never exit 1.
- `PostToolUse` cannot un-run a tool; its exit 2 surfaces stderr to the model so it fixes
  what just landed.

| Event | Matcher | Script | Enforces |
|---|---|---|---|
| PreToolUse | `Bash` | `.claude/hooks/pretool-bash-guard.mjs` | denies destructive shell (`rm -rf`, force-push, hard reset), `.env` reads, service-role key references in commands, destructive raw SQL, fork bombs |
| PreToolUse | `Edit\|Write\|MultiEdit` | `.claude/hooks/pretool-write-guard.mjs` | blocks invariant-violating file **content** before it lands (see "security invariants" below) and denies edits to harness-owned paths (see "tamper evidence") |
| PostToolUse | `Edit\|Write\|MultiEdit` | `.claude/hooks/posttool-fast-check.mjs` | fast per-file feedback: **Biome only** (`biome check --write` on the single changed file), non-blocking. The heavy checks (`tsc`, `eslint`, `build`) are deliberately deferred to the Stop gate so the edit loop stays tight |
| PostToolUse | `Edit\|Write\|MultiEdit` | `.claude/hooks/posttool-source-check.mjs` | flags non-trivial decision sites that lack an inline `// SOURCE:` citation (exit 2) |
| Stop | — | `.claude/hooks/stop-validate-gate.mjs` | runs the full gate (`pnpm validate` + `pnpm test:rls` + the unit suite); exits 2 with failures on stderr until everything is green |

Shared I/O helpers (stdin JSON parsing, `block()`, `denyTool()`, `pass()`) live in
`.claude/hooks/lib/hookio.mjs` — Node only, no `jq`/Bash dependency.

### stop-validate-gate (the unbreakable core)

The Stop hook is the single load-bearing mechanism: a turn **cannot end** while the gate
is red. Details that matter:

- **Loop guard:** the hook input carries `stop_hook_active: true` when a previous Stop
  hook already kept the model running. The gate uses it to escalate its message ("STILL
  red after a prior continuation"), not to exit early — the gate re-runs until green.
- **Bound:** `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` (set in `.claude/settings.json` `env`)
  caps consecutive Stop-hook blocks so a genuinely stuck session terminates instead of
  looping forever. The cap is the safety valve; the gate is the contract.
- **Failure output is truncated tail-first** (the last ~4000 chars per step) so the model
  sees the actual errors, not a wall of passing output.
- The RLS step self-skips before a schema exists; the unit step is the fast behavioral
  net. All steps must be green to end a turn.

### pretool-bash-guard

Deterministic denial of the commands that permission Bash-pattern matching handles
unreliably (documented as fragile upstream). Regex rules over the raw command string;
each denial returns a machine-readable reason via the structured
`permissionDecision: "deny"` protocol so the model can route around the block instead of
retrying it.

### pretool-write-guard

The only reliable place to stop forbidden code from being **written** (lint would catch it
later; this catches it before it lands). It polices source-code files only
(`.ts/.tsx/.js/.jsx/.mjs/.cjs`) — docs, ADRs and registries legitimately mention banned
patterns by name. It exempts `.claude/**` (the harness's own tooling), test directories
(which legitimately reference the patterns), and `supabase/functions/**` (see the
Edge-Function carve-out below). "Client" follows the architecture's authoritative
definition (a `*.client.tsx` file or one carrying the `'use client'` directive), in
lockstep with the ESLint boundaries rules and `dependency-cruiser.js` — not "every
`.tsx`", because Server Components legitimately fetch through the DAL.

### posttool-source-check

The in-session half of the provenance gate: after every edit it scans the changed file for
decision-site keywords (RLS policy strings, auth calls, cache directives, tuning
constants) and exits 2 listing any that lack a `// SOURCE:` within a 3-line window. It
only fires inside the agent session — `tools/check-sources.mjs` runs the **identical
heuristic** over the whole tracked tree in `pnpm validate` and CI, so the two can never
disagree. Keep the decision regex and the window in lockstep when editing either.

## The security invariants

These are enforced as lint rules **and** as the write/bash guards above
(defense-in-depth); memory files restate them only so the model rarely trips the gates.

- **Never read the cookie session server-side** (`supabase.auth` `getSession` on the
  server) — it trusts unverified cookie data. Use `getClaims()` (preferred) or
  `getUser()`. [corpus: supabase/getclaims]
- **Never reference the service-role key** in app, test, or script code — it bypasses RLS.
  The single sanctioned exception is the Edge-Function carve-out below.
- **Never inject raw HTML** (React's dangerous inner-HTML escape hatch) — sanitize and
  render text.
- **The DAL is server-only.** Every `lib/dal/**` module begins with
  `import 'server-only'` and returns DTOs, never raw rows. Client components never import
  the DAL (enforced by the write guard, ESLint boundaries, and `dependency-cruiser.js`).
- **`proxy.ts` is never the authorization boundary** — post-CVE-2025-29927 the
  `x-middleware-subrequest` header is spoofable. Optimistic session-presence checks only;
  authorize in the DAL, close to the data. [corpus: nextjs@16/proxy-cve-2025-29927]
- **RLS** uses `ENABLE` + `FORCE ROW LEVEL SECURITY` and the `(select auth.uid())`
  initPlan pattern; auth/cohort data comes from `app_metadata` / `auth.jwt()`, never
  `user_metadata`. [corpus: supabase/rls-initplan]

## The validate contract

- **Done means green gate.** A turn is not finished until `pnpm validate` (and the
  Stop-hook runtime suites) pass. The Stop hook enforces this; do not stop, do not
  summarize a red build as "mostly working".
- **Prove, don't claim.** Show the passing gate output. An assertion of correctness
  without captured evidence is worth nothing; the gate output is the evidence.
- **No same-turn test edits.** Do not edit a test in the same turn as the fix it covers —
  that is the reward-hacking channel. This is deliberately a **review-time rule** (CLAUDE.md
  contract + reviewer subagents + PR review), not a hard hook: a legitimate new feature
  adds code and tests together, and a deterministic ban cannot tell the two apart (see the
  rejected-gates list in the [gates catalog](./gates-catalog.md)).

The full list of what `pnpm validate` runs, what each step catches, and which steps are
optional modules is in the [gates catalog](./gates-catalog.md).

## The provenance pipeline

The chain runs **corpus → code → check → ADR → verification → gate**:

1. **Pinned corpus** — `tools/mcp/corpus/index.json` holds version-pinned entries
   (`{id, title, url, version, text, sha256}`) for every external authority the code
   relies on. `tools/mcp/corpus-search-server.mjs` serves it as the `corpus_search` MCP
   tool for mid-turn grounding — no network, reads only the local corpus.
2. **In-code convention** — every non-trivial decision (RLS policy shape, auth pattern,
   cache directive, retry/timeout constant, security trade-off) carries an inline
   `// SOURCE: <authority>` comment, with `[corpus: <id>]` when the authority is pinned
   in the corpus.
3. **Enforcement** — `posttool-source-check.mjs` flags unsourced decision sites per-edit;
   `tools/check-sources.mjs` runs the identical scan in `pnpm validate`/CI.
4. **`/adr`** — emits one ADR per slice into `docs/adr/` and reconciles its **Sources**
   section against every inline `// SOURCE:` in the slice (each must appear in the other).
5. **`/verify-citations`** — runs the read-only `citation-verifier` subagent, which
   resolves each citation for **existence** (the source is real and reachable/pinned) and
   **support** (it actually backs the claim), returning `CITATIONS: CLEAN` or
   `CITATIONS: REJECTED`. A turn does not end with rejected citations.

Two distinct failure classes justify step 5: a citation that does not resolve, and a
citation that resolves but does not support the claim. Both are documented, measurable
LLM failure modes; the verifier must re-check rather than trust the model's self-report.

### Spec-first SOP

For any change touching auth, RLS, migrations, or caching: write `specs/<feature>.md`
(from `specs/_template.md`), get human sign-off, **then** implement — ideally in a fresh
session. The spec is necessary but not sufficient; the gate holds the line either way.

## Adversarial review

Reviewer subagents are **read-only by construction** — they cannot write files or run
shell, so a prompt-injected reviewer cannot become a writer. Most run with
`tools: Read, Grep, Glob` only; the single exception is `citation-verifier`, which
additionally holds `WebFetch` (restricted to an allow-list of documentation domains) and
`mcp__corpus_search` — it must fetch external URLs and resolve `[corpus: <id>]` references
to check the citations, but still has no write or shell tool.

- `security-reviewer` — **must** run on any change to RLS, the DAL, `proxy.ts`, or a
  `'use cache'` boundary.
- `torvalds-reviewer` — the quality red-team (data structures first, kill special cases,
  delete code) before a slice is declared done.
- `citation-verifier` — the provenance verifier described above.

## Tamper evidence (honest limits)

The harness protects its own enforcement machinery, but be precise about the claim: it is
**tamper-EVIDENT, not tamper-proof**. An agent (or a developer) with shell access can
ultimately modify anything in the working tree. The design goal is that tampering (a)
requires a deliberate, visible override, (b) leaves a diff a human reviews, and (c) is
caught by CI even if the local session was fully compromised.

The layers, in order of engagement:

1. **Permission denies** in `.claude/settings.json` — network exfiltration
   (`curl`/`wget`), `.env` reads, force-push, hard reset are denied at the permission
   layer before any hook runs.
2. **Write-guard protected paths** — `pretool-write-guard.mjs` denies edits to
   harness-owned files (the hooks themselves, `.claude/settings.json`,
   `tools/check-*.mjs`, `tools/harness.config.mjs`, the lint/architecture configs, CI
   workflows). A human who genuinely needs to change the harness sets
   `HARNESS_ALLOW_SELF_EDIT=1` for that session — an explicit, auditable act, not a
   default.
3. **The `.harness` manifest** — the installer records a SHA-256 content hash for every
   harness-owned file it ships in `.harness/manifest.json`.
   `npx next-supabase-agent-harness doctor` (read-only; CI-friendly exit codes) re-hashes
   the tree against it, so silent in-place edits to harness files are evident as drift.
4. **The CI floor** — CI does not trust `tools/harness.config.mjs`: it runs
   `node tools/validate.mjs --min-floor`, which enforces a **hardcoded** minimum step
   list. Editing the config can therefore ADD gates but can never weaken the
   non-negotiable ones on a PR. Local bypasses (disabled hooks, self-edit overrides, a
   doctored config) change nothing about what merges: **CI is the backstop enforcement**,
   hooks are the fast path.
5. **CODEOWNERS** — harness-owned paths and auth/data surfaces require sign-off from
   {{SECURITY_OWNERS}}, so even an evident tamper needs a human accomplice to land.

## The lethal-trifecta posture

An agent is dangerous when it combines (1) access to private data, (2) exposure to
untrusted content, and (3) the ability to communicate externally. Break at least one leg
for any agent that touches real data (see
`docs/security/sandbox-and-supply-chain.md`):

- **No standing exfiltration** — Bash network commands are denied; `WebFetch` is
  allow-listed to a small set of documentation domains.
- **No service-role exposure** — the key is banned in app/test code (lint + both guards)
  and is never handed to an MCP server. RLS is the backstop.
- **Read-only reviewers** — the subagents most exposed to untrusted content cannot write
  or execute.
- **Default-deny tooling** — no MCP server or Skill runs unless registered in
  `docs/security/approved-tools.md`, version-pinned and reviewed.

## Stop-hook cost (and how to trim it)

The Stop gate ends with `next build`, because the build is the only check that catches
Cache Components prerender violations (e.g. a runtime read inside a `'use cache'` scope)
that static analysis misses. [corpus: nextjs@16/use-cache-runtime-apis] That costs minutes
per turn-end on a large app.

`tools/harness.config.mjs` is the single place the gate chain is declared:
`VALIDATE_STEPS` (what `pnpm validate` runs) and `STOP_HOOK_STEPS` (what the Stop hook
runs — validate plus the RLS and unit suites). To trade turn-end latency for CI-time
discovery, comment the expensive steps (typically `build`, sometimes `unit`) out there —
CI still enforces the hardcoded floor via `--min-floor`, so nothing is lost on the PR,
only discovered later. The config file is itself harness-protected: trimming it is a
human act (`HARNESS_ALLOW_SELF_EDIT=1`), not something the agent does mid-turn. Keep
`build` in while doing caching-heavy work; the feedback loop is worth the minutes.
Optional gate modules are enabled the same way (see the
[gates catalog](./gates-catalog.md)).

## The Edge-Function service-role carve-out policy

There is **no legitimate in-app use** of the service-role key. The single sanctioned
pattern for privileged operations (e.g. admin invites) is a **Supabase Edge Function** —
deployed Deno, not Next.js app code — and only under all of the following, together:

1. **Governed by a project ADR** (`docs/adr/`) recording why RLS cannot express the
   operation and what the function is allowed to do.
2. **Registered** in `docs/security/approved-tools.md` with a written trust rationale.
3. **Double-gated**: `verify_jwt = true` in `supabase/config.toml` (the platform rejects
   unauthenticated calls) **and** an in-handler role check against
   `app_metadata` — never `user_metadata`, which the user can write.
4. **Scoped carve-outs only**: the write guard, ESLint ignores, and the tsconfig exclude
   open `supabase/functions/**` and nothing else. The key itself lives in the Edge
   runtime environment, injected by the platform — never in source.
5. **Single-purpose**: the function does one privileged thing; authorization decisions and
   role assignment stay in the RLS-backed DAL. It never logs or returns the key.

Anything that does not meet all five conditions is a violation of the invariant, not a
second exception.

## Mechanisms reference

The remaining `// SOURCE: docs/harness/README.md (<topic>)` citations in the shipped code
resolve against the mechanisms below. Each entry names the file that implements it — read
that file for the ground truth; the prose here is the *why*.

### Grounding rules (`.claude/rules/`)

- **rsc-client-split rule** (`.claude/rules/rsc-client-split.md`) — the **rsc-client-split**
  convention: Server Components by default; a client component (a `'use client'` file or a
  `*.client.tsx`) must never import the DAL (`lib/dal/**`). Its `paths:` scoping is
  documented as unreliable, so the rule is best-effort context — the hard wall is the write
  guard plus the ESLint boundaries and `dependency-cruiser.js`. It also restates the Cache
  Components constraint (see below): read runtime values outside a cached scope and pass
  tenant/user IDs in.
- **security-invariants rule** (`.claude/rules/security-invariants.md`) — the always-loaded
  rule file that restates the six non-negotiables verbatim for the model: no server-side
  `getSession()`, no service-role key, no `dangerouslySetInnerHTML`, DAL is server-only,
  `proxy.ts` is never the authz boundary, and RLS uses `ENABLE` + `FORCE`. Advisory
  duplication of the hook/lint enforcement so the model rarely trips a gate.

### Cache Components and the stack config

- **cacheComponents: true** (`next.config.ts`) — the stack's `next.config.ts` sets
  `cacheComponents: true`, enabling Next 16 Cache Components / PPR: static shells prerender
  and runtime request data must be read inside Suspense or a `'use cache'` boundary with
  explicit args. This is exactly why the `next build` step in the gate catches prerender
  violations that static analysis cannot see — a runtime read in a cached scope only fails
  at build.

### Supabase clients and the proxy

- **auth redirect contract** (`lib/supabase/proxy.ts`) — `updateSession` runs an
  **optimistic** session-presence redirect: a request that is not under a `PUBLIC_PREFIXES`
  entry (matched on segment boundaries — `/auth` covers `/auth` and `/auth/*` but never
  `/authors`) and carries no verified claims is redirected to `/auth/login`. Claims come
  from `getClaims()` (verified JWT), never the cookie session, and the proxy is **never**
  the authorization boundary (CVE-2025-29927) — real authorization lives in the DAL and RLS.
- **anon-granted RPCs + RLS-public rows are the public read surface** (`lib/supabase/anon.ts`)
  — `createAnonClient()` is a cookie-FREE Supabase client for public reads inside a
  `'use cache'` boundary, where there is **no cookies()**/`headers()` access (the
  cookie-based server client would throw). Running as the anon role is also the correct
  trust model for a public page: the reachable data is exactly the public read surface —
  definer RPCs granted to `anon` plus RLS-public rows — and nothing else. No session is
  persisted (server, per call).

### Generated types

- **generated types are the typed contract; drift = stale schema view**
  (`lib/supabase/database.types.ts`, `tools/check-types-drift.mjs`) — `database.types.ts`
  is produced by `supabase gen types typescript --local --schema public` and is the single
  typed contract the app and tests share. A diff between it and the live schema is a stale
  schema view (a migration landed without regenerating). `pnpm check:types:drift`
  regenerates from the running local stack and fails on any mismatch, self-skipping only
  when no stack is reachable.
- **generated types exemption** (`eslint.config`, `biome.jsonc`, `knip.json`) — because the
  file is machine-generated, it is exempt from Biome, ESLint, and formatting so its upstream
  generator style is preserved byte-for-byte (drift detection must compare against exactly
  what the CLI emits); knip ignores it too.

### RLS isolation harness (`tests/rls/`)

- **user-scoped isolation targets** (`tests/rls/client-factory.ts`) — `ISOLATION_TARGETS`
  is the list that drives the SDK cross-tenant suite. Each target is
  `{ table, ownerColumn, insertProbe, updateProbe?, appendOnly? }` describing one
  owner-scoped table; add one entry per user-owned table as the schema grows and the suite
  probes every entry (SELECT/INSERT/UPDATE/DELETE) for cross-user leakage.
- **RLS test-suite service-role carve-out** (`tests/rls/**`, ESLint
  `harness/rls-no-secrets-off`) — `tests/rls/**` is the ONE place the service-role key is
  read, and only dynamically by name from `process.env`, to seed fixtures for a non-vacuous
  positive control. A razor-scoped ESLint override disables the `no-secrets` entropy rule
  for that path only; the key never appears in app code, and the admin client seeds
  fixtures, never asserts isolation.

### Route-boundary gates (`tools/check-route-boundaries.mjs`)

- **route-boundary coverage; missing restricted/zero states** — the gate requires every
  route family (the app root, each route-group root `app/(x)/`, and each top-level
  UI-owning segment) to ship both `error.tsx` and `not-found.tsx`, so a thrown Server
  Component or `notFound()` lands on a designed restricted/zero state instead of Next's
  unstyled crash. Nearest-boundary semantics: one pair per family, not per leaf.
- **record-segment boundary gate** — `RECORD_TREES` (empty by default) additionally forces
  every dynamic `[id]` segment under a listed tree to ship its OWN `error.tsx` +
  `not-found.tsx`, because a shared record link must land on a segment-owned "back to list"
  state rather than the app-level catch-all two layouts up.

### Statusline

- **statusline surfaces gate state** (`.claude/statusline.mjs`) — the custom statusline
  renders `model | branch±dirty | gate: pnpm validate`: the active model, the git branch
  with a `±N` dirty-file count, and the gate command as a standing reminder (a live
  `pnpm validate` per render would be too slow).

### Security-testing layer (CI)

- **secret scanning** / **secret scanning, pre-commit + CI** (`lefthook.yml`,
  `.github/workflows/gitleaks.yml`) — gitleaks runs in two places: pre-commit via lefthook
  (`gitleaks protect --staged`, self-skipping when the binary is absent) and in CI over full
  history (`fetch-depth: 0`). `.gitleaks.toml` scopes the allowlist; the pre-commit pass is
  the fast net, CI is the authority.
- **SAST as part of the security-testing layer** (`.github/workflows/codeql.yml`; semgrep in
  the `ci-dast` module) — static analysis is CodeQL with the `security-extended` query pack
  (default-on, diff-aware on PR + full nightly) plus, once `ci-dast` is enabled, semgrep over
  `p/security-audit` + `p/secrets` + `p/owasp-top-ten` (the OWASP Top 10 mapping). The same
  module also ships an OWASP ZAP baseline DAST against a deployed staging target.

### a11y lint recalibration

- **a11y scrollable-region lint recalibration** (ESLint `harness/a11y-scrollable-region`) —
  a single-rule override that recalibrates jsx-a11y's strict `no-noninteractive-tabindex`,
  whose default forbids `tabindex` on a non-interactive element and would leave a scrollable
  data region keyboard-unreachable. The block allows a named `role="region"` / `<section>`
  + `tabindex="0"` scroll region, per the W3C ACT scrollable-region rule.

### Human review

- **mandatory human review** — and its longer form, the
  **pre-merge human-review checklist; test-evidence over assertion**
  (`.github/pull_request_template.md`, `.github/CODEOWNERS`) — the PR template
  makes evidence mandatory: it requires the REAL pasted output of `pnpm validate` (and
  `pnpm test:rls` for RLS/DAL/tenant changes, showing fail-closed isolation), a
  prove-don't-claim / test-evidence-over-assertion contract, plus a security checklist.
  CODEOWNERS requires sign-off from the security owners on the auth/data surfaces and the
  harness's own paths, so even an evident tamper needs a human accomplice to land.

### Agent tooling

- **writing tools for agents; corpus grounding** (`tools/mcp/`) — the two local stdio MCP
  servers ground the agent mid-turn: `corpus_search` (over the version-pinned corpus at
  `tools/mcp/corpus/index.json`) resolves `[corpus: <id>]` references with no network, and
  `rls_verify` probes cross-tenant isolation inside a read-only, always-rolled-back
  transaction. Both return an honest `NO_MATCH` / `SKIPPED` rather than a fabricated result.

### The Stop gate and the CI floor

- **the Stop gate defines done; CI floor** — restated for completeness: the Stop hook runs
  `STOP_HOOK_STEPS` directly (`node tools/validate.mjs` plus the RLS and unit suites), so
  the Stop gate defines done locally; CI re-runs the same chain via
  `node tools/validate.mjs --min-floor`, so a locally weakened config cannot weaken the CI
  floor. See "The validate contract" and "Tamper evidence (honest limits)" above for the
  full treatment.
