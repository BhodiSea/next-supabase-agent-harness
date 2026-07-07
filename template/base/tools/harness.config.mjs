// tools/harness.config.mjs — the single source of truth for the quality gate.
// Consumed by tools/validate.mjs (`pnpm validate`), the Stop hook, and CI, so the three
// enforcement layers can never disagree about what "done" means.
//
// HARNESS-PROTECTED: the write-guard hook denies agent edits to this file unless
// HARNESS_ALLOW_SELF_EDIT=1 is set, and CI re-runs the same steps with a hardcoded
// floor (`node tools/validate.mjs --min-floor`) — so editing this config can ADD
// steps but can never weaken the non-negotiable ones.
// SOURCE: docs/harness/README.md (the gate config is harness-protected and mirrored in CI) [corpus: harness/doctrine]

// Each step is [name, shellCommand]. Steps run sequentially; the first failure stops the run.
export const VALIDATE_STEPS = [
  ['format', 'pnpm exec biome check .'],
  ['types', 'pnpm exec tsc --noEmit'],
  ['lint', 'pnpm exec eslint .'],
  ['provenance', 'node tools/check-sources.mjs'],
  ['route-boundaries', 'node tools/check-route-boundaries.mjs'],
  ['aliveness', 'node tools/check-aliveness-adoption.mjs'],
  ['dead-code', 'pnpm exec knip --strict'],
  [
    'architecture',
    'pnpm exec depcruise app components lib proxy.ts --config .dependency-cruiser.js',
  ],
  ['build', 'pnpm exec next build'],
  // Opt-in gates — uncomment after installing the matching module and its prerequisites
  // (see docs/harness/gates-catalog.md for what each gate needs before it can pass):
  // ['styleguide', 'node tools/check-styleguide-manifest.mjs'],
  // ['gated-routes', 'node tools/check-gated-routes.mjs'],
]

// What the Stop hook runs before a turn may end. `pnpm validate` executes VALIDATE_STEPS
// above; the runtime suites (RLS isolation + unit) sit outside validate so `pnpm validate`
// stays runnable without a database.
export const STOP_HOOK_STEPS = [
  ['validate', 'pnpm validate'],
  ['rls-isolation', 'pnpm test:rls'],
  ['unit', 'pnpm vitest run --silent'],
]
