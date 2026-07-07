-- Restore the public-schema default GRANTs newer supabase/postgres images no longer set
-- implicitly. Without this, tables created by migrations (as postgres) carry no
-- SELECT/INSERT/UPDATE/DELETE for the API roles, and every client call fails with
-- "permission denied for table ..." before RLS is even consulted.
--
-- RLS remains the authorization boundary: every table in this repo is created with
-- ENABLE + FORCE ROW LEVEL SECURITY and default-deny policies (anon gets no policy at all).
-- Table grants merely let the API roles reach RLS; add per-table REVOKEs later for stricter
-- carve-outs (append-only ledgers, anon-invisible tables) — they run after this and win.
--
-- Timestamped BEFORE the first table migration so a fresh `supabase db reset` puts the
-- defaults in place before any table exists.
-- SOURCE: https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
