-- ---------------------------------------------------------------------------
-- Profile photos. Members upload their own picture or keep the default icon.
-- Photos are public so they load anywhere; each member writes only
-- avatars/<their user id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Members see their own photos" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Members upload their own photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Members replace their own photo" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Members delete their own photo" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- avatar_url now holds a photo the member chose. Earlier sign-ins copied the
-- Google account photo here automatically; clear those so everyone starts
-- from the default icon (the photo menu can still use the Google photo).
update public.profiles set avatar_url = null where avatar_url like 'https://lh3.googleusercontent.com/%';

-- ---------------------------------------------------------------------------
-- Extra links next to the CV: [{"type": "github", "url": "https://..."}]
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists links jsonb not null default '[]'::jsonb;
alter table public.profiles
  add constraint profiles_links_check check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 8);

-- ---------------------------------------------------------------------------
-- Member directory: same as before, plus links (shared like LinkedIn).
-- The return type changes, so the function is recreated.
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
    case when v.full_view then v.region end,
    case when v.full_view then v.expertise_level end,
    case when v.full_view then v.employment_status end,
    case when v.full_view then v.business_sector end,
    case when v.full_view then v.languages end,
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
