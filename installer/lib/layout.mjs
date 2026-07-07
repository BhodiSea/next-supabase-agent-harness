// Shared layout constants for the installer.
// Template storage conventions: files that install to dot-paths are stored
// dotless (npm-packlist strips .gitignore/.npmrc and treats nested .gitignore
// as pack-ignore manifests; storing .github dotless also prevents template
// workflows from executing in this repo's own Actions). `.claude/` is the one
// dotted exception: verified to survive npm pack, and hooks reference it.
export const RENAMES = new Map([
  ['gitignore', '.gitignore'],
  ['github', '.github'],
  ['gitattributes', '.gitattributes'],
  ['editorconfig', '.editorconfig'],
  ['nvmrc', '.nvmrc'],
  ['prettierrc.json', '.prettierrc.json'],
  ['gitleaks.toml', '.gitleaks.toml'],
  ['dependency-cruiser.js', '.dependency-cruiser.js'],
  ['mcp.json', '.mcp.json'],
  ['env.example', '.env.example'],
])

// Opt-in modules under template/modules/<name>/ (same storage conventions).
export const MODULES = [
  'gate-styleguide',
  'gate-gated-routes',
  'mutation',
  'ci-provenance',
  'ci-dast',
  'ci-lighthouse',
]

export const TIERS = {
  core: [],
  standard: [],
  strict: [...MODULES],
}

// Installed paths written once and never overwritten by `update` (the project
// owns them after init). Matched by prefix or exact path.
export const SEEDED_PREFIXES = [
  'app/',
  'supabase/',
  'lib/dal/',
  'tests/unit/',
]
export const SEEDED_FILES = new Set([
  'CLAUDE.md',
  'CITATION.cff',
  'SECURITY.md',
  '.env.example',
  '.gitignore',
  'package.json',
  'vercel.json',
  'next.config.ts',
  'postcss.config.mjs',
  'tools/aliveness-manifest.mjs',
  'tools/gated-routes-manifest.mjs',
  'tests/rls/client-factory.ts',
  'lib/supabase/database.types.ts',
  'lib/supabase/proxy.ts',
])

// The gate config is seeded (projects tune it) but hash-tracked so `doctor`
// can surface drift. SOURCE: docs/harness/README.md (tamper evidence)
export const CONFIG_FILES = new Set(['tools/harness.config.mjs'])

// Stack files installed in retrofit mode only when absent (additive seeds).
export const RETROFIT_ADDITIVE = new Set([
  'proxy.ts',
  'lib/utils.ts',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'lib/supabase/anon.ts',
  'lib/supabase/proxy.ts',
])

// Existing root configs the installer must never clobber on retrofit: if the
// project already has one, ours lands alongside as <base>.harness.<ext>.
export const CONFLICTABLE = [
  { installed: 'eslint.config.mjs', existing: /^eslint\.config\.(js|mjs|cjs|ts|mts)$/ },
  { installed: 'biome.jsonc', existing: /^biome\.jsonc?$/ },
  { installed: 'tsconfig.json', existing: /^tsconfig\.json$/ },
  { installed: 'knip.json', existing: /^knip\.(json|jsonc|ts)$/ },
  { installed: '.dependency-cruiser.js', existing: /^\.dependency-cruiser\.(js|cjs|mjs)$/ },
  { installed: '.prettierrc.json', existing: /^\.prettierrc(\.(json|yaml|yml|js|cjs|mjs))?$/ },
  { installed: 'lefthook.yml', existing: /^lefthook\.(yml|yaml)$/ },
  { installed: 'commitlint.config.mjs', existing: /^commitlint\.config\.(js|mjs|cjs|ts)$/ },
  { installed: 'vitest.config.ts', existing: /^vitest\.config\.(ts|mts|js|mjs)$/ },
  { installed: 'playwright.config.ts', existing: /^playwright\.config\.(ts|mts|js|mjs)$/ },
  { installed: 'cspell.json', existing: /^\.?cspell\.(json|jsonc|yaml|yml)$/ },
  { installed: 'pnpm-workspace.yaml', existing: /^pnpm-workspace\.yaml$/ },
  { installed: '.gitleaks.toml', existing: /^\.gitleaks\.toml$/ },
  { installed: '.mcp.json', existing: /^\.mcp\.json$/ },
]
