---
description: Verify every // SOURCE: and ADR citation in the working tree; reject hallucinations.
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

Run the `citation-verifier` subagent over the current changes:

!`git diff --name-only HEAD`

It must perform PRE-SCREEN -> EXISTENCE-RESOLVE -> SUPPORT-CHECK and return either
`CITATIONS: CLEAN` or `CITATIONS: REJECTED` with every unresolved / unsupported /
hallucinated entry. If REJECTED, fix the sources (or remove the unsupported claim) and
re-run this command until it returns `CITATIONS: CLEAN`.
