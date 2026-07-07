# 0000 — <Title>

- **Status:** Proposed | Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Slice:** <feature-name>

## Context

What problem does this slice solve, and what constraints (security invariants,
tenancy, Cache Components rules, regulatory, performance) bound the decision?

## Decision

The decision that was made, stated plainly.

## Alternatives Considered

- **Alternative A** — why it was rejected.
- **Alternative B** — why it was rejected.

## Consequences

Positive and negative consequences, trade-offs accepted, and any follow-up work or
risks created by this decision.

## Sources

Version-pinned authoritative references behind the non-trivial choices in this slice.
Every inline `// SOURCE:` in the slice MUST appear here.

- <https://example.com/doc#anchor> — what it backs.

## Traceability

The RTM fragment: requirement -> implementation files -> test ids.

| Requirement | Migration / DAL / RSC files | pgTAP / Vitest test ids |
| ----------- | --------------------------- | ----------------------- |
| R1: ...     | `supabase/migrations/...`, `lib/dal/<feature>.ts`, `app/<feature>/page.tsx` | `<feature>.rls.test.sql::...`, `<feature>.test.ts > ...` |
