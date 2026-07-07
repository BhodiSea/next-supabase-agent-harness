import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>The page you are looking for does not exist or has moved.</p>
      <Link href="/" className="underline">
        Back to home
      </Link>
    </main>
  )
}
