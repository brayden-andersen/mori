-- The profiles table as it stood before database changes were tracked in this
-- folder. The live project already has it, so this migration does nothing
-- there; on an empty database (local development or a preview branch) it
-- builds the starting point that the later migrations change.
-- profile_type's original check constraint is left out: the next migration
-- replaces it with Founder / Specialist.
do $$
begin
  if to_regclass('public.profiles') is not null then
    return;
  end if;

  create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    first_name text not null,
    last_name text not null,
    birthday date not null,
    phone_number text,
    profile_type text,
    expertise_level text constraint profiles_expertise_level_check
      check (expertise_level = any (array['0-2 years', '3-5 years', '6-10 years', '10+ years'])),
    business_sector text,
    onboarding_completed boolean default false,
    avatar_url text,
    updated_at timestamptz default now()
  );

  alter table public.profiles enable row level security;

  create policy "Users can view own profile" on public.profiles
    for select using (auth.uid() = id);
  create policy "Users can insert own profile" on public.profiles
    for insert with check (auth.uid() = id);
  create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);

  create or replace function public.handle_updated_at()
  returns trigger language plpgsql set search_path = '' as $fn$
  begin
    new.updated_at = now();
    return new;
  end;
  $fn$;

  create trigger on_profile_updated
    before update on public.profiles
    for each row execute function public.handle_updated_at();
end;
$$;
