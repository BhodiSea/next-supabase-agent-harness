#!/usr/bin/env node
// Gated-route adoption gate (OPT-IN — enable the 'gated-routes' step in tools/harness.config.mjs):
// (1) DISCOVERY — every app/** page/layout that role-gates (matches GATE_CALL from the manifest)
// must appear in the manifest or its exemptions, so a new role-gated route is born accountable;
// (2) per manifest entry, the files' union must render a designed restricted state (RESTRICTED_SIGNAL:
// an access-state import or an AccessResult forbidden branch);
// (3) the `notFound()`-on-role-check one-liner is banned in manifest files. Fails `pnpm validate`.
// SOURCE: docs/harness/README.md (gated-route restricted-state gate);
// tools/check-aliveness-adoption.mjs (the union-scan checker this mirrors).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  GATE_CALL,
  GATED_ROUTE_EXEMPTIONS,
  GATED_ROUTES,
  RESTRICTED_SIGNAL,
} from './gated-routes-manifest.mjs'

// The canonical lying-404 shape: a negated role check whose direct consequence is notFound().
// Tolerates comment lines between the check and the call (an evasion the naive regex missed) but
// NOT intervening statements — `return <RestrictedState/>` followed by a later missing-row 404
// is the correct pattern and must not trip this. Keep the helper names in sync with GATE_CALL
// in the manifest when you rename them.
const NOTFOUND_ON_ROLE =
  /!(?:hasAnyRole|requireClientScope)\([^)]*\)\)?\s*\{?\s*(?:\/\/[^\n]*\n\s*)*(?:return\s+)?notFound\(\)/
// AccessResult consumed as a blanket 404: the page calls notFound() on `!x.ok` without ever
// branching `reason === 'forbidden'` — the role check lives in the DAL, so GATE_CALL discovery
// misses these. A forbidden caller must get a designed restricted state, never a lying 404.
const BLANKET_NOTFOUND = /!\w+\.ok\b[^}]{0,80}?notFound\(\)/

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, found)
    else if (/^(page|layout)\.tsx$/.test(entry)) found.push(p)
  }
  return found
}

const failures = []
const listed = new Set(GATED_ROUTES.flatMap((e) => e.files))

// (1) discovery — two signals: an explicit role check in the file, or an AccessResult consumed
// as a blanket notFound() with no forbidden branch (the DAL-gated variant of the same hole).
for (const file of walk('app')) {
  const src = readFileSync(file, 'utf8')
  const exempt = listed.has(file) || GATED_ROUTE_EXEMPTIONS.has(file)
  if (GATE_CALL.test(src) && !exempt) {
    failures.push(
      `${file}: role-gated route not in tools/gated-routes-manifest.mjs (add it, or exempt with a reason)`,
    )
  }
  if (BLANKET_NOTFOUND.test(src) && !/reason === 'forbidden'/.test(src) && !exempt) {
    failures.push(
      `${file}: notFound() on !result.ok with no reason === 'forbidden' branch — a forbidden caller gets a lying 404`,
    )
  }
}

// (2) + (3) per entry
for (const entry of GATED_ROUTES) {
  let union = ''
  for (const file of entry.files) {
    if (!existsSync(file)) {
      failures.push(`${entry.label}: listed file missing — ${file}`)
      continue
    }
    const src = readFileSync(file, 'utf8')
    union += src
    if (NOTFOUND_ON_ROLE.test(src)) {
      failures.push(`${file}: notFound() on a role check — render RestrictedState (${entry.label})`)
    }
  }
  if (!RESTRICTED_SIGNAL.test(union)) {
    failures.push(
      `${entry.label}: no restricted state — the files' union must match RESTRICTED_SIGNAL (import the access-state primitive or branch reason === 'forbidden')`,
    )
  }
}

if (failures.length === 0) {
  console.log(
    `gated-routes: OK — ${String(GATED_ROUTES.length)} gated route group(s) render designed restricted states.`,
  )
  process.exit(0)
}
console.error(
  `gated-routes: ${String(failures.length)} failure(s):\n  - ${failures.join('\n  - ')}`,
)
process.exit(1)
