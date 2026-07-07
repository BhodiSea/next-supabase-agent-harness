#!/usr/bin/env node
// Route-boundary coverage gate. Every route family — the app root, each route-group
// root app/(x)/, and each top-level segment under app/ that renders UI — must ship BOTH an error.tsx
// and a not-found.tsx, so a thrown Server Component / notFound() lands on a designed state instead of
// Next's unstyled crash/404. Nearest-boundary semantics: sub-routes inherit their family's boundary,
// so this does NOT require a file per leaf (that would be dozens of noise files). Fails `pnpm validate`.
// SOURCE: docs/harness/README.md (route-boundary coverage; missing restricted/zero states);
// Next.js error.js / not-found.js conventions.
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const APP_DIR = 'app'
// Segments with no UI surface (HTTP route handlers only) — a boundary would never render.
const EXEMPT = new Set(['api'])
// A directory "owns UI" (and so is a boundary-bearing family) if it declares any of these.
const OWNS = ['page.tsx', 'layout.tsx', 'error.tsx', 'not-found.tsx']

function ownsUi(dir) {
  return OWNS.some((f) => existsSync(path.join(dir, f)))
}

function families() {
  const roots = [APP_DIR] // the app root is always a family
  for (const entry of readdirSync(APP_DIR)) {
    const dir = path.join(APP_DIR, entry)
    if (!statSync(dir).isDirectory() || EXEMPT.has(entry)) continue
    const isGroup = entry.startsWith('(') && entry.endsWith(')')
    if (isGroup || ownsUi(dir)) roots.push(dir)
  }
  return roots
}

// Record trees: a record link gets shared into chat — a forbidden/missing/broken RECORD must land
// on a designed state owned by ITS OWN segment (back-to-list copy), not the app-level catch-all two
// layouts up. Every dynamic ([id]) segment with a page.tsx under these trees ships both boundaries;
// static children (e.g. a sub-view of the record) correctly inherit their parent record's boundary.
// Add your record-bearing trees, e.g. 'app/crm', so every [id] segment ships its own
// error/not-found.
// SOURCE: docs/harness/README.md (record-segment boundary gate)
const RECORD_TREES = []

function recordSegments(root, found = []) {
  if (!existsSync(root)) return found
  for (const entry of readdirSync(root)) {
    const dir = path.join(root, entry)
    if (!statSync(dir).isDirectory()) continue
    if (/^\[.+\]$/.test(entry) && existsSync(path.join(dir, 'page.tsx'))) found.push(dir)
    recordSegments(dir, found)
  }
  return found
}

const missing = []
for (const dir of [...families(), ...RECORD_TREES.flatMap((t) => recordSegments(t))]) {
  for (const boundary of ['error.tsx', 'not-found.tsx']) {
    if (!existsSync(path.join(dir, boundary))) missing.push(path.join(dir, boundary))
  }
}

if (missing.length === 0) {
  console.log('route-boundaries: OK — every route family has error.tsx + not-found.tsx.')
  process.exit(0)
}
console.error(
  `route-boundaries: ${String(missing.length)} missing boundary file(s) (add a ~20-line wrapper over ErrorState/NotFoundState):\n  - ${missing.join('\n  - ')}`,
)
process.exit(1)
