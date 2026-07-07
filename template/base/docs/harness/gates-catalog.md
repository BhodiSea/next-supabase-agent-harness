# Gates catalog

Companion to [the harness doctrine](./README.md). Lists every gate the template ships
default-on, every opt-in module, worked examples of project-specific gate patterns worth
rebuilding, and the gates we considered and rejected (so you don't re-litigate them).

## Default-on gates

`pnpm validate` runs these in order; the Stop hook (`stop-validate-gate.mjs`) runs
`pnpm validate` plus the two runtime suites at the bottom. All of it re-runs in CI — CI is
the floor, hooks are the fast path.

| Gate | Command | What it catches |
|---|---|---|
| format | `biome check .` | formatting, import order, a fast correctness lint |
| types | `tsc --noEmit` | TypeScript strict errors across the whole tree |
| lint | `eslint .` | type-aware rules, framework rules, security rules, and the `harness/*` design-system blocks |
| provenance | `node tools/check-sources.mjs` | decision sites (RLS strings, auth calls, cache directives, tuning constants) missing an inline `// SOURCE:` |
| route-boundaries | `node tools/check-route-boundaries.mjs` | route families missing an `error.tsx` / `not-found.tsx`, so a thrown Server Component lands on a designed state, not an unstyled crash (nearest-boundary semantics — one pair per family, not per leaf) |
| aliveness | `node tools/check-aliveness-adoption.mjs` | modules listed in `tools/aliveness-manifest.mjs` dropping a required interaction-kit import (bidirectional: files must exist, imports must appear) |
| dead-code | `knip --strict` | unused files, exports, and dependencies |
| architecture | `depcruise ... --config dependency-cruiser.js` | layering violations (client → DAL imports, server-only walls, dependency cycles) |
| build | `next build` | Cache Components prerender violations that no static check sees (runtime reads inside `'use cache'` scopes) [corpus: nextjs@16/use-cache-runtime-apis] |
| rls (Stop hook + CI) | `pnpm test:rls` | cross-tenant isolation: the pgTAP/isolation suite proving RLS policies actually deny; self-skips before a schema exists |
| unit (Stop hook + CI) | `pnpm vitest run --silent` | the behavioral net, including the manifest-driven tests described below |

## Opt-in modules

Enable a module by uncommenting its entry in `tools/harness.config.mjs`, or run
`npx next-supabase-agent-harness enable <module>` which does the same plus copies any
module files into place.

| Module | What it adds | Why it is not default-on |
|---|---|---|
| `gate-styleguide` | `tools/check-styleguide-manifest.mjs`: `components/ui/*.tsx` and a `primitive-manifest.ts` must never drift apart, keeping a `/styleguide` page a living source of truth (surfaces zero-adoption primitives, blocks invisible new ones) | requires a `/styleguide` route and a primitives manifest your project has to build first |
| `gate-gated-routes` | `tools/check-gated-routes.mjs` + `tools/gated-routes-manifest.mjs`: every role-gated page/layout must appear in the manifest, render a designed restricted state, and never `notFound()` on a role check | keyed to your project's role-gate call names (e.g. `hasAnyRole(`), which don't exist until you write them |
| `mutation` | StrykerJS: a nightly full run (`stryker.config.mjs`) plus a per-PR incremental gate (`stryker.incremental.mjs`) narrowed to critical modules | mutation runs are minutes-to-hours; only pays off once there is money/authz logic worth mutating (see the worked example) |
| `ci-provenance` | SLSA build provenance (`actions/attest-build-provenance`, Build L2 out of the box) + CycloneDX/SPDX SBOM attestation in CI | only meaningful once you publish/deploy artifacts a downstream consumer verifies |
| `ci-dast` | a scheduled OWASP ZAP baseline scan against a deployed preview URL | needs a deployed target; noisy before the app has stable routes |
| `ci-lighthouse` | Lighthouse CI performance/a11y budgets on key routes | budgets are project-specific; a default budget is either vacuous or wrong |

## Patterns worth rebuilding in your project

These gates are inherently project-specific — the template can't ship them generically,
but each earned its keep in production. One worked example each.

### (a) Design-system lint blocks (mutually-exclusive `no-restricted-syntax` scopes)

Split the tree into **mutually exclusive** ESLint config blocks so each area gets exactly
one rule set and exemptions are structural, not inline-disable comments:

- `harness/ds-app` — `files: ['app/**/*.tsx', 'components/**/*.tsx']`,
  `ignores: ['app/(marketing)/**', 'components/marketing/**', 'components/ui/**']`
- `harness/ds-marketing` — the marketing tree only (same bans, minus the ones that are
  marketing's job)
- `harness/ds-ui` — `files: ['components/ui/**/*.tsx']`: **no raw-control ban here**,
  because the primitives legitimately wrap the raw elements; instead it bans what a
  primitive must never do (adopt the marketing display face, hard-code raw motion
  durations instead of the house tokens).

The signature rule — product code must use the design-system primitives, because a raw
control silently drops the focus ring, touch-target floor, and variant tokens:

```js
'no-restricted-syntax': [
  'error',
  {
    message:
      'Use the <Input> (text) or <Checkbox> primitive from @/components/ui — a raw <input> drops the design focus-visible ring + touch floor. (type="hidden" is exempt.)',
    selector:
      "JSXOpeningElement[name.name='input']:not(:has(JSXAttribute[name.name='type'][value.value='hidden']))",
  },
  {
    message:
      'Use the <Button> primitive from @/components/ui — a raw <button> drops the focus ring, variants, and active/disabled tokens.',
    selector: "JSXOpeningElement[name.name='button']",
  },
]
```

The pattern generalizes: any "always use the wrapper" convention becomes an AST selector
ban in the consuming scopes and an exemption in the wrapper's own scope.

### (b) The nav route-manifest test

A Vitest test (`tests/nav/route-manifest.test.ts` in the source project) that walks
`app/**` for `page.tsx` files (route groups `(x)` contribute no URL segment) and asserts,
**analysing pages as source text — never importing them** (they pull `next/headers` and
the DAL):

1. every page in the authenticated area exports a titled `metadata` /
   `generateMetadata` — and every `not-found.tsx` names its tab, because recovery states
   are routes too;
2. every route is **reachable** from the nav or command-palette data: an exact `href`
   match, or prefix-vouched by an href with ≥ 2 path segments (the depth guard stops the
   root dashboard entry from vacuously vouching for the whole tree);
3. a nav item's static title agrees with its label; any allowlist of exceptions is
   **self-pruning** (an entry must still match the live label+title exactly) and starts
   **empty**.

Result: a new route can never ship orphaned or unnamed. The walker + data-file imports
make it pure unit-test speed — no server needed.

### (c) The guard-adoption test

A manifest-driven source scan (`tests/authoring/guard-adoption.test.ts` in the source
project) that pins "which modules must keep their save-protection imports":

```ts
const GUARDED_MODULES: { file: string; requires: string[] }[] = [
  { file: 'components/editor/editor.client.tsx', requires: ['@/lib/ui/use-unsaved-guard'] },
  { file: 'components/forms/long-form.client.tsx', requires: ['@/lib/ui/use-form-draft', '@/lib/ui/use-unsaved-guard'] },
]

it.each(GUARDED_MODULES)('$file keeps its guard/draft imports', ({ file, requires }) => {
  const source = readFileSync(path.join(ROOT, file), 'utf8')
  for (const spec of requires) expect(source).toContain(spec)
})
```

Plus one assertion that the shared guard engine never drops its loss-window listeners
(`pagehide`, `visibilitychange`, `popstate`). The point: "silent work loss" regressions
become a red test the moment a refactor drops an import, without any runtime harness.
The same union-scan shape powers `tools/check-aliveness-adoption.mjs`.

### (d) The public-bucket URL helper

For a public-read Supabase Storage bucket, build object URLs by **pure string
construction** — no client, no network — so one helper runs on the server AND the client
and returns `null` instead of throwing when config is absent:

```ts
// SOURCE: https://supabase.com/docs/guides/storage/serving/downloads#public-buckets (public object URL shape)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const PUBLIC_MEDIA_BUCKET = 'public-media'

export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path || !SUPABASE_URL) return null
  return `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${path}`
}
```

Pair it with server-side upload validation (magic-byte sniff + size cap — extension and
Content-Type are spoofable) and random-UUID object names so public listing leaks nothing
enumerable.

### (e) Narrowing `stryker.incremental.mjs` to money/authz-critical modules

Run full mutation testing nightly; per-PR, import the nightly config and narrow `mutate`
to the modules where a surviving mutant is an incident, with a hard break threshold:

```js
import base from './stryker.config.mjs'

export default {
  ...base,
  mutate: [
    'lib/dal/billing.ts',
    'lib/authz/**/*.ts',
    '!lib/**/*.test.ts',
  ],
  thresholds: { break: 80, high: 90, low: 80 },
}
```

Rollout discipline: keep the per-PR job advisory (`continue-on-error`) until a measured
local run confirms the listed modules clear the threshold; only then let it block.

## Considered and rejected

Recorded so the next maintainer doesn't re-litigate them:

- **ts-prune** — superseded: `knip --strict` covers unused exports, files, and
  dependencies in one maintained tool.
- **publint / arethetypeswrong / syncpack** — package-publishing and monorepo-version
  gates; this template ships an app, not a published package or workspace.
- **lockfile-lint** — low incremental signal over pnpm's strict lockfile + Corepack
  pinning + CI frozen-lockfile installs.
- **type-coverage** — a percentage metric on top of `strict` invites gaming; the
  type-aware ESLint rules already ban the specific escapes (`any`, unsafe casts) directly.
- **markdownlint** — prose formatting is Prettier's job; a docs lint gate adds churn
  without catching real defects.
- **reproducible-build gate** — Next.js build outputs are not byte-reproducible (build
  IDs, timestamps), so the gate cannot be honestly green; attestation (`ci-provenance`)
  is the achievable claim.
- **SLSA Build L3** — requires moving the build into an isolated reusable workflow;
  right for a regulated release train, overkill as a template default. `ci-provenance`
  ships L2 and documents the upgrade path.
- **Deterministic same-turn test-edit bans** — a hook cannot distinguish reward-hacking
  (weakening a test to pass a fix) from legitimate feature work (code + tests in one
  turn). Kept as a review-time rule in the validate contract plus mutation testing, which
  catches the damage rather than the act.
