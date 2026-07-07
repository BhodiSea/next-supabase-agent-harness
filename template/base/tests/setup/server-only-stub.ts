// Vitest stub for the `server-only` package. In a non-Next (node) test runner the real package
// throws at import (it has no react-server export condition), so unit tests that import server-only
// modules (the DAL, lib/rag, lib/ai) alias it to this no-op.
// SOURCE: https://www.npmjs.com/package/server-only (throws outside the react-server condition)
export {}
