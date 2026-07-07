# Provenance & citeability (always loaded)

SOURCE: docs/harness/README.md (provenance rule)

- Every non-trivial design decision in generated code carries an inline
  `// SOURCE: <authoritative URL or ADR id>` on or above the decision line.
- Decision sites include: RLS policy choices, auth patterns, cache directives
  (`use cache`, `revalidate`, `cacheLife`), retry/timeout/rate-limit constants, and
  any security trade-off.
- A PostToolUse hook flags unsourced decision sites; the `citation-verifier` subagent
  rejects hallucinated or unresolvable citations. Emit an ADR per feature via `/adr`,
  then run `/verify-citations` until it returns `CITATIONS: CLEAN`.
- Reproducibility (secondary): CI emits SLSA build provenance via
  `actions/attest-build-provenance` and an SBOM; reference these where CI touches the slice.
