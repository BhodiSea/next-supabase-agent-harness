# Migration & RLS reference

- File location: `supabase/migrations/<timestamp>_<feature>.sql` (repo root; there is no
  `src/` and no monorepo `packages/`).
- Timestamp format: `YYYYMMDDHHMMSS` (UTC), e.g. `20260622181500_notes.sql`.
- Every tenant table enables AND forces RLS, and ships a policy in the SAME migration:

  ```sql
  ALTER TABLE t ENABLE ROW LEVEL SECURITY;
  ALTER TABLE t FORCE ROW LEVEL SECURITY;   -- owner is not exempt
  ```

- initPlan policy pattern (evaluates auth once per statement, not per row), scoped
  `TO authenticated`, per operation (never `FOR ALL`):

  ```sql
  -- SOURCE: https://supabase.com/docs/guides/database/postgres/row-level-security
  CREATE POLICY t_select ON t FOR SELECT TO authenticated
    USING ( tenant_id = (select auth.uid()) );
  CREATE POLICY t_update ON t FOR UPDATE TO authenticated
    USING ( tenant_id = (select auth.uid()) )       -- paired SELECT predicate above
    WITH CHECK ( tenant_id = (select auth.uid()) );
  ```

- Index every column used in a policy predicate (e.g. `CREATE INDEX ON t (tenant_id);`).
- Auth/cohort data comes from `app_metadata` via `auth.jwt()`, NEVER `user_metadata`
  (end-user-editable; using it in a policy is privilege escalation).
- The `service_role` key is banned outright (it bypasses RLS).
- Always pair the migration with a pgTAP cross-tenant isolation test (see `tests.md`):
  tenant A's JWT must read ZERO of tenant B's rows.
- Never run destructive SQL (DROP / TRUNCATE / wide UPDATE) without an explicit guard
  and a rollback note; prefer leaving it for human review.
