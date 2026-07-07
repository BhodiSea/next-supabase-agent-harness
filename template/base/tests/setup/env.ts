// Vitest global setup. Intentionally a no-op beyond surfacing whatever env the
// runner already inherited (process.env). We do NOT hard-require any variable so
// the unit + self-skipping RLS suites run green pre-schema, before any local
// Supabase stack or .env.test exists. If/when DB-backed RLS tests need real
// credentials, wire a guarded optional `dotenv` load here (and add it to deps +
// knip ignoreDependencies). For now: read process.env only; export nothing.
export {}
