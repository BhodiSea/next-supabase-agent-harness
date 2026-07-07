import 'server-only'
import type { Tables } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

// The DAL is the authorization boundary (proxy.ts is only an optimistic redirect): verify the JWT
// with getClaims() — never the unverified cookie session — before touching data, and let RLS on
// `notes` act as the second, fail-closed layer. Server-only module; returns DTOs, never raw rows.
// SOURCE: https://supabase.com/docs/reference/javascript/auth-getclaims [corpus: supabase/getclaims]
export interface NoteDTO {
  id: string
  title: string
  updatedAt: string
}

// Pure row -> DTO mapper: strips storage-shaped fields (user_id, body, created_at) so callers see
// only the read-model contract. Must not mutate its input (unit-tested).
export function toNoteDTO(row: Tables<'notes'>): NoteDTO {
  return { id: row.id, title: row.title, updatedAt: row.updated_at }
}

export async function getNotes(): Promise<NoteDTO[]> {
  const supabase = await createClient()
  // Authorize in the DAL, close to the data — verified claims, not the raw cookie session.
  // SOURCE: https://supabase.com/docs/reference/javascript/auth-getclaims [corpus: supabase/getclaims]
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) return []
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data.map(toNoteDTO)
}
