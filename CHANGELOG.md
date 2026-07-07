# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial extraction of the agent harness: Claude Code hooks (bash-guard,
  write-guard, fast-check, source-check, Stop validate-gate), subagents,
  commands, rules, and the vertical-slice skill.
- Composable ESLint security/quality layer (`harness.eslint.mjs`).
- Gate config single source of truth (`tools/harness.config.mjs`) consumed by
  `pnpm validate`, the Stop hook, and CI.
- Installer CLI: `init` (bootstrap/retrofit/--consume), `update`, `doctor`,
  `enable`/`disable`.
- Minimal `notes` template app that passes the full gate out of the box.
- Supply-chain-hardened CI: SHA-pinned actions, Renovate, actionlint + zizmor,
  osv-scanner, harden-runner, OpenSSF Scorecard, SLSA L2 provenance + SBOM.
