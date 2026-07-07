# RSC + a11y reference (Next.js 16)

- Route at `app/<feature>/page.tsx`. Server Components by default; add `'use client'`
  only for genuine interactivity.
- Data fetching happens in Server Components / server actions via the DAL
  (`@/lib/dal/<feature>`). Client components MUST NOT import `@/lib/dal/**`.
- Cache Components: use `'use cache'` with an explicit `cacheLife`/`revalidate` and
  annotate the choice with `// SOURCE:`. Inside a `'use cache'` boundary you CANNOT call
  `cookies()`, `headers()`, or read `searchParams`. Read those runtime values OUTSIDE
  the cached scope and pass tenant/user IDs in as EXPLICIT arguments (so they join the
  cache key).

  ```tsx
  // SOURCE: https://nextjs.org/docs/app/api-reference/directives/use-cache
  async function getView(tenantId: string) {
    'use cache'
    // ... cached per tenantId; no ambient cookies()/headers() here
  }
  ```

- `proxy.ts` (post-CVE-2025-29927) does OPTIMISTIC session-presence checks only —
  authorization is enforced in the DAL.
- UI: Tailwind CSS 4 utilities, shadcn/ui from `components/ui`, compose classes with
  `cn()` from `@/lib/utils`.
- No `dangerouslySetInnerHTML` (XSS). Sanitize and render text instead.
- a11y: semantic landmarks, labelled controls, logical focus order with visible focus,
  AA colour contrast, keyboard operability, adequate target size, meaningful `alt`
  text. Target WCAG 2.2 AA; Playwright + axe (`pnpm test:a11y`) must pass.
