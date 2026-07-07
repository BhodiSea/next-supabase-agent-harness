#!/usr/bin/env node
// rls_verify MCP server — mid-turn cross-tenant isolation probe.
// Connects via `pg` (devDependency) to SUPABASE_DB_URL, drops to an RLS-subject role
// (never superuser), impersonates tenant A via request.jwt.claims, and asserts tenant B's
// rows are invisible. Read-only, always rolled back. Never a false green: anything that
// prevents a real probe returns SKIPPED, and the CI suite (`pnpm test:rls`) stays
// authoritative.
// SOURCE: docs/harness/README.md (mid-turn RLS probe) [corpus: harness/doctrine]
import process from 'node:process'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

// Identifiers must be allow-listed against information_schema before they touch SQL text —
// never interpolate an unvalidated table/column name. Validated names are then double-quoted.
async function assertKnownColumn(client, table, column) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  )
  return rows.length > 0
}

const quoteIdent = (name) => `"${name.replaceAll('"', '""')}"`

async function runProbe(client, { table, tenantColumn, tenantA, tenantB }) {
  await client.query('BEGIN')
  try {
    await client.query('SET TRANSACTION READ ONLY')
    if (!(await assertKnownColumn(client, table, tenantColumn))) {
      return `RLS: SKIPPED (unknown identifier: public.${table}.${tenantColumn} is not in information_schema.columns — refusing to build SQL from it)`
    }
    // Positive control BEFORE dropping privileges: as the (often policy-exempt) login role,
    // confirm tenantB actually owns rows here. Without this, an empty table or a mistyped
    // tenant id would make the probe vacuous and report ISOLATED even with RLS disabled —
    // a false green. Zero baseline rows → SKIPPED, never green.
    // SOURCE: docs/harness/README.md (mid-turn RLS probe) [corpus: harness/doctrine]
    const baseline = await client.query(
      `SELECT count(*)::int AS n FROM ${quoteIdent(table)} WHERE ${quoteIdent(tenantColumn)} = $1`,
      [tenantB],
    )
    if (baseline.rows[0].n === 0) {
      return `RLS: SKIPPED (vacuous probe: ${tenantB} owns no rows in ${table} — seed at least one row for tenantB, or pass a tenant id that owns data)`
    }
    // Row security policies apply to the current role; probe as the RLS-subject role the app
    // uses, never the connection's (often policy-exempt) login role.
    // SOURCE: policies restrict what a role's commands can return [corpus: postgresql/row-security]
    await client.query('SET LOCAL ROLE authenticated')
    // Impersonate tenant A the way Supabase does: auth.uid() reads request.jwt.claims.sub,
    // so policies written with (select auth.uid()) see tenant A for this transaction only.
    // SOURCE: RLS policies keyed on (select auth.uid()) [corpus: supabase/rls-initplan]
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ role: 'authenticated', sub: tenantA }),
    ])
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM ${quoteIdent(table)} WHERE ${quoteIdent(tenantColumn)} = $1`,
      [tenantB],
    )
    const n = rows[0].n
    return n === 0
      ? `RLS: ISOLATED (as ${tenantA}, 0 of ${tenantB}'s rows visible in ${table})`
      : `RLS: LEAK (as ${tenantA}, ${String(n)} of ${tenantB}'s rows visible in ${table} via ${tenantColumn})`
  } finally {
    await client.query('ROLLBACK').catch(() => {}) // read-only + rollback: the probe never persists anything
  }
}

async function rlsVerify(args) {
  const dbUrl = process.env['SUPABASE_DB_URL']
  if (!dbUrl) return 'RLS: SKIPPED (SUPABASE_DB_URL not set)'
  const { table, tenantA, tenantB } = args
  const tenantColumn = args.tenantColumn || 'user_id'
  if (typeof table !== 'string' || typeof tenantA !== 'string' || typeof tenantB !== 'string') {
    return 'RLS: SKIPPED (table, tenantA and tenantB must all be strings)'
  }
  let pg
  try {
    pg = (await import('pg')).default
  } catch {
    return 'RLS: SKIPPED (the `pg` devDependency is not installed — pnpm add -D pg)'
  }
  const client = new pg.Client({ connectionString: dbUrl })
  try {
    await client.connect()
    return await runProbe(client, { table, tenantA, tenantB, tenantColumn })
  } catch (err) {
    // Never a false green — any failure to complete a real probe is reported as a skip.
    return `RLS: SKIPPED (${err instanceof Error ? err.message : String(err)})`
  } finally {
    await client.end().catch(() => {})
  }
}

const server = new Server({ name: 'rls_verify', version: '0.2.0' }, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      description:
        'Probe cross-tenant RLS isolation for a table: as tenantA, assert 0 rows of tenantB are visible. tenantB must already own at least one row (seeded positive control) or the probe returns SKIPPED — a vacuous probe is never reported green. Returns RLS: ISOLATED / RLS: LEAK / SKIPPED. Read-only, always rolled back. The CI suite (pnpm test:rls) is authoritative.',
      inputSchema: {
        properties: {
          table: { type: 'string' },
          tenantA: { type: 'string' },
          tenantB: { type: 'string' },
          tenantColumn: { description: 'tenant id column (default user_id)', type: 'string' },
        },
        required: ['table', 'tenantA', 'tenantB'],
        type: 'object',
      },
      name: 'rls_verify',
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const text = await rlsVerify(req.params.arguments ?? {})
  return { content: [{ text, type: 'text' }] }
})

await server.connect(new StdioServerTransport())
