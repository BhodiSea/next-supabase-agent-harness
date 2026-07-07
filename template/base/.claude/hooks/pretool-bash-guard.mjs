#!/usr/bin/env node
// PreToolUse / matcher: Bash — deterministic block of dangerous shell + secret leaks.
// A high-value tripwire, NOT a complete sandbox: obfuscated commands can evade
// substring checks. The settings.json deny list + permission model are the primary
// control; ESLint enforces the same invariants in source.
// SOURCE: docs/harness/README.md (pretool-bash-guard)
import { denyTool, pass, readHookInput } from './lib/hookio.mjs'

const input = await readHookInput()
const cmd = String(input?.tool_input?.command ?? '')

const RULES = [
  [
    /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|--recursive\s+--force)\b/,
    "Blocked: 'rm -rf' is forbidden by the harness.",
  ],
  [
    /git\s+push\s+(--force|-f|--force-with-lease)\b/,
    'Blocked: force-push is forbidden; rewrite history via PR review only.',
  ],
  [/git\s+reset\s+--hard\b/, "Blocked: 'git reset --hard' destroys uncommitted work."],
  [
    /\bSUPABASE_SERVICE_ROLE_KEY\b/,
    'Blocked: the service-role key bypasses RLS and must never appear in app/test code or commands.',
  ],
  [/\bservice_role\b/, "Blocked: 'service_role' reference detected — RLS bypass is forbidden."],
  [
    /\b(cat|less|more|head|tail|grep|nano|vim|code|xxd|strings)\s+[^|;&]*\.env(\.|\b)/,
    'Blocked: reading .env files is forbidden; secrets are injected at runtime.',
  ],
  [
    /\.auth\.getSession\s*\(|\bgetSession\s*\(/,
    'Blocked: getSession() is banned server-side — use getClaims()/getUser() (unverified cookie data).',
  ],
  [
    /\bDROP\s+TABLE\b/i,
    'Blocked: destructive SQL (DROP TABLE) must go through a reviewed migration.',
  ],
  [/:\(\)\s*\{\s*:\|:&\s*\}\s*;/, 'Blocked: fork bomb pattern.'],
]

if (cmd) {
  for (const [re, msg] of RULES) {
    if (re.test(cmd)) denyTool('PreToolUse', msg)
  }
}
pass()
