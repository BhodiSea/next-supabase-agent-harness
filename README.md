# next-supabase-agent-harness

A deterministic agent harness for **Next.js 16 + Supabase + TypeScript (strict) + pnpm**
projects. It makes "done" mean **green gate**: a Claude Code Stop hook that refuses to end an
agent's turn until the full validation chain passes, security invariants enforced as lint rules
*and* pre-write guards, RLS isolation tests, an inline-citation provenance pipeline verified
against a pinned corpus, and supply-chain-hardened CI.

Packaged once, installable into any new or existing project — so the harness never has to be
rebuilt by hand again.

```sh
# Bootstrap a new project (green out of the box: all 9 gates + build pass immediately)
npx --yes github:BhodiSea/next-supabase-agent-harness init

# Retrofit an existing Next.js + Supabase project (merge, never clobber, diff report)
npx --yes github:BhodiSea/next-supabase-agent-harness init --dir .

# Later
npx --yes github:BhodiSea/next-supabase-agent-harness update   # pull harness fixes
npx --yes github:BhodiSea/next-supabase-agent-harness doctor   # integrity + wiring check
```

Pin installs to a tag for reproducibility: `github:BhodiSea/next-supabase-agent-harness#v0.1.0`.
This repo is also a **GitHub template** ("Use this template" → `pnpm bootstrap` consumes the
checkout into a project in place), and its agents/commands/skill are installable as a **Claude
Code plugin** (`/plugin marketplace add BhodiSea/next-supabase-agent-harness`).

## The three enforcement layers

Prompts are advisory; these are not.

| Layer | When | What |
|---|---|---|
| **Agent-time hooks** | every tool call / turn end | `pretool-bash-guard` (blocks `rm -rf`, force-push, `.env` reads, service-role refs), `pretool-write-guard` (blocks service-role/`dangerouslySetInnerHTML`/server `getSession()`/client→DAL imports; protects the gate's own config), `posttool-source-check` (every decision site needs `// SOURCE:`), and the **Stop validate-gate**: exit 2 until `pnpm validate` + RLS suite + unit tests are green — the turn cannot end on a red build. |
| **Commit-time** | lefthook | prettier/biome on staged files, gitleaks secret scan, commitlint; typecheck + eslint + knip + cspell on pre-push. |
| **CI** | every PR | The identical gate chain via `tools/validate.mjs --min-floor` (a locally-weakened config cannot weaken CI), plus CodeQL, gitleaks full-history, osv-scanner, actionlint + zizmor — all actions SHA-pinned, Renovate-maintained, harden-runner on every job. |

## The gate chain

`pnpm validate` runs `tools/validate.mjs`, driven by a single config
(`tools/harness.config.mjs`) shared by the Stop hook and CI so the three can never drift:

format (biome) → types (`tsc --noEmit`, max strictness) → lint (typescript-eslint
**strictTypeChecked** + security plugins + jsx-a11y strict + architecture boundaries + 200-line
file / 50-line function limits) → provenance (`// SOURCE:` on every decision site) →
route-boundaries (every route family ships `error.tsx` + `not-found.tsx`) → aliveness manifest →
dead-code (`knip --strict`) → architecture (dependency-cruiser: no circulars, no client→DAL, no
service-role anywhere) → `next build` (catches Cache Components prerender violations).

Opt-in modules: `gate-styleguide`, `gate-gated-routes`, `mutation` (StrykerJS), `ci-provenance`
(SLSA L2 + SBOM), `ci-dast` (semgrep + ZAP), `ci-lighthouse`. Enable with
`npx … enable <module>`. Full catalog: [docs/harness/gates-catalog.md](template/base/docs/harness/gates-catalog.md).

## Security invariants (lint + hook enforced)

- Never `supabase.auth.getSession()` server-side — `getClaims()`/`getUser()` only.
- Never the service-role key in app code (lint selector + write guard + dependency-cruiser rule
  + bash guard; the only sanctioned home is an ADR-governed Edge Function).
- Never `dangerouslySetInnerHTML`.
- `proxy.ts` is never the authorization boundary (CVE-2025-29927) — authorize in the server-only
  DAL, which returns DTOs, never raw rows.
- RLS: `ENABLE` + `FORCE`, per-operation policies, `(select auth.uid())` initPlan pattern —
  verified by pgTAP + an SDK cross-tenant isolation suite + a mid-turn `rls_verify` MCP probe.

## Provenance: code you can cite

Every non-trivial decision carries `// SOURCE: <authority> [corpus: <id>]`, resolved against a
version-pinned corpus (`tools/mcp/corpus/index.json`) served by a local MCP server. A PostToolUse
hook flags uncited decisions mid-turn; `tools/check-sources.mjs` mirrors it in CI; the
`citation-verifier` subagent rejects hallucinated citations; `/adr` emits an Architecture
Decision Record per slice with a requirements-traceability table. `CITATION.cff` ships in the
template; this repo is archived per release for DOI citation.

## The agent roster

Seven subagents (`.claude/agents/`): `migration-rls-author`, `dal-author`, `test-author` write;
`security-reviewer`, `torvalds-reviewer`, `accessibility-reviewer`, `citation-verifier` are
**read-only by construction** (`disallowedTools: Write, Edit`). Three commands: `/new-feature`
(one-turn vertical slice: migration → RLS → DAL → RSC → tests → provenance → green gate),
`/adr`, `/verify-citations`.

## Tamper evidence (honest limits)

An agent inside the harness cannot trivially weaken the gate: permission `deny` rules cover
`.claude/hooks/**` and `settings.json`; the write-guard blocks edits to
`tools/harness.config.mjs`, `tools/validate.mjs`, the gate scripts, `lefthook.yml`, and
`.github/workflows/**` unless a human sets `HARNESS_ALLOW_SELF_EDIT=1`; `doctor` hash-verifies
every harness-owned file against `.harness/manifest.json`; CI re-runs the canonical floor
regardless of local config; CODEOWNERS pins the harness paths. This is **tamper-evident, not
tamper-proof** — a determined agent with shell access can bypass local enforcement; CI parity
and review are the backstops. Threat model:
[docs/harness/README.md](template/base/docs/harness/README.md) and
[sandbox-and-supply-chain.md](template/base/docs/security/sandbox-and-supply-chain.md)
(lethal-trifecta posture).

## What an install gives you

112 files: the `.claude/` machinery (settings + 5 hooks + 7 agents + 3 commands + rules + the
vertical-slice skill), the gate configs (biome, eslint layer, knip, dependency-cruiser, tsconfig,
prettier, lefthook, commitlint, gitleaks, cspell, pnpm 11 supply-chain settings), `tools/`
(validate runner, gate scripts, two MCP servers, corpus seed), test harnesses (Vitest, RLS
isolation, migration integrity, Playwright + axe WCAG 2.2 AA), 7 SHA-pinned CI workflows +
Renovate, governance docs (ADR/spec templates, approved-tools registry), and — on bootstrap — a
minimal `notes` app (login → protected page → server-only DAL → RLS'd table with pgTAP tests)
whose every auth/RLS decision site carries a resolving citation.

Bootstrap is verified **green out of the box** in CI: fresh install → `pnpm install` →
`pnpm validate` (all 9 gates incl. `next build`) → RLS suite (self-skips honestly without a local
stack) → unit tests.

## Retrofit semantics

Existing projects are never clobbered: existing scripts keep their names (ours land under
`harness:<name>`, and the Stop hook rebinds itself), existing configs stay (ours land alongside
as `<name>.harness.<ext>` with a conflict report), app code is untouched, and stack files are
additive-only. `src/` layouts are rejected in v1 (every gate assumes root-level `app/ lib/`).

## Requirements

Node ≥ 22, pnpm ≥ 11 (Corepack), Supabase CLI (for the runtime gates), git. Optional:
`gitleaks` binary for the pre-commit scan (self-skips if absent).

## Development (this repo)

See [CONTRIBUTING.md](CONTRIBUTING.md). `node scripts/check-syntax.mjs && node
scripts/hygiene.mjs && node --test "tests/**/*.test.mjs"` — plus the selftest CI matrix
(bootstrap green / retrofit non-clobber / hook exit-code contracts / Supabase runtime job).

## License

Apache-2.0. Cite via [CITATION.cff](CITATION.cff).
