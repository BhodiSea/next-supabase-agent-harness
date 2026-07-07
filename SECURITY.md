# Security Policy

## Reporting a vulnerability

Report vulnerabilities privately via
[GitHub Security Advisories](https://github.com/BhodiSea/next-supabase-agent-harness/security/advisories/new).
Do not open public issues for security reports, and never include live
credentials (Supabase service-role keys, access tokens) in a report.

## Supported versions

The latest tagged release and `main` are supported. Installed projects should
run `npx --yes github:BhodiSea/next-supabase-agent-harness update` to pick up
fixes.

## Scope notes

- The harness's guard hooks and permission denies are **tamper-evident, not
  tamper-proof**: a determined agent with shell access can bypass local
  enforcement. CI parity (`tools/validate.mjs --min-floor`), manifest hashing
  (`doctor`), and CODEOWNERS review are the backstops. Reports that "the agent
  can edit its own gate with `HARNESS_ALLOW_SELF_EDIT=1`" describe the
  documented human escape hatch, not a vulnerability.
- Template workflows are stored dotless under `template/` precisely so they
  can never execute in this repository's own Actions context.
