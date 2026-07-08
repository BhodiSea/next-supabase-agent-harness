# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-08

First public release.

### Added

- Initial extraction of the agent harness: Claude Code hooks (bash-guard,
  write-guard, fast-check, source-check, Stop validate-gate), 7 subagents,
  3 commands, rules, and the vertical-slice skill.
- Composable ESLint security/quality layer (`harness.eslint.mjs`): typescript-eslint
  strictTypeChecked, security plugins, no-getSession/no-service-role/no-dangerouslySetInnerHTML
  selectors, architecture boundaries, 200-line file / 50-line function limits.
- Gate config single source of truth (`tools/harness.config.mjs`) consumed by
  `pnpm validate`, the Stop hook, and CI so the three enforcement layers never drift.
- Installer CLI: `init` (bootstrap/retrofit/--consume), `update`, `doctor`,
  `enable`/`disable`, with 32 self-tests (installer lifecycle + hook exit-code contracts).
- Minimal `notes` template app (login → protected RSC → server-only DAL → RLS'd table
  with pgTAP tests) that passes all 9 validate gates out of the box.
- Provenance pipeline: inline `// SOURCE:` citations resolved against a version-pinned
  corpus via the local `corpus_search` MCP server; `citation-verifier` subagent; `/adr`.
- `rls_verify` MCP server: mid-turn cross-tenant isolation probe with a seeded positive
  control (never reports a vacuous probe green).
- Supply-chain-hardened CI: SHA-pinned actions, Renovate (5-day cooldown), actionlint +
  zizmor, osv-scanner, step-security/harden-runner, OpenSSF Scorecard, and an opt-in
  SLSA L2 provenance + SBOM module.

### Security

- Tamper-evident gate: the Stop hook invokes the runners directly (not via package.json
  script names); the write-guard protects the gate config, the lint/architecture config
  surface, `.mcp.json`, and permission files (escape hatch `HARNESS_ALLOW_SELF_EDIT=1`);
  CI re-runs a hardcoded floor so a locally-weakened config cannot weaken CI.
- Narrowed `Bash(supabase:*)` to local-stack subcommands; remote operations require `ask`.
