#!/usr/bin/env node
// Generated-types drift gate. Re-generates the Supabase TypeScript types from the running local stack
// and compares them to the committed lib/supabase/database.types.ts — a mismatch means a migration
// landed without regenerating the types. Self-skips when the CLI/stack is unavailable (CI runs this
// only after `supabase start`, guarded by the presence of supabase/migrations).
// SOURCE: docs/harness/README.md (generated types are the typed contract; drift = stale schema view)
// [corpus: supabase/generating-types]
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

const COMMITTED = 'lib/supabase/database.types.ts'

function available(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Only skip when there is genuinely no stack to compare against (no CLI, or no running local stack).
// Once a stack IS up, a `gen types` failure is a REAL failure (a migration broke type generation) and
// must exit 1 — never be swallowed as a skip.
if (!available('supabase --version') || !available('supabase status')) {
  process.stdout.write(
    'check:types:drift — no running supabase stack; skipping (CI gates with a stack).\n',
  )
  process.exit(0)
}

let generated
try {
  generated = execSync('supabase gen types typescript --local --schema public', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch {
  process.stderr.write(
    'check:types:drift — `supabase gen types` failed while the stack is up (a migration likely broke type generation).\n',
  )
  process.exit(1)
}

const norm = (s) => s.replace(/\r\n/g, '\n').trimEnd()
if (norm(generated) !== norm(readFileSync(COMMITTED, 'utf8'))) {
  process.stderr.write(
    `Generated-types drift: ${COMMITTED} is stale vs the live schema. Run \`pnpm gen:types\` and commit.\n`,
  )
  process.exit(1)
}
process.stdout.write('check:types:drift — generated types match the committed file.\n')
process.exit(0)
