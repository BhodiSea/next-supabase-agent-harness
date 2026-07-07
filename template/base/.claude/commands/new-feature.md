---
description: One-turn vertical-slice entry point (migration -> RLS -> DAL -> RSC -> tests -> provenance -> green gate).
argument-hint: "[feature-name]"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
model: opus
---

Build the feature **$1** as a complete vertical slice in a single turn.

Use the `authoring-vertical-slice` skill and follow its locked order EXACTLY:
migration + RLS -> DAL -> RSC -> tests -> provenance -> green gate.

Delegate each layer to its specialist subagent:

- schema / migration + RLS -> `migration-rls-author`
- the DAL (`lib/dal/$1.ts`) -> `dal-author`
- the test suite -> `test-author`

The MAIN THREAD runs the scaffold (the `dal-author` subagent has no Bash):

```
node .claude/skills/authoring-vertical-slice/scripts/scaffold-slice.mjs $1
```

For invariant-touching work (auth, RLS, migrations, caching), it is strongly
recommended to write `specs/$1.md` first and get sign-off before implementing.

Before you finish (provenance is REQUIRED — the turn is not done without it):

- run the `torvalds-reviewer` subagent and require `VERDICT: SHIP`;
- run the `security-reviewer` if RLS / migrations / the DAL / `proxy.ts` / a
  `'use cache'` boundary changed;
- emit and verify the ADR — run `/adr $1` FIRST (so the ADR Sources list is itself
  verified), THEN run `/verify-citations` and require `CITATIONS: CLEAN`.

Every non-trivial decision carries `// SOURCE:`. The turn ends ONLY when
`pnpm validate` is green (and, once they exist, `pnpm test:rls` / `pnpm test`).
The Stop hook enforces this — do not stop on a red build.

Current working tree for context: !`git status --short`
