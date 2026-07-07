#!/usr/bin/env node
// Styleguide manifest completeness gate (OPT-IN — enable the 'styleguide' step in
// tools/harness.config.mjs once the prerequisites exist). Prerequisites: a `components/ui/`
// primitives directory and a `components/styleguide/primitive-manifest.ts` data file whose
// entries look like `{ file: 'button', ... }`, rendered by a /styleguide page. The gate fails
// `pnpm validate` if the set of `components/ui/*.tsx` primitives and the manifest ever drift
// apart — so /styleguide stays a LIVING source of truth (it surfaces 0-adoption primitives and
// blocks a new primitive from shipping invisible). Bidirectional: every ui file must be in the
// manifest (minus the documented exempt list), and every manifest entry must name a real file.
// SOURCE: docs/harness/README.md (styleguide as living source of truth)
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const UI_DIR = 'components/ui'
const MANIFEST = 'components/styleguide/primitive-manifest.ts'

// Vendored primitives exempt from the manifest requirement (e.g. a vendored shadcn 'sidebar'
// that is also exempt from house lint/size rules). Kept here, with the gate, so the manifest
// stays pure data.
const EXEMPT = new Set([])

function uiPrimitiveFiles() {
  return readdirSync(UI_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => path.basename(f, '.tsx'))
}

// `file: 'button'` entries → the declared set.
function declaredPrimitives() {
  const src = readFileSync(MANIFEST, 'utf8')
  return new Set([...src.matchAll(/file:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]))
}

const files = uiPrimitiveFiles()
const declared = declaredPrimitives()
const exempt = EXEMPT

const missing = files.filter((f) => !declared.has(f) && !exempt.has(f))
const stale = [...declared].filter((f) => !files.includes(f))

if (missing.length === 0 && stale.length === 0) {
  console.log(
    `styleguide-manifest: OK — ${String(declared.size)} primitives, all components/ui present.`,
  )
  process.exit(0)
}

if (missing.length > 0) {
  console.error(
    `styleguide-manifest: ${String(missing.length)} primitive(s) missing from the manifest (add them to ${MANIFEST} so /styleguide renders them):\n  - ${missing.join('\n  - ')}`,
  )
}
if (stale.length > 0) {
  console.error(
    `styleguide-manifest: ${String(stale.length)} manifest entr(y/ies) name a file that no longer exists in ${UI_DIR}:\n  - ${stale.join('\n  - ')}`,
  )
}
process.exit(1)
