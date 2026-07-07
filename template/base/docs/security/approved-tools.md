# Approved tools registry (MCP servers & Agent Skills)

SOURCE: docs/harness/README.md (allowlist-only, scan-before-install,
re-review-on-version-bump). MCP servers and Skills run with your privileges and can be
steered by prompt injection — a regulated operator must vet them, not trust them.

## Policy (default-deny)

1. **Default deny.** No MCP server or Skill runs on this codebase unless it is listed
   below, version-pinned to a reviewed commit. Prefer official Anthropic / first-party
   (Supabase, GitHub) servers.
2. **Vet before approve.** Read the `SKILL.md` and every bundled script; flag
   `allowed-tools: Bash(*)`, network calls, env-var harvesting, instructions hidden in
   comments; run a scanner; record provenance + a written trust rationale. Skills that
   ship executable scripts are ~2× higher risk — scan accordingly.
3. **Re-review on every version bump** (rug-pull defense — approving v1 does not approve v2).
4. **Least privilege + sandbox.** Scope tools per subagent; never expose the service-role
   key or user PII to an MCP server. Keep private data out of the lethal trifecta
   (see `sandbox-and-supply-chain.md`).

## Approved registry

| Tool | Type | Source / pin | Reviewed | Rationale |
|---|---|---|---|---|
| `corpus_search` | MCP (local stdio) | `tools/mcp/corpus-search-server.mjs` @ this repo | self-authored | citation grounding; no network, reads a local pinned corpus |
| `rls_verify` | MCP (local stdio) | `tools/mcp/rls-verify-server.mjs` @ this repo | self-authored | mid-turn RLS probe; connects only to `SUPABASE_DB_URL` as an RLS-subject role |
| `@supabase/mcp-server-supabase` | MCP (npx) | pin exact version before enabling | TODO | official Supabase MCP, run `--read-only` |
| `authoring-vertical-slice` | Skill | `.claude/skills/…` @ this repo | self-authored | no bundled network/secret access; scaffold script is Node built-ins only |

Anything not listed here does not run. Record scan results + pinned versions as evidence
for security reviews.

**Known-good optional:** the official **Sentry MCP** (`https://mcp.sentry.dev/mcp`,
HTTP) is first-party and widely reviewed, but it is **NOT enabled by default** in this
template. To adopt it, add a registry row above (with the reviewed pin and a trust
rationale) before wiring it into `mcp.json`.

## Privileged Edge Functions

If a project ever needs a privileged (service-role) Supabase Edge Function, it gets its
own row in this registry **and** a governing project ADR — see
`docs/harness/README.md` (the Edge-Function service-role carve-out policy). There is no
other sanctioned home for the admin key.
