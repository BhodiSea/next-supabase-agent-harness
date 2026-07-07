#!/usr/bin/env node
// Orchestrator behind `pnpm test:rls`. Two layers, each independently guarded:
//   1. DB-backed pgTAP checks (`supabase db reset` + `supabase test db`) — run
//      ONLY when supabase/migrations exists AND a local Supabase stack is
//      reachable. Skipped (not failed) otherwise.
//   2. The SDK isolation suite (`vitest run tests/rls`) — ALWAYS run; it
//      self-skips when unconfigured via an empty ISOLATION_TARGETS / missing env.
// When a local stack is reachable we inject its URL + keys (from `supabase status
// -o env`) so the SDK proof RUNS for real here and in CI, instead of self-skipping.
// Never hangs, never false-greens a real leak: we exit nonzero only if vitest fails.
// SOURCE: docs/harness/README.md (RLS testing doctrine)
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations')

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: repoRoot, env: process.env, stdio: 'inherit' })
}

function tryRun(cmd, args) {
  try {
    run(cmd, args)
    return true
  } catch {
    return false
  }
}

// `supabase db reset` restarts containers, which can flake with a transient upstream 502 under
// local resource pressure (e.g. multiple stacks). Retry once — a real migration error still fails
// both attempts, so this hardens against flakes without masking failures.
function runWithRetry(cmd, args, attempts = 2) {
  for (let i = 1; i <= attempts; i++) {
    try {
      run(cmd, args)
      return
    } catch (err) {
      if (i === attempts) throw err
      console.warn(`[rls] "${cmd} ${args.join(' ')}" failed (attempt ${i}/${attempts}); retrying…`)
    }
  }
}

function stackReachable() {
  // `supabase status` exits 0 only when a local stack is up. Short, non-hanging.
  try {
    execFileSync('supabase', ['status'], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'ignore',
      timeout: 15_000,
    })
    return true
  } catch {
    return false
  }
}

// Inject the local stack's connection env (URL + publishable + service keys) so the SDK suite
// runs for real. Only sets vars not already present, so an explicit external config wins.
function injectStackEnv() {
  let out
  try {
    out = execFileSync('supabase', ['status', '-o', 'env'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 15_000,
    })
  } catch {
    return
  }
  // Read one KEY="value" line from `supabase status -o env` output. Plain string scan (no
  // dynamic regex / computed object access) to stay clear of the security lint sinks.
  const read = (key) => {
    for (const line of out.split('\n')) {
      if (line.startsWith(`${key}=`)) return line.slice(key.length + 1).replace(/^"|"$/g, '')
    }
    return ''
  }
  const url = read('API_URL')
  const pub = read('PUBLISHABLE_KEY')
  const svc = read('SERVICE_ROLE_KEY')
  // Literal-keyed writes only; never override an explicit external config.
  if (url && !process.env['NEXT_PUBLIC_SUPABASE_URL']) process.env['NEXT_PUBLIC_SUPABASE_URL'] = url
  if (pub && !process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] = pub
  if (svc && !process.env['SUPABASE_SERVICE_ROLE_KEY'])
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = svc
}

const haveMigrations = existsSync(migrationsDir)
const reachable = stackReachable()

// Fail closed in CI: once migrations exist the runtime job IS expected to bring the stack up, so a
// skip there would be a false green on the slice's headline gate — not a legitimate pre-schema skip.
if (process.env['CI'] && haveMigrations && !reachable) {
  console.error('[rls] CI with migrations present but Supabase stack unreachable — failing closed')
  process.exit(1)
}

if (haveMigrations && reachable) {
  console.log('[rls] local stack reachable + migrations present — running pgTAP checks')
  runWithRetry('supabase', ['db', 'reset'])
  run('supabase', ['test', 'db'])
  injectStackEnv()
} else {
  console.log(
    '[rls] skipping DB-backed RLS checks (no stack/migrations); running self-skipping SDK suite',
  )
}

// Always run the SDK suite; its exit code is the gate.
const sdkOk = tryRun('pnpm', ['exec', 'vitest', 'run', 'tests/rls'])
if (!sdkOk) {
  console.error('[rls] SDK isolation suite FAILED')
  process.exit(1)
}
console.log('[rls] OK')
process.exit(0)
