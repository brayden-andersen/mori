-- ---------------------------------------------------------------------------
-- Invisible members: hidden from the MORI Network.
--   * They aren't listed in the member directory (Discover), except to members
--     they're already connected with or have a request with.
--   * Searching their exact full name finds them (find_member), but only their
--     name and when they joined: no photo, no other details.
--   * Nobody can send them a connection request.
-- Their connections keep seeing their profile as before.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists invisible boolean not null default false;

-- Read past row-level security for the policy below (profiles are private).
create or replace function private.is_invisible(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select pr.invisible from public.profiles pr where pr.id = p), false);
$$;
revoke all on function private.is_invisible(uuid) from public;
grant execute on function private.is_invisible(uuid) to authenticated;

drop policy if exists "Members send requests as themselves" on public.connections;
create policy "Members send requests as themselves" on public.connections
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and not private.is_invisible(addressee_id)
  );

-- ---------------------------------------------------------------------------
-- Member directory: invisible members left out (or shown with name and join
-- date only). The return type changes (new "invisible" column), so the
-- function is recreated.
-- ---------------------------------------------------------------------------
drop function if exists public.member_directory();
create function public.member_directory()
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  cover_url text,
  profile_type text,
  specialty text,
  headline text,
  bio text,
  age integer,
  region text,
  expertise_level text,
  employment_status text,
  business_sector text[],
  languages jsonb,
  skills text[],
  open_to_build boolean,
  open_type text,
  linkedin_url text,
  links jsonb,
  cv_path text,
  cv_name text,
  sprint_rating numeric,
  sprint_reviews integer,
  joined_at timestamptz,
  limited boolean,
  invisible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as uid
  ),
  links as (
    select
      case when c.requester_id = me.uid then c.addressee_id else c.requester_id end as other,
      bool_or(c.status = 'accepted') as accepted,
      bool_or(c.requester_id <> me.uid) as asked_me
    from public.connections c
    cross join me
    where me.uid in (c.requester_id, c.addressee_id)
    group by 1
  ),
  visible as (
    select
      p.*,
      coalesce(l.accepted, false) as is_linked,
      (p.invisible and not coalesce(l.accepted, false) and not coalesce(l.asked_me, false)) as hidden
    from public.profiles p
    cross join me
    left join links l on l.other = p.id
    where me.uid is not null
      and p.id <> me.uid
      and p.onboarding_completed
      and p.age is not null
      and p.region is not null
      and (not p.invisible or l.other is not null)
  ),
  shaped as (
    select
      v.*,
      (not v.hidden and (v.profile_visibility = 'everyone' or v.is_linked)) as full_view
    from visible v
  )
  select
    v.id,
    v.first_name,
    v.last_name,
    case when not v.hidden then v.avatar_url end,
    case when not v.hidden then v.cover_url end,
    case when not v.hidden then v.profile_type end,
    case when not v.hidden then v.specialty end,
    case when not v.hidden then v.headline end,
    case when v.full_view then v.bio end,
    case when v.full_view and v.show_age
      then coalesce(extract(year from pg_catalog.age(v.birth_date))::integer, v.age) end,
    case when v.full_view and v.show_region then v.region end,
    case when v.full_view then v.expertise_level end,
    case when v.full_view and v.show_employment then v.employment_status end,
    case when v.full_view then v.business_sector end,
    case when v.full_view and v.show_languages then v.languages else '[]'::jsonb end,
    case when v.full_view then v.skills end,
    case when v.full_view then v.open_to_build end,
    case when v.full_view then v.open_type end,
    case when v.full_view then v.linkedin_url end,
    case when v.full_view then v.links end,
    case when v.is_linked then v.cv_path end,
    case when v.is_linked then v.cv_name end,
    case when not v.hidden then v.sprint_rating end,
    case when not v.hidden then v.sprint_reviews else 0 end,
    v.created_at,
    not v.full_view,
    v.hidden
  from shaped v
  order by v.created_at desc
  limit 1000;
$$;

revoke execute on function public.member_directory() from public, anon;
grant execute on function public.member_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- Find an invisible member by their exact full name (case and spacing don't
-- matter). Only their name and join date come back. Same columns as the
-- directory so the app reads both the same way.
-- ---------------------------------------------------------------------------
create or replace function public.find_member(full_name text)
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  cover_url text,
  profile_type text,
  specialty text,
  headline text,
  bio text,
  age integer,
  region text,
  expertise_level text,
  employment_status text,
  business_sector text[],
  languages jsonb,
  skills text[],
  open_to_build boolean,
  open_type text,
  linkedin_url text,
  links jsonb,
  cv_path text,
  cv_name text,
  sprint_rating numeric,
  sprint_reviews integer,
  joined_at timestamptz,
  limited boolean,
  invisible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.first_name, p.last_name,
    null::text, null::text, null::text, null::text, null::text, null::text, null::integer,
    null::text, null::text, null::text, null::text[], '[]'::jsonb, null::text[], null::boolean,
    null::text, null::text, null::jsonb, null::text, null::text, null::numeric, 0,
    p.created_at, true, true
  from public.profiles p
  where (select auth.uid()) is not null
    and p.id <> (select auth.uid())
    and p.invisible
    and p.onboarding_completed
    and char_length(btrim(full_name)) >= 3
    and lower(regexp_replace(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '\s+', ' ', 'g'))
      = lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g'))
  order by p.created_at desc
  limit 5;
$$;

revoke execute on function public.find_member(text) from public, anon;
grant execute on function public.find_member(text) to authenticated;
