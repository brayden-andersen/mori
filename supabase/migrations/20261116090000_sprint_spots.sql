-- "Save my spot" on sprints.html.
--
-- One row per member per sprint. Sprint ids come from the sprint catalogue in
-- assets/js/data.js (lowercase letters, digits and hyphens). Row-level security
-- lets a member insert, read and delete only their own rows, so nobody can see
-- who else saved a spot through the API. Brayden counts interest from the
-- dashboard's SQL editor, which isn't subject to row-level security:
--
--   select sprint_id, count(*) from public.sprint_spots group by sprint_id order by 2 desc;

create table if not exists public.sprint_spots (
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  sprint_id text not null check (sprint_id ~ '^[a-z0-9-]{1,64}$'),
  created_at timestamptz not null default now(),
  primary key (member_id, sprint_id)
);

comment on table public.sprint_spots is
  'Sprint spots members saved on sprints.html. Members see and change only their own rows.';

alter table public.sprint_spots enable row level security;

revoke all on table public.sprint_spots from anon, authenticated;
grant select, delete on table public.sprint_spots to authenticated;
grant insert (member_id, sprint_id) on table public.sprint_spots to authenticated;

drop policy if exists "Members read their own sprint spots" on public.sprint_spots;
drop policy if exists "Members save their own sprint spots" on public.sprint_spots;
drop policy if exists "Members drop their own sprint spots" on public.sprint_spots;

create policy "Members read their own sprint spots" on public.sprint_spots
  for select to authenticated using ((select auth.uid()) = member_id);
create policy "Members save their own sprint spots" on public.sprint_spots
  for insert to authenticated with check ((select auth.uid()) = member_id);
create policy "Members drop their own sprint spots" on public.sprint_spots
  for delete to authenticated using ((select auth.uid()) = member_id);
