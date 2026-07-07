import Link from 'next/link'

// Designed not-found state for the /protected family (route-boundaries gate):
// an honest "this record does not exist", never a blank root 404.
export default function ProtectedNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p>This note does not exist or you do not have access to it.</p>
      <Link href="/protected" className="underline">
        Back to your notes
      </Link>
    </main>
  )
}
