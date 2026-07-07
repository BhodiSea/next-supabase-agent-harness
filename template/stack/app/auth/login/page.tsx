import type { Metadata } from 'next'
import { LoginForm } from './login-form.client'

export const metadata: Metadata = {
  title: 'Login',
}

// Static shell + client form: the page itself reads no request data, so it prerenders under
// Cache Components; the sign-in itself runs in the server action.
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Login</h1>
      <LoginForm />
    </main>
  )
}
