import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

// Vitest runs the unit suites (node env) and the self-skipping SDK RLS suite.
// SOURCE: docs/harness/README.md (testing doctrine) — the RLS suite needs a DOM-ish
// global to hold the Supabase auth session, so its file opts into jsdom per-file via
// the top-of-file `// @vitest-environment jsdom` pragma; everything else stays `node`.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // `server-only` throws at import outside the react-server condition; stub it so unit tests can
      // import server-only modules (the DAL). SOURCE: npmjs.com/package/server-only
      'server-only': fileURLToPath(new URL('./tests/setup/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    coverage: {
      include: ['lib/**'],
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      // No break threshold here — coverage is informational; the mutation gate
      // (Stryker, CI/nightly) is the real behavioral net.
    },
    environment: 'node',
    exclude: [...configDefaults.exclude, 'e2e/**', 'node_modules/**', '.next/**'],
    globals: false,
    include: ['lib/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: ['./tests/setup/env.ts'],
  },
})
