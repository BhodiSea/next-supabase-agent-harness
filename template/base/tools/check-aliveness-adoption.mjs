#!/usr/bin/env node
// Aliveness adoption gate. Fails `pnpm validate` if any operational board listed in
// tools/aliveness-manifest.mjs drops a required kit import — so a board can never silently regress
// from an alive surface (select → bulk → peek → keyboard → optimistic + Undo) back to
// look-and-click-only forms. Bidirectional like the styleguide gate: every listed island file must
// exist, and every required import specifier must appear in the union of that entry's files.
// SOURCE: docs/harness/README.md (aliveness adoption manifest); mirrors
// the styleguide-manifest gate (modules/gate-styleguide).
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { ALIVENESS_MANIFEST } from './aliveness-manifest.mjs'

function entryFailures(entry) {
  const failures = []
  const sources = []
  for (const file of entry.files) {
    if (existsSync(file)) sources.push(readFileSync(file, 'utf8'))
    else failures.push(`${entry.label}: listed island file is missing — ${file}`)
  }
  const joined = sources.join('\n')
  for (const spec of entry.requires) {
    if (!joined.includes(`from '${spec}'`)) {
      failures.push(
        `${entry.label}: required kit import absent — ${spec} (expected in one of: ${entry.files.join(', ')})`,
      )
    }
  }
  return failures
}

const failures = ALIVENESS_MANIFEST.flatMap(entryFailures)

if (failures.length === 0) {
  console.log(`aliveness-adoption: OK — ${String(ALIVENESS_MANIFEST.length)} board(s) wired.`)
  process.exit(0)
}

console.error(
  `aliveness-adoption: ${String(failures.length)} adoption regression(s):\n  - ${failures.join('\n  - ')}`,
)
process.exit(1)
