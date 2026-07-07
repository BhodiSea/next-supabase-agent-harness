// Shared Node-only hook I/O. No jq, no bash. Reads the hook JSON from stdin.
// SOURCE: docs/harness/README.md (.claude/hooks/lib/hookio.mjs)
import process from 'node:process'

export async function readHookInput() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// Block the current action: stderr is fed back to the model, exit 2.
export function block(reason) {
  process.stderr.write(`${String(reason)}\n`)
  process.exit(2)
}

// PreToolUse structured deny (exit 0 + JSON). Blocks the call and attaches a
// machine-readable reason the model can act on.
export function denyTool(event, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  )
  process.exit(0)
}

// No decision; normal flow continues.
export function pass() {
  process.exit(0)
}
