import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { hasEnvVars } from '../utils'

// Public prefixes (no optimistic login-redirect). Add your public marketing routes here, and any
// webhook/cron endpoints — those are self-authenticating (they verify a provider HMAC / cron secret
// themselves) and must never be bounced to the login page. proxy.ts is NEVER the authorization
// boundary: post-CVE-2025-29927 the x-middleware-subrequest header is spoofable, so this list only
// tunes the optimistic redirect — authorize in the DAL, close to the data.
// SOURCE: https://vercel.com/changelog/cve-2025-29927 [corpus: nextjs@16/proxy-cve-2025-29927]
// '/.well-known' keeps RFC 9116 security.txt (and future well-known metadata) reachable — a
// security.txt that redirects to login fails the RFC's retrieval requirement outright.
// SOURCE: https://www.rfc-editor.org/rfc/rfc9116 [corpus: rfc/9116-security-txt]
const PUBLIC_PREFIXES = ['/auth', '/.well-known']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
  if (!url || !key) {
    return supabaseResponse
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  // SOURCE: https://supabase.com/docs/reference/javascript/auth-getclaims [corpus: supabase/getclaims] — getClaims() verifies the JWT; the cookie session is unverified
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Optimistic session-presence check ONLY. proxy.ts is never the authorization boundary
  // (CVE-2025-29927) — real authorization lives in the DAL and RLS, close to the data.
  // SOURCE: https://vercel.com/changelog/cve-2025-29927 [corpus: nextjs@16/proxy-cve-2025-29927]
  const { pathname } = request.nextUrl
  const isPublic = pathname === '/' || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!user && !isPublic) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
