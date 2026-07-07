import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/** @public starter-kit seam — browser client for the Client Components you add (the minimal app has none). */
export function createClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  // Generic over the generated Database type. SOURCE: https://supabase.com/docs/guides/api/rest/generating-types [corpus: supabase/generating-types]
  return createBrowserClient<Database>(url, key)
}
