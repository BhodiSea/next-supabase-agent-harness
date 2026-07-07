// .dependency-cruiser.js
// Whole-graph architecture checks (complements eslint-plugin-boundaries' per-file rules).
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      from: {},
      name: 'no-circular',
      severity: 'error',
      to: { circular: true },
    },
    {
      comment:
        'Files reachable from nothing (excluding type decls, config & framework entry points).',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)(eslint|next|tailwind|postcss)\\.config\\.(js|ts|mjs|cjs)$',
          // Next.js route handlers are HTTP entry points, not dead code — a self-contained
          // route (e.g. the RUM beacon) legitimately imports nothing. SOURCE: docs/harness/README.md
          '(^|/)route\\.ts$',
        ],
      },
      name: 'no-orphans',
      severity: 'warn',
      to: {},
    },
    {
      comment: 'The service-role client bypasses RLS — forbid it in all app code.',
      from: {},
      // ACTIVE today: any module reaching a service-role client bypasses RLS.
      name: 'no-service-role-anywhere',
      severity: 'error',
      to: { path: 'serviceRoleClient|service[._-]?role' },
    },
    {
      comment: 'Client components must never reach the server-only DAL.',
      from: { path: '\\.client\\.tsx$' },
      // No-op until *.client.tsx convention + lib/dal/ exist.
      name: 'no-client-to-dal',
      severity: 'error',
      to: { path: '^lib/dal' },
    },
    {
      comment: 'Reusable kernel must not depend on bespoke app code.',
      from: { path: '^packages/kernel' },
      // No-op until packages/kernel/ exists.
      name: 'kernel-no-bespoke',
      severity: 'error',
      to: { path: '^app' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.next/' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
}
