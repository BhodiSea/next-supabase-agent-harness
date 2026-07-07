#!/usr/bin/env node
// PostToolUse / matcher: Edit|Write|MultiEdit — flag non-trivial decision sites that
// lack a // SOURCE: provenance comment. Blocking (exit 2): stderr is fed to the model.
// Only scans files edited this turn; skips tests and harness tooling.
// SOURCE: docs/harness/README.md (posttool-source-check; provenance)
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { readHookInput } from './lib/hookio.mjs'

const input = await readHookInput()
const file = String(input?.tool_input?.file_path ?? input?.tool_input?.path ?? '')
if (!/\.(ts|tsx)$/.test(file) || /\.(test|spec)\.tsx?$/.test(file) || /\/\.claude\//.test(file)) {
  process.exit(0)
}

let src = ''
try {
  src = readFileSync(file, 'utf8')
} catch {
  process.exit(0)
}
const lines = src.split('\n')

// Heuristic decision sites: RLS policy strings, auth calls, cache directives, tuning consts.
const DECISION =
  /(createPolicy|FORCE ROW LEVEL SECURITY|auth\.uid\(\)|getClaims|use cache|cacheLife|revalidate|maxRetries|timeoutMs|rateLimit)/
const flagged = []
lines.forEach((ln, i) => {
  // Only flag decision keywords appearing in CODE, not in comments/JSDoc that merely
  // mention them (e.g. an explanatory comment about getClaims is not a decision site).
  const trimmed = ln.trim()
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
  if (DECISION.test(ln)) {
    const window = lines.slice(Math.max(0, i - 3), i + 1).join('\n')
    if (!/\/\/\s*SOURCE:/.test(window)) flagged.push(`${file}:${i + 1}  ${ln.trim().slice(0, 80)}`)
  }
})
if (flagged.length) {
  process.stderr.write(
    `Provenance gate: the following decision sites lack an inline \`// SOURCE:\` citation.\nAdd \`// SOURCE: <authoritative URL or doc id>\` on/above each, then re-run /verify-citations:\n${flagged.join('\n')}\n`,
  )
  process.exit(2)
}
process.exit(0)
