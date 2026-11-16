-- ---------------------------------------------------------------------------
-- Project planner: each project's workspace (the Mainframe's widget layout and
-- the data behind its tools: finance, marketing, GTM checklist, funding,
-- metrics, interviews, lean canvas, ladder proof), documents the team writes
-- together, and room for up to 100 tasks.
-- ---------------------------------------------------------------------------

alter table public.projects
  add column workspace jsonb not null default '{}'::jsonb;
alter table public.projects
  add constraint projects_workspace_check
  check (jsonb_typeof(workspace) = 'object' and pg_column_size(workspace) <= 262144);

alter table public.projects drop constraint projects_milestones_check;
alter table public.projects
  add constraint projects_milestones_check
  check (jsonb_typeof(milestones) = 'array' and jsonb_array_length(milestones) <= 100);

-- The owner and co-founders already update projects (row-level security);
-- these add the new column to what they may write.
grant insert (workspace) on table public.projects to authenticated;
grant update (workspace) on table public.projects to authenticated;

-- Documents: shared with everyone on the project.
create table public.project_docs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null default 'Untitled document' check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 200000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_docs_project_idx on public.project_docs (project_id, updated_at desc);
create index project_docs_created_by_idx on public.project_docs (created_by);
create index project_docs_updated_by_idx on public.project_docs (updated_by);

-- Who wrote and last edited a document, and when, are set by the database.
create function private.stamp_project_doc()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.project_id := old.project_id;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_project_doc() from public;

create trigger project_docs_stamp
  before insert or update on public.project_docs
  for each row execute function private.stamp_project_doc();

alter table public.project_docs enable row level security;
revoke all on table public.project_docs from anon, authenticated;
grant select, delete on table public.project_docs to authenticated;
grant insert (project_id, title, body) on table public.project_docs to authenticated;
grant update (title, body) on table public.project_docs to authenticated;

create policy "The team reads its documents" on public.project_docs
  for select to authenticated
  using (private.is_project_owner(project_id) or private.is_project_member(project_id));
create policy "The team adds documents" on public.project_docs
  for insert to authenticated
  with check (private.is_project_owner(project_id) or private.is_project_member(project_id));
create policy "The team edits documents" on public.project_docs
  for update to authenticated
  using (private.is_project_owner(project_id) or private.is_project_member(project_id))
  with check (private.is_project_owner(project_id) or private.is_project_member(project_id));
create policy "The team deletes documents" on public.project_docs
  for delete to authenticated
  using (private.is_project_owner(project_id) or private.is_project_member(project_id));
