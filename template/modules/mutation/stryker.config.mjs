// StrykerJS mutation testing — the real behavioral net for lib/ logic. CI/nightly
// only (slow): NOT the Stop gate and NOT in `pnpm validate`. Runs against the
// vitest unit suites. The Supabase client wrappers are excluded (their behavior is
// covered by the RLS isolation suite, not unit mutation).
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  coverageAnalysis: 'perTest',
  incremental: true,
  incrementalFile: '.stryker-tmp/incremental.json',
  mutate: ['lib/**/*.ts', '!lib/**/*.test.ts', '!lib/supabase/**'],
  reporters: ['progress', 'clear-text', 'html'],
  testRunner: 'vitest',
  thresholds: { break: null },
  vitest: { configFile: 'vitest.config.ts' },
}

export default config
