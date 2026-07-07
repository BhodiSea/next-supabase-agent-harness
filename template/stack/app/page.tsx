import Link from 'next/link'

// Public landing page — fully static, so it prerenders under Cache Components with no
// dynamic access. Keep it session-free; authenticated surfaces live under /protected.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{{PROJECT_NAME}}</h1>
      <p>
        A Next.js 16 + Supabase starter with row-level security, a server-only data-access layer,
        and an agent-ready validation gate.
      </p>
      <nav aria-label="Primary">
        <ul className="flex gap-4 underline">
          <li>
            <Link href="/auth/login">Login</Link>
          </li>
          <li>
            <Link href="/protected">Protected area</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}
