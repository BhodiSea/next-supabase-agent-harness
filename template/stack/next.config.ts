import type { NextConfig } from 'next'

// Allow next/image to optimise images served from the Supabase Storage public CDN. The host is
// derived from the runtime Supabase URL so it tracks local (127.0.0.1:54321) and prod without
// hardcoding a project ref; scoped to the public object path so only public-bucket objects are
// proxied. SOURCE: https://nextjs.org/docs/app/api-reference/components/image#remotepatterns (image host allowlist)
function supabaseImagePatterns(): NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> {
  const raw = process.env['NEXT_PUBLIC_SUPABASE_URL']
  if (!raw) return []
  const u = new URL(raw)
  return [
    {
      hostname: u.hostname,
      pathname: '/storage/v1/object/public/**',
      protocol: u.protocol === 'https:' ? 'https' : 'http',
      ...(u.port ? { port: u.port } : {}),
    },
  ]
}

// Cache Components (PPR) is the platform default from day one: static shells prerender, and
// runtime request data must be read inside Suspense (or a 'use cache' boundary with explicit args).
// SOURCE: docs/harness/README.md (cacheComponents: true) [corpus: nextjs@16/use-cache-runtime-apis]
const nextConfig: NextConfig = {
  cacheComponents: true,
  images: { remotePatterns: supabaseImagePatterns() },
}

export default nextConfig
