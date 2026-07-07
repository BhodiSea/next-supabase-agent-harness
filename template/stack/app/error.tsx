'use client'

// Route-segment error boundary — must be a Client Component. Render only the opaque digest,
// never error.message: server error messages can carry internals and are redacted by Next in
// production anyway. SOURCE: docs/harness/README.md (error boundaries render digests, not messages)
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p>{error.digest ? `Error reference: ${error.digest}` : 'An unexpected error occurred.'}</p>
      <button type="button" onClick={reset} className="w-fit border px-4 py-2">
        Try again
      </button>
    </main>
  )
}
