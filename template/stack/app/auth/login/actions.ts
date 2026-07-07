'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export interface LoginState {
  error: string | null
}

// Validate untrusted FormData at the boundary before it touches auth.
const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

// Password sign-in via the cookie-bound server client, as a Server Action consumed by
// useActionState. On failure return one generic message (never reveal which field was wrong).
// On success redirect() throws NEXT_REDIRECT, so it must run OUTSIDE any try/catch.
// SOURCE: https://nextjs.org/docs/app/api-reference/functions/redirect [corpus: nextjs@16/redirect]
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: 'Enter a valid email address and password.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { error: 'Invalid email or password.' }
  }

  redirect('/protected')
}
