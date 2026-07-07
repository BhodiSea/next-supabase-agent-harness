-- Notes: the starter's canonical user-owned table. One row per note, owned by exactly one
-- auth.users row; ownership cascades on user deletion so no orphaned rows survive account removal.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ENABLE turns row security on; FORCE applies it to the table owner too, so there is no
-- privileged bypass path — fail closed for every role except BYPASSRLS superusers.
-- SOURCE: https://www.postgresql.org/docs/17/ddl-rowsecurity.html [corpus: postgresql/row-security]
alter table public.notes enable row level security;
alter table public.notes force row level security;

-- Four per-operation policies TO authenticated. `(select auth.uid())` is the initPlan pattern:
-- the auth function is evaluated once per statement instead of once per row, and the anon role
-- gets no policy at all (default-deny).
-- SOURCE: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices [corpus: supabase/rls-initplan]
create policy notes_select_own on public.notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy notes_insert_own on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy notes_update_own on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy notes_delete_own on public.notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Index the policy/FK column: the Supabase performance advisor flags RLS predicates and foreign
-- keys that filter on an unindexed column.
-- SOURCE: https://supabase.com/docs/guides/database/database-advisors [corpus: supabase/database-advisors-lints]
create index notes_user_id_idx on public.notes (user_id);
