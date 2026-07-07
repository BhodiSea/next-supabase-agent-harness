import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

// Test-only Supabase client + seeding helpers for user-scoped RLS isolation checks.
// Lives under tests/rls/** — the ONLY place the service-role key may be read, and only
// dynamically from the environment (never a literal). The path-scoped ESLint override
// (files: ['tests/rls/**']) turns off the no-secrets entropy rule here.
// SOURCE: docs/harness/README.md (RLS testing doctrine)

// Each target is one RLS-protected, owner-scoped table (owner column = user_id). Add one
// entry per owner-scoped table as the schema grows; the isolation suite probes every entry.
// SOURCE: docs/harness/README.md (user-scoped isolation targets)
export interface IsolationTarget {
  table: string
  ownerColumn: string
  // A row smuggling another user's id; INSERT must be rejected by the RLS WITH CHECK.
  insertProbe: (ownerId: string) => Record<string, unknown>
  // Column(s) to touch in the cross-user UPDATE probe (default: updated_at). Tables without
  // updated_at override this.
  updateProbe?: () => Record<string, unknown>
  // Append-only tables revoke UPDATE/DELETE → the probe must ERROR, not silently no-op.
  appendOnly?: boolean
}

export const ISOLATION_TARGETS: readonly IsolationTarget[] = [
  {
    insertProbe: (uid) => ({ title: 'smuggle', user_id: uid }),
    ownerColumn: 'user_id',
    table: 'notes',
  },
]

const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const anonKey = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ?? ''
// Read the service-role key dynamically, by name, from the environment.
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

// The suite runs only when a reachable stack is fully configured AND there is ≥1 target.
export const rlsConfigured = Boolean(url && anonKey && serviceKey && ISOLATION_TARGETS.length > 0)

// Admin client (bypasses RLS) — used ONLY to seed fixtures, never to assert isolation.
export function createAdminClient() {
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false } })
}

// Anonymous client (RLS-enforced) — the lens through which a user sees data.
export function createAnonClient() {
  return createClient(url, anonKey, { auth: { persistSession: false } })
}

// Sign a fresh anon client in as a user — a real JWT minted through GoTrue end-to-end.
export async function signInUser(email: string, password: string) {
  const client = createAnonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

export interface SeededUser {
  id: string
  email: string
  password: string
}

// Create an auth user (admin) and seed one owned row in every isolation target so the
// positive control ("A sees its OWN rows") is non-vacuous.
export async function seedUser(suffix: string): Promise<SeededUser> {
  const admin = createAdminClient()
  const email = `iso-${suffix}@test.local`
  const password = `Pw-${suffix}-Aa1!`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  })
  if (error) throw error
  const id = data.user.id

  const note = await admin
    .from('notes')
    .insert({ body: 'seed', title: `Note ${suffix}`, user_id: id })
  if (note.error) throw note.error

  return { email, id, password }
}

// Tear a seeded user down; FK on delete cascade removes their owned rows across tables.
export async function deleteUser(id: string): Promise<void> {
  await createAdminClient().auth.admin.deleteUser(id)
}
