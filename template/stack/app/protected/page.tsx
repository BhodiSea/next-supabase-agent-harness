import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getNotes } from '@/lib/dal/notes'
import { createClient } from '@/lib/supabase/server'

// Under Cache Components the static shell prerenders and the cookie-reading subtree streams
// inside Suspense — runtime request data may not be read in the prerendered scope.
// SOURCE: https://nextjs.org/docs/app/api-reference/directives/use-cache [corpus: nextjs@16/use-cache-runtime-apis]
export default function ProtectedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Protected</h1>
      <Suspense fallback={<p>Loading notes…</p>}>
        <NotesList />
      </Suspense>
    </main>
  )
}

async function NotesList() {
  const supabase = await createClient()
  // Session-presence gate on the page; real authorization is in the DAL + RLS underneath.
  // getClaims() verifies the JWT signature — never trust the raw cookie session server-side.
  // SOURCE: https://supabase.com/docs/reference/javascript/auth-getclaims [corpus: supabase/getclaims]
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) {
    // SOURCE: https://nextjs.org/docs/app/api-reference/functions/redirect [corpus: nextjs@16/redirect]
    redirect('/auth/login')
  }

  const notes = await getNotes()
  if (notes.length === 0) {
    return <p>No notes yet.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {notes.map((note) => (
        <li key={note.id} className="border p-3">
          {note.title}{' '}
          <time dateTime={note.updatedAt} className="text-sm">
            {note.updatedAt}
          </time>
        </li>
      ))}
    </ul>
  )
}
