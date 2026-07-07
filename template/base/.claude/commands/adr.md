---
description: Emit an Architecture Decision Record for the current feature slice.
argument-hint: "[slice-name]"
allowed-tools: Read, Grep, Glob, Write, Bash
---

Today's date (the command engine does NOT expand `$(...)`, so use this inline line):

!`date +%Y%m%d`

Write an ADR to `docs/adr/<YYYYMMDD>-$1.md` (use the date printed above as `<YYYYMMDD>`)
from the template at `docs/adr/0000-adr-template.md`. Fill in every section:

- **Context** — the problem and constraints driving this slice.
- **Decision** — what was chosen.
- **Alternatives Considered** — what was rejected and why.
- **Consequences** — trade-offs, follow-ups, risks.
- **Sources** — every authoritative reference (version-pinned URLs / ADR ids) behind
  the non-trivial choices in this slice.
- **Traceability** — the RTM fragment: requirement -> migration / DAL / RSC files ->
  pgTAP / Vitest test ids.

Then cross-check: every inline `// SOURCE:` in the slice MUST appear in the ADR
**Sources** list. Grep the changed files for `// SOURCE:` and reconcile.
