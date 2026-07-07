# DAL + DTO + server-only reference

- Location: `lib/dal/<feature>.ts`, imported as `@/lib/dal/<feature>` (alias `@/*` ->
  `./*`; there is no `src/`). Tests at `lib/dal/__tests__/`.
- First line of every DAL module: `import 'server-only'` (build-time wall — client
  imports fail; also a PreToolUse hook blocks writes without it).
- Auth: verify claims, never trust the unverified cookie session server-side.

  ```ts
  // SOURCE: https://supabase.com/docs/guides/auth/server-side/nextjs
  import 'server-only'
  import { createClient } from '@/lib/supabase/server'

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  ```

- Return narrowed DTOs (explicit shapes), never raw rows or Supabase query builders:

  ```ts
  export type NoteDTO = { id: string; title: string; updatedAt: string }
  export async function getNote(id: string): Promise<NoteDTO | null> {
    /* map row -> DTO; return null when absent */
  }
  ```

- Use the anon/publishable key + RLS for tenant isolation (the server client at
  `@/lib/supabase/server`). The `service_role` key / `SUPABASE_SERVICE_ROLE_KEY` is
  banned (RLS bypass).
- Authorization lives HERE, not in `proxy.ts` (which does optimistic session-presence
  checks only).
- Strictest tsconfig: with `noUncheckedIndexedAccess` indexed access is `T | undefined`
  — branch on it. Use `import type` for type-only imports (`verbatimModuleSyntax`). No
  non-null assertions (`!`) on tenant data.
- Size limits: max 200 lines/file, max 50 lines/function. Refactor, do not suppress.
- `// SOURCE:` on every non-trivial decision (caching, retry/timeout, auth pattern).
