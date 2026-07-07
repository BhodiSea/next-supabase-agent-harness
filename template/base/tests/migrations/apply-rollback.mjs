#!/usr/bin/env node
// Migration apply-integrity gate. `supabase db reset` re-applies EVERY migration from a clean database,
// proving the forward path is internally coherent and re-runnable. Down-migration/rollback is explicitly
// out of scope while migrations are forward-only by convention here (no down scripts). Self-skips without
// the CLI or a migrations dir; CI runs it after `supabase start`, guarded by hashFiles(supabase/migrations).
// SOURCE: docs/harness/README.md (migration apply integrity belongs in CI)
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'

if (!existsSync('supabase/migrations')) {
  process.stdout.write('test:migrations — no supabase/migrations; skipping.\n')
  process.exit(0)
}

function cliAvailable() {
  try {
    execSync('supabase --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

if (!cliAvailable()) {
  process.stdout.write(
    'test:migrations — supabase CLI unavailable; skipping (CI runs this with a stack).\n',
  )
  process.exit(0)
}

try {
  execSync('supabase db reset', { stdio: 'inherit' })
} catch {
  process.stderr.write(
    'test:migrations — `supabase db reset` failed: migrations do not apply cleanly from scratch.\n',
  )
  process.exit(1)
}
process.stdout.write('test:migrations — all migrations applied cleanly from a clean database.\n')
process.exit(0)
