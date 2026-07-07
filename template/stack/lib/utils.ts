import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** @public starter-kit seam — the canonical Tailwind class combiner for components you add. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars = Boolean(
  process.env['NEXT_PUBLIC_SUPABASE_URL'] && process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
)
