# Sandbox posture & the lethal trifecta

SOURCE: docs/harness/README.md (lethal-trifecta posture; Simon Willison's "lethal
trifecta", June 2025).

## The lethal trifecta

An agent is dangerous when it combines all three of:

1. **Access to private data** (tenant rows, secrets), and
2. **Exposure to untrusted content** (web docs, user-supplied content, GitHub issues), and
3. **The ability to externally communicate** (Bash, network, opening PRs).

If an agent has all three, an attacker can trick it into exfiltrating private data. **Break
at least one leg** for any agent that touches private data.

## How this repo breaks the trifecta

- **No standing exfiltration.** `.claude/settings.json` denies `curl`/`wget`, force-push,
  hard-reset, dotenv reads, and ssh keys; `WebFetch` is allow-listed to a few doc domains.
- **No service-role exposure.** The service-role key is banned in app/test code (lint +
  hooks); MCP servers never receive it. RLS is the backstop.
- **Read-only reviewers.** `torvalds-reviewer`, `security-reviewer`,
  `accessibility-reviewer`, `citation-verifier` have `Read, Grep, Glob` only — they cannot
  write or run shell.
- **Least privilege per subagent.** Authors get write/Bash; reviewers do not.

## Running sessions on sensitive code

- Use the built-in sandbox / a devcontainer (macOS Seatbelt, Linux bubblewrap) with no
  standing access to SSH keys, `.env`, or production.
- Reserve `--dangerously-skip-permissions` for sandboxed CI only.
- `disableBypassPermissionsMode: "disable"` is set so one developer cannot undo team rules.
- Keep Claude Code itself updated (repository-controlled-config CVEs are fixed only in
  current versions). New MCP servers / Skills must be on `approved-tools.md` (scanned,
  pinned) before first use.
