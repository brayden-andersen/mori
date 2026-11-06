-- ---------------------------------------------------------------------------
-- Members choose which details their profile shows: age, region,
-- employment and languages. Age was never shared before, so it starts hidden;
-- the others were shared, so they start shown.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists show_age boolean not null default false,
  add column if not exists show_region boolean not null default true,
  add column if not exists show_employment boolean not null default true,
  add column if not exists show_languages boolean not null default true;

-- ---------------------------------------------------------------------------
-- Member directory: hidden details come back empty, and age is shared when
-- the member shows it. The return type changes, so the function is recreated.
-- ---------------------------------------------------------------------------
drop function if exists public.member_directory();
create function public.member_directory()
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  profile_type text,
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
    v.profile_type,
    v.headline,
    case when v.full_view then v.bio end,
    case when v.full_view and v.show_age then v.age end,
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
