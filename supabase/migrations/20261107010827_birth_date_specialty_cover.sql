-- ---------------------------------------------------------------------------
-- Date of birth replaces age in onboarding. It stays private (only its owner
-- can read profiles rows); the directory shares the age it works out, and
-- only when the member shows their age. Specialists name their role, and
-- members can pick a cover image for their profile banner.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists specialty text,
  add column if not exists cover_url text;
alter table public.profiles
  add constraint profiles_birth_date_check check (birth_date is null or birth_date >= date '1920-01-01'),
  add constraint profiles_specialty_check check (specialty is null or char_length(specialty) between 1 and 60),
  add constraint profiles_cover_url_check check (cover_url is null or cover_url like 'https://%');

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
    v.cover_url,
    v.profile_type,
    v.specialty,
    v.headline,
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
