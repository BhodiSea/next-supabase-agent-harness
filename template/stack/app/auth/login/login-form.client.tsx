'use client'

import { useActionState } from 'react'
import { type LoginState, login } from './actions'

const initialState: LoginState = { error: null }

// Visible, programmatically associated labels on both inputs (WCAG 2.2 §3.3.2).
// SOURCE: https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html [corpus: wcag22/3-3-2-labels-or-instructions]
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border px-3 py-2"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="w-fit border px-4 py-2">
        Login
      </button>
    </form>
  )
}
