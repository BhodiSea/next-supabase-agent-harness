#!/usr/bin/env node
// Scaffolds the empty file skeleton for a vertical slice (flat repo layout).
// Usage: node .claude/skills/authoring-vertical-slice/scripts/scaffold-slice.mjs <feature>
// Idempotent: writes a file only when it does not already exist. Node built-ins only.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'

const [, , feature = 'feature'] = process.argv

if (!/^[a-z][a-z0-9-]*$/.test(feature)) {
  process.stderr.write(
    `invalid feature name: ${JSON.stringify(feature)} (expected /^[a-z][a-z0-9-]*$/)\n`,
  )
  process.exit(1)
}

const base = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)

// Idempotency for the migration: its filename embeds a fresh timestamp each run, so an
// existsSync check on the new name never matches. Skip if ANY migration already ends in
// _<feature>.sql, so re-running the scaffold does not plant duplicate stub migrations.
const migDir = join(base, 'supabase', 'migrations')
const featureMigrationExists = existsSync(migDir)
  ? readdirSync(migDir).some((f) => f.endsWith(`_${feature}.sql`))
  : false

const files = [
  [
    join(base, 'supabase', 'migrations', `${ts}_${feature}.sql`),
    '-- SOURCE: references/migration-rls.md\n' +
      '-- ENABLE + FORCE ROW LEVEL SECURITY; per-operation (select auth.uid()) initPlan policies.\n',
    // Skip when a *_<feature>.sql migration already exists (idempotency across re-runs).
    featureMigrationExists,
  ],
  [
    join(base, 'lib', 'dal', `${feature}.ts`),
    "import 'server-only'\n" +
      '// SOURCE: references/dal-dto-serveronly.md\n' +
      // Avoid the literal admin-key token in the stub: the write-guard denies any later
      // full-file Write whose content contains it, which would block editing this stub.
      '// Return narrowed DTOs; authz via getClaims()/getUser(); no admin (RLS-bypassing) keys.\n',
  ],
  [
    join(base, 'app', feature, 'page.tsx'),
    '// Server Component. Fetch via the DAL. No "use client" unless interactive.\n' +
      'export default async function Page() {\n  return null\n}\n',
  ],
  [
    join(base, 'lib', 'dal', '__tests__', `${feature}.rls.test.sql`),
    '-- pgTAP cross-tenant isolation: tenant A must read ZERO of tenant B rows (assert 0).\n',
  ],
  [
    join(base, 'lib', 'dal', '__tests__', `${feature}.test.ts`),
    "import { describe, expect, it } from 'vitest'\n\n" +
      `describe('${feature} DAL', () => {\n` +
      "  it.todo('maps rows to DTO and handles undefined branches')\n})\n",
  ],
]

for (const [path, body, skip] of files) {
  mkdirSync(dirname(path), { recursive: true })
  if (skip || existsSync(path)) {
    console.log('exists, skipped:', path)
    continue
  }
  writeFileSync(path, body)
  console.log('scaffolded:', path)
}
