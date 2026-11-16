-- Covering index for the added_by foreign key (performance advisor).
create index if not exists project_members_added_by_idx on public.project_members (added_by);
