# Architecture Decision Records

One ADR per vertical slice. ADRs capture the *why* behind non-trivial decisions
(security, caching, schema, tenancy) so they are reviewable and reproducible.

## Conventions

- **One ADR per slice.** Emit it with `/adr <slice-name>`.
- **Filename:** `YYYYMMDD-slug.md` (e.g. `20250102-user-invites.md`). The date prefix
  sorts chronologically; the slug matches the slice name.
- **Template:** copy the structure from `0000-adr-template.md` — Status, Context,
  Decision, Alternatives Considered, Consequences, Sources, Traceability.
- **Sources mirror the code.** Every inline `// SOURCE:` comment in the slice MUST
  appear in that slice's ADR **Sources** section, and vice versa. `/adr` cross-checks
  this; `/verify-citations` then resolves each source.

## How the provenance loop closes

The chain runs corpus -> code -> ADR -> verification -> gate
(SOURCE: docs/harness/README.md — the provenance pipeline):

1. **corpus / authority** — a version-pinned authority (Supabase / Next.js / Postgres
   docs, or an internal corpus entry) grounds a decision.
2. **`// SOURCE:`** — an inline comment on the decision line cites that authority.
3. **posttool-source-check hook** — flags any decision site that lacks a
   `// SOURCE:` before the turn can proceed.
4. **`/adr`** — writes the ADR and reconciles its **Sources** list against every inline
   `// SOURCE:` in the slice.
5. **`/verify-citations`** — the `citation-verifier` subagent resolves each source
   (existence + support) and returns `CITATIONS: CLEAN` or `CITATIONS: REJECTED`.
6. **Stop gate** — `pnpm validate` (plus `pnpm test:rls` / `pnpm test` once they exist)
   must be green before the turn ends; the Stop hook enforces it.
