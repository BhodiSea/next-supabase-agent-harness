#!/usr/bin/env node
// Deterministic CI mirror of .claude/hooks/posttool-source-check.mjs — the PostTool hook
// only fires inside Claude Code; this runs the IDENTICAL heuristic over the whole tracked
// tree in `pnpm validate` + CI so unsourced decision sites are caught on every PR, not just
// during an edit. Keep the DECISION regex and the 3-line window in lockstep with the hook.
// SOURCE: docs/harness/README.md (the gate is the enforcement; provenance) [corpus: harness/doctrine]
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

// Same decision keywords the hook flags: RLS policy strings, auth calls, cache directives,
// and tuning constants. Mirror exactly — divergence would make the hook and CI disagree.
const DECISION =
  /(createPolicy|FORCE ROW LEVEL SECURITY|auth\.uid\(\)|getClaims|use cache|cacheLife|revalidate|maxRetries|timeoutMs|rateLimit)/

function trackedSourceFiles() {
  const globs = [
    'app/**/*.ts',
    'app/**/*.tsx',
    'components/**/*.ts',
    'components/**/*.tsx',
    'lib/**/*.ts',
    'lib/**/*.tsx',
    'proxy.ts',
  ]
  const out = execSync(`git ls-files ${globs.join(' ')}`, { encoding: 'utf8' })
  return out
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => !/\.(test|spec)\.tsx?$/.test(f) && !/database\.types\.ts$/.test(f))
}

function flagsFor(file) {
  let src = ''
  try {
    src = readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const lines = src.split('\n')
  const flagged = []
  lines.forEach((ln, i) => {
    const trimmed = ln.trim()
    // Only flag decision keywords in CODE, not comments that merely mention them.
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    if (!DECISION.test(ln)) return
    const window = lines.slice(Math.max(0, i - 3), i + 1).join('\n')
    if (!/\/\/\s*SOURCE:/.test(window)) flagged.push(`${file}:${i + 1}  ${trimmed.slice(0, 80)}`)
  })
  return flagged
}

const flagged = trackedSourceFiles().flatMap(flagsFor)
if (flagged.length) {
  process.stderr.write(
    `Provenance gate (check:sources): ${String(flagged.length)} decision site(s) lack an inline ` +
      '`// SOURCE:` citation. Add `// SOURCE: <authoritative URL or doc id>` on/above each, ' +
      'then re-run /verify-citations:\n' +
      `${flagged.join('\n')}\n`,
  )
  process.exit(1)
}
process.stdout.write('check:sources — all decision sites carry // SOURCE: (0 flagged)\n')
process.exit(0)
