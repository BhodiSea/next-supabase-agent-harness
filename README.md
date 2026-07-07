# next-supabase-agent-harness

> **Status: under construction — do not install yet.** v0.1.0 will be the first usable tag.

A deterministic agent harness for **Next.js 16 + Supabase + TypeScript (strict) + pnpm** projects:
Claude Code hooks that make "done" mean *green gate*, security-invariant lint rules, RLS isolation
tests, a provenance/citation pipeline, and supply-chain-hardened CI — packaged once, installable
into any new or existing project.

```sh
# bootstrap a new project (coming in v0.1.0)
npx --yes github:BhodiSea/next-supabase-agent-harness init

# or retrofit an existing Next.js + Supabase project
npx --yes github:BhodiSea/next-supabase-agent-harness init --dir .
```

Full documentation lands with the first release.

## License

Apache-2.0
