-- ---------------------------------------------------------------------------
-- Projects, shared with co-founders. The owner's team is project_members.
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  focus text not null default '' check (char_length(focus) <= 80),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  rung smallint not null default 0 check (rung between 0 and 5),
  milestones jsonb not null default '[]'::jsonb check (jsonb_typeof(milestones) = 'array' and jsonb_array_length(milestones) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects (owner_id);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'cofounder' check (role = 'cofounder'),
  added_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, member_id)
);
create index project_members_member_idx on public.project_members (member_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- Membership checks used by the policies. They live outside the public API
-- and read the tables directly, so policies on the two tables can refer to
-- each other without looping.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.is_project_owner(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.projects where id = p and owner_id = (select auth.uid()));
$$;

create function private.is_project_member(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.project_members where project_id = p and member_id = (select auth.uid()));
$$;

revoke all on function private.is_project_owner(uuid), private.is_project_member(uuid) from public;
grant execute on function private.is_project_owner(uuid), private.is_project_member(uuid) to authenticated;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- Members choose the content; the owner, timestamps and team can't be forged.
revoke all on table public.projects from anon, authenticated;
grant select, delete on table public.projects to authenticated;
grant insert (name, focus, tags, rung, milestones) on table public.projects to authenticated;
grant update (name, focus, tags, rung, milestones) on table public.projects to authenticated;

revoke all on table public.project_members from anon, authenticated;
grant select, delete on table public.project_members to authenticated;
grant insert (project_id, member_id) on table public.project_members to authenticated;

create policy "Owners and co-founders see projects" on public.projects
  for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_project_member(id));
create policy "Members create their own projects" on public.projects
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Owners and co-founders update projects" on public.projects
  for update to authenticated
  using (owner_id = (select auth.uid()) or private.is_project_member(id))
  with check (owner_id = (select auth.uid()) or private.is_project_member(id));
create policy "Owners delete projects" on public.projects
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "The team sees the team" on public.project_members
  for select to authenticated
  using (member_id = (select auth.uid()) or private.is_project_owner(project_id) or private.is_project_member(project_id));
-- Only a founder who owns the project can add co-founders, and only people
-- they're connected with.
create policy "Founders add connections as co-founders" on public.project_members
  for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and private.is_project_owner(project_id)
    and (select p.profile_type from public.profiles p where p.id = (select auth.uid())) = 'Founder'
    and exists (
      select 1
      from public.connections c
      where c.status = 'accepted'
        and (
          (c.requester_id = (select auth.uid()) and c.addressee_id = member_id)
          or (c.addressee_id = (select auth.uid()) and c.requester_id = member_id)
        )
    )
  );
create policy "Owners remove co-founders; co-founders can leave" on public.project_members
  for delete to authenticated
  using (member_id = (select auth.uid()) or private.is_project_owner(project_id));
