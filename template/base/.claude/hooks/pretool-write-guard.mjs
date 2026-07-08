#!/usr/bin/env node
// PreToolUse / matcher: Edit|Write|MultiEdit — block invariant-violating file CONTENT
// before it lands. The only reliable place to stop forbidden code being written.
// Mirrors the ESLint custom rules (defense-in-depth). Exempts the harness's own tooling
// (.claude/**) and tests (which legitimately reference patterns / read service-role from env).
// Also exempts supabase/functions/** — the ONE sanctioned home for the admin (service-role) key:
// an admin-JWT-gated Edge Function (deployed Deno, not Next app code). This carve-out must be
// governed by an ADR in YOUR repo before any service-role key lands in an Edge Function — emit
// one via /adr. It is scoped to that directory ONLY.
// SOURCE: docs/harness/README.md (pretool-write-guard; service-role Edge Function exception)
import { denyTool, pass, readHookInput } from './lib/hookio.mjs'

const input = await readHookInput()
const ti = input?.tool_input ?? {}
const path = String(ti.file_path ?? ti.path ?? '')

// Resolve to a path RELATIVE to the project root so the protected patterns can be
// root-anchored (^…) — otherwise a nested node_modules/x/tools/validate.mjs would
// false-match. CLAUDE_PROJECT_DIR is guaranteed for hook subprocesses.
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? ''
const rel =
  projectDir && path.startsWith(projectDir)
    ? path.slice(projectDir.length).replace(/^\/+/, '')
    : path.replace(/^\.?\/+/, '')

// Tamper evidence (layer 2): the gate must not be able to rewrite itself. Edits to the
// harness config, the validate/check scripts, the whole lint/architecture config surface,
// the RLS runner, the git hooks, and CI workflows require an explicit human-in-the-loop
// escape hatch. Layer 1 is the settings.json deny list (hooks + settings + .harness).
// SOURCE: docs/harness/README.md (tamper evidence)
const PROTECTED = [
  /^tools\/harness\.config\.mjs$/,
  /^tools\/validate\.mjs$/,
  /^tools\/check-[^/]+\.mjs$/,
  /^tests\/rls\/run-rls\.mjs$/, // the RLS runner the Stop hook invokes directly (test bodies stay editable)
  /^lefthook\.yml$/,
  /^\.github\/workflows\//,
  // The lint/architecture config surface — weakening any of these weakens the gate.
  /^eslint\.config\.mjs$/,
  /^eslint\//,
  /^biome\.jsonc$/,
  /^knip\.json$/,
  /^\.dependency-cruiser\.js$/,
  /^tsconfig\.json$/,
  /^pnpm-workspace\.yaml$/,
  // Permission + MCP surface: never let the agent widen its own grants or add MCP servers.
  /^\.claude\/settings\.json$/,
  /^\.claude\/settings\.local\.json$/,
  /^\.mcp\.json$/,
  /^\.harness\//,
]
if (process.env.HARNESS_ALLOW_SELF_EDIT !== '1' && PROTECTED.some((re) => re.test(rel))) {
  denyTool(
    'PreToolUse',
    'harness-protected file: set HARNESS_ALLOW_SELF_EDIT=1 (human-in-the-loop) to modify the gate itself. SOURCE: docs/harness/README.md (tamper evidence)',
  )
}

// Exempt harness tooling, tests, and the sanctioned Edge Function directory (see header).
if (/\/\.claude\/|(^|\/)(tests?|__tests__)\/|(^|\/)supabase\/functions\//.test(path)) pass()

// Police SOURCE CODE only. Docs/markdown/config (e.g. CODEOWNERS, the PR template,
// the approved-tools registry, ADRs) legitimately mention the banned patterns by name.
if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) pass()

const text = [
  ti.content,
  ti.new_string,
  ti.new_str,
  ti.replacement,
  ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e?.new_string ?? '') : []),
]
  .filter((s) => typeof s === 'string')
  .join('\n')

// "Client" follows the architecture's authoritative definition (eslint-plugin-boundaries +
// .dependency-cruiser.js): a *.client.tsx file or one carrying the 'use client' directive.
// NOT every .tsx — Server Components (RSC pages/layouts) legitimately fetch through the DAL.
// SOURCE: docs/harness/README.md (rsc-client-split); .dependency-cruiser.js (no-client-to-dal)
const isClient = /\.client\.tsx$/.test(path) || /["']use client["']/.test(text)
const isServerArea =
  /lib\/dal\//.test(path) ||
  /lib\/supabase\/(server|proxy)\.ts$/.test(path) ||
  /\/server\//.test(path) ||
  /route\.ts$/.test(path) ||
  /actions\.ts$/.test(path)

const checks = [
  [
    /\bSUPABASE_SERVICE_ROLE_KEY\b|\bservice_role\b/,
    'service-role key bypasses RLS and is banned in all app code.',
  ],
  [
    /\bdangerouslySetInnerHTML\b/,
    'dangerouslySetInnerHTML is banned (XSS); render sanitized content through the approved component.',
  ],
  [
    /\.auth\.getSession\s*\(/,
    isServerArea
      ? 'Server-side getSession() is banned. Use getClaims()/getUser() in the DAL.'
      : null,
  ],
  [
    /import\s+[^;]*from\s+["'][^"']*\/dal\//,
    isClient
      ? 'Client components must not import the DAL. Fetch via RSC/server actions; authz lives in the DAL.'
      : null,
  ],
]

for (const [re, msg] of checks) {
  if (msg && re.test(text)) denyTool('PreToolUse', msg)
}

// DAL modules must carry the server-only wall.
if (/lib\/dal\/.*\.ts$/.test(path) && !/import\s+["']server-only["']/.test(text)) {
  denyTool(
    'PreToolUse',
    "Every DAL module must start with import 'server-only'; this enforces the server-only wall.",
  )
}
pass()
