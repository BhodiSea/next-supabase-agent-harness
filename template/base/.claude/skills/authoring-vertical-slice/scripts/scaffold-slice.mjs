#!/usr/bin/env node
// Scaffolds the empty file skeleton for a vertical slice (flat repo layout).
// Usage: node .claude/skills/authoring-vertical-slice/scripts/scaffold-slice.mjs <feature>
// Idempotent: writes a file only when it does not already exist. Node built-ins only.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
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

const files = [
  [
    join(base, 'supabase', 'migrations', `${ts}_${feature}.sql`),
    '-- SOURCE: references/migration-rls.md\n' +
      '-- ENABLE + FORCE ROW LEVEL SECURITY; per-operation (select auth.uid()) initPlan policies.\n',
  ],
  [
    join(base, 'lib', 'dal', `${feature}.ts`),
    "import 'server-only'\n" +
      '// SOURCE: references/dal-dto-serveronly.md\n' +
      '// Return narrowed DTOs; authz via getClaims()/getUser(); no service_role.\n',
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

for (const [path, body] of files) {
  mkdirSync(dirname(path), { recursive: true })
  if (existsSync(path)) {
    console.log('exists, skipped:', path)
    continue
  }
  writeFileSync(path, body)
  console.log('scaffolded:', path)
}
