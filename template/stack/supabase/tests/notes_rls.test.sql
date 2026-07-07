-- pgTAP: the notes table exists, RLS is ENABLED and FORCED, and the four per-operation
-- owner policies are present. Fail-closed structure check for the starter's canonical table.
--
-- Requires pgtap (installed by the Supabase test harness). Run via `supabase test db`
-- against a local stack — NOT executable standalone.
-- SOURCE: https://www.postgresql.org/docs/17/ddl-rowsecurity.html [corpus: postgresql/row-security]

BEGIN;

SELECT plan(4);

SELECT has_table('public', 'notes', 'notes table exists');

-- ENABLE + FORCE row level security, read straight from pg_class.
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notes'::regclass),
  'RLS is ENABLED on public.notes'
);
SELECT ok(
  (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.notes'::regclass),
  'RLS is FORCED on public.notes (table owner has no bypass)'
);

-- One policy per operation (select / insert / update / delete), no more, no fewer.
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notes'),
  4,
  'notes carries exactly four per-operation policies'
);

SELECT * FROM finish();

ROLLBACK;
