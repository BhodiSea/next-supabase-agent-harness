import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Cookie-FREE anon Supabase client for PUBLIC marketing reads inside `'use cache'` boundaries: a cached
// scope cannot call cookies() (the cookie-based server client would throw). Running as the anon role is
// also the correct trust model for a public page — only definer RPCs granted to anon + RLS-public rows are
// reachable, exactly what an anonymous visitor sees. No session is persisted (server, per-call).
// SOURCE: docs/harness/README.md (no cookies()/headers() inside 'use cache') [corpus: nextjs@16/use-cache-runtime-apis]
// SOURCE: docs/harness/README.md (anon-granted RPCs + RLS-public rows are the public read surface)
/** @public starter-kit seam — for public cached reads you add (the minimal app has none). */
export function createAnonClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
