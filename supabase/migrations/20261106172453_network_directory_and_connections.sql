-- ---------------------------------------------------------------------------
-- 1. Profiles: who can see the full profile, and a sprint rating members
--    can read but not set (it will come from sprint reviews).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists profile_visibility text not null default 'everyone',
  add column if not exists sprint_rating numeric(2,1),
  add column if not exists sprint_reviews integer not null default 0;

alter table public.profiles
  add constraint profiles_visibility_check check (profile_visibility in ('everyone', 'connections')),
  add constraint profiles_sprint_rating_check check (sprint_rating is null or sprint_rating between 0 and 5),
  add constraint profiles_sprint_reviews_check check (sprint_reviews >= 0);

create or replace function public.protect_profile_stats()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Members can't write their own sprint rating; only the backend can.
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.sprint_rating := null;
      new.sprint_reviews := 0;
    else
      new.sprint_rating := old.sprint_rating;
      new.sprint_reviews := old.sprint_reviews;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_stats on public.profiles;
create trigger protect_profile_stats
  before insert or update on public.profiles
  for each row execute function public.protect_profile_stats();

-- Same rules as before, scoped to signed-in members and evaluated once per query.
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Members can view own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Members can insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Members can update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- 2. Connection requests. One row per pair of members:
--    pending -> accepted | ignored. Withdrawing or removing deletes the row.
-- ---------------------------------------------------------------------------
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'ignored')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint connections_not_self check (requester_id <> addressee_id)
);
create unique index connections_pair_key on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index connections_requester_idx on public.connections (requester_id);
create index connections_addressee_idx on public.connections (addressee_id);

alter table public.connections enable row level security;

-- Members may only choose who they ask and add a note; only the status can change later.
revoke all on table public.connections from anon, authenticated;
grant select, delete on table public.connections to authenticated;
grant insert (addressee_id, note) on table public.connections to authenticated;
grant update (status) on table public.connections to authenticated;

create policy "Members see requests they sent or received" on public.connections
  for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
create policy "Members send requests as themselves" on public.connections
  for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');
create policy "Members answer requests sent to them" on public.connections
  for update to authenticated
  using (addressee_id = (select auth.uid()) and status in ('pending', 'ignored'))
  with check (addressee_id = (select auth.uid()) and status in ('accepted', 'ignored'));
create policy "Members withdraw requests or remove connections" on public.connections
  for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create or replace function public.stamp_connection_response()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

create trigger stamp_connection_response
  before update on public.connections
  for each row execute function public.stamp_connection_response();

-- ---------------------------------------------------------------------------
-- 3. Member directory: everyone who finished sign-up, except the caller.
--    Age, phone and birthday are never shared. Members who show their full
--    profile to connections only appear with name, photo, role and headline.
--    CVs are shared with connections only.
-- ---------------------------------------------------------------------------
create or replace function public.member_directory()
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  profile_type text,
  headline text,
  bio text,
  region text,
  expertise_level text,
  employment_status text,
  business_sector text[],
  languages jsonb,
  skills text[],
  open_to_build boolean,
  open_type text,
  linkedin_url text,
  cv_path text,
  cv_name text,
  sprint_rating numeric,
  sprint_reviews integer,
  joined_at timestamptz,
  limited boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as uid
  ),
  linked as (
    select case when c.requester_id = me.uid then c.addressee_id else c.requester_id end as other
    from public.connections c
    cross join me
    where c.status = 'accepted' and me.uid in (c.requester_id, c.addressee_id)
  ),
  visible as (
    select
      p.*,
      (l.other is not null) as is_linked,
      (p.profile_visibility = 'everyone' or l.other is not null) as full_view
    from public.profiles p
    cross join me
    left join linked l on l.other = p.id
    where me.uid is not null
      and p.id <> me.uid
      and p.onboarding_completed
      and p.age is not null
      and p.region is not null
  )
  select
    v.id,
    v.first_name,
    v.last_name,
    v.avatar_url,
    v.profile_type,
    v.headline,
    case when v.full_view then v.bio end,
    case when v.full_view then v.region end,
    case when v.full_view then v.expertise_level end,
    case when v.full_view then v.employment_status end,
    case when v.full_view then v.business_sector end,
    case when v.full_view then v.languages end,
    case when v.full_view then v.skills end,
    case when v.full_view then v.open_to_build end,
    case when v.full_view then v.open_type end,
    case when v.full_view then v.linkedin_url end,
    case when v.is_linked then v.cv_path end,
    case when v.is_linked then v.cv_name end,
    v.sprint_rating,
    v.sprint_reviews,
    v.created_at,
    not v.full_view
  from visible v
  order by v.created_at desc
  limit 1000;
$$;

revoke execute on function public.member_directory() from public, anon;
grant execute on function public.member_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Connections can open each other's CVs.
-- ---------------------------------------------------------------------------
create policy "Connections can read CVs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and exists (
      select 1
      from public.connections c
      where c.status = 'accepted'
        and (
          (c.requester_id = (select auth.uid()) and c.addressee_id::text = (storage.foldername(objects.name))[1])
          or (c.addressee_id = (select auth.uid()) and c.requester_id::text = (storage.foldername(objects.name))[1])
        )
    )
  );
