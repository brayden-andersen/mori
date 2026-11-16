-- Profiles: fit the onboarding questions. Existing columns and rows are kept.
alter table public.profiles alter column birthday drop not null;

-- Roles are now Founder / Specialist (existing "Entrepreneur" rows become Founder)
alter table public.profiles drop constraint if exists profiles_profile_type_check;
update public.profiles set profile_type = 'Founder' where profile_type = 'Entrepreneur';
update public.profiles set profile_type = null where profile_type = 'Other';
alter table public.profiles add constraint profiles_profile_type_check
  check (profile_type = any (array['Founder'::text, 'Specialist'::text]));

-- business_sector becomes the list of up to three industry niches
alter table public.profiles
  alter column business_sector type text[]
  using case when business_sector is null then null else array[business_sector] end;
alter table public.profiles add constraint profiles_business_sector_max3
  check (business_sector is null or cardinality(business_sector) <= 3);

alter table public.profiles
  add column if not exists age int check (age between 16 and 80),
  add column if not exists region text,
  add column if not exists employment_status text,
  add column if not exists linkedin_url text,
  add column if not exists cv_path text,
  add column if not exists cv_name text,
  add column if not exists languages jsonb not null default '[]'::jsonb,
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists open_to_build boolean not null default true,
  add column if not exists open_type text check (open_type in ('cofound', 'join')),
  add column if not exists created_at timestamptz not null default now();

-- Pin the trigger function's search path (security advisor)
create or replace function public.handle_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Private bucket for CV uploads: PDF / Word, 10 MB max
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

-- Members can only touch files in their own folder: cvs/<user id>/...
create policy "CV owners can read" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "CV owners can upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "CV owners can update" on storage.objects for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "CV owners can delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
