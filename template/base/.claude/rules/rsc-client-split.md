---
paths:
  - "**/*.tsx"
  - "**/app/**/*.ts"
---

# RSC / client split (best-effort scoped; never rely on conditional loading for invariants)

`paths:` scoping is documented as buggy/unreliable — treat this rule as best-effort.
The hard invariants live in security-invariants.md (always loaded) and the hooks/lint.
SOURCE: docs/harness/README.md (rsc-client-split rule)

- Server Components by default; add `'use client'` only for genuine interactivity.
- Client components MUST NOT import from `lib/dal/**` (also enforced by a hook + boundaries).
- Data fetching happens in Server Components / server actions through the DAL.
- Use `use cache` / Cache Components with explicit cache lifetimes; you CANNOT call
  `cookies()`, `headers()`, or read `searchParams` inside a `'use cache'` scope — read
  them outside and pass tenant/user IDs in as explicit arguments (so they join the cache
  key). Annotate the cache choice with `// SOURCE:`.
- a11y: semantic landmarks, labelled controls, focus management; target WCAG 2.2 AA.
