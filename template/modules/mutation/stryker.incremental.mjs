// Per-PR incremental mutation gate. Imports the nightly base config and narrows `mutate`, then sets
// a hard break threshold. The full nightly run (stryker.config.mjs) keeps break:null over all of
// lib/. ROLLOUT: keep the CI job advisory (continue-on-error) until a measured local run confirms
// the mutated modules clear 80%, then remove the advisory flag so this gate blocks per-PR.
// SOURCE: docs/harness/README.md (mutation testing; >=80% on critical modules)
import base from './stryker.config.mjs'

const config = {
  ...base,
  // Narrow this to your CRITICAL modules (money, auth-adjacent maths, data transforms) once they
  // exist, so the per-PR gate stays fast and the threshold stays honest. Example:
  //   mutate: ['lib/billing/**/*.ts', 'lib/auth/roles.ts', '!lib/**/*.test.ts'],
  mutate: ['lib/**/*.ts', '!lib/**/*.test.ts'],
  thresholds: { break: 80, high: 90, low: 80 },
}

export default config
