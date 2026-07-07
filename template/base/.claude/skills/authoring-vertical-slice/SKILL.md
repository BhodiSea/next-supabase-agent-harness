---
name: authoring-vertical-slice
description: >
  The migration -> RLS -> DAL -> RSC -> test recipe for shipping one whole feature
  slice through the Next.js 16 + Supabase stack in a single turn. Use when asked to
  add a feature, endpoint, or page end-to-end.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
argument-hint: "[feature-name]"
---

# Authoring a vertical slice

Build the slice in this strict order. Each layer has a lazy reference file — read it
before writing that layer (progressive disclosure keeps context lean). Delegate
non-trivial layers to the named subagent.

1. **Migration + RLS** — read `references/migration-rls.md`. Tables get ENABLE + FORCE
   ROW LEVEL SECURITY; per-operation policies use the `(select auth.uid())` initPlan
   pattern; auth/cohort from `app_metadata`. Delegate to the `migration-rls-author`
   subagent. Migrations land at `supabase/migrations/<timestamp>_<feature>.sql`.
2. **DAL + DTO + server-only** — read `references/dal-dto-serveronly.md`. Module starts
   with `import 'server-only'`; authz via `getClaims()`/`getUser()` (never the
   server-side cookie-session method); return DTOs, not rows; no `service_role`.
   Delegate to the `dal-author` subagent. File at `lib/dal/<feature>.ts`
   (`@/lib/dal/<feature>`).
3. **RSC + a11y** — read `references/rsc-a11y.md`. Server Components by default;
   `'use cache'` boundaries take an explicit tenant/user cache-key arg; client
   components never import `@/lib/dal/**`; Tailwind 4 + shadcn + `cn()`; WCAG 2.2 AA.
   Page at `app/<feature>/page.tsx`.
4. **Tests** — read `references/tests.md`. pgTAP + cross-tenant RLS isolation, Vitest
   unit tests, Playwright + axe. Delegate to the `test-author` subagent. Tests at
   `lib/dal/__tests__/`.
5. **Provenance (REQUIRED — not optional)** — every non-trivial decision gets
   `// SOURCE:`. Then, in this order: (a) emit the ADR via `/adr <feature>` so
   `docs/adr/<YYYYMMDD>-<feature>.md` exists and its Sources list reconciles with the
   inline `// SOURCE:` comments; (b) run `/verify-citations` and require
   `CITATIONS: CLEAN`. Provenance is INCOMPLETE — and you may not advance to step 6 —
   until BOTH the ADR file exists AND citations are CLEAN.
6. **Gate** — finish only when the step-5 ADR exists, `/verify-citations` is CLEAN, and
   `pnpm validate` (and, once they exist, `pnpm test:rls` and `pnpm test`) is green. The
   Stop hook enforces the gate; do not stop on a red build or with provenance incomplete.

## Scaffold

The MAIN THREAD scaffolds the empty skeleton (the `dal-author` subagent has no Bash):

```
node .claude/skills/authoring-vertical-slice/scripts/scaffold-slice.mjs <feature>
```

`<feature>` is a single kebab-case argument (e.g. `release-notes`). The script is
idempotent: it writes a file only if it does not already exist.

## IP boundary

Keep reusable platform abstractions separate from bespoke feature code. Never bake
customer content into shared modules.
