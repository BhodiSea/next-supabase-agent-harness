# Security policy

## Reporting a vulnerability

Please report vulnerabilities **privately** via GitHub Security Advisories:
open a draft advisory against `{{GITHUB_OWNER}}/{{PROJECT_SLUG}}`
(Repository → Security → Advisories → "Report a vulnerability").
Do not open public issues or PRs for security problems.

We aim to acknowledge reports within 5 business days.

### What to include

- A minimal reproduction (affected route/module, request/response, or SQL).
- Impact assessment: what data or capability the flaw exposes, and to whom.
- **Never include secrets in a report** — no service-role keys, no `.env` contents,
  no production JWTs. Redact tokens from reproductions; a placeholder is enough.

### Scope notes

- Row Level Security (RLS) is the primary data-isolation boundary; cross-tenant reads
  or writes that bypass RLS are always in scope and treated as highest severity.
- `proxy.ts` performs optimistic session-presence checks only; reports that it can be
  bypassed are expected behavior — authorization lives in the DAL
  (see `docs/harness/README.md`).

## Supported versions

Only the latest commit on the default branch is supported. There are no maintained
release lines; fixes land on the default branch and are not backported.
