-- Open Google sign-in, with the safeguards for letting anyone in (16 Nov 2026).
--
-- 1. Sign-up: anyone with a Google account whose email Google has verified can
--    create an account. Nothing else can: not email and password, not anonymous
--    sign-in, not another provider, even if one is switched on by mistake in the
--    dashboard. Two switches, both edited in the dashboard's SQL editor:
--
--      -- back to invite-only (the invite list is public.invites, as before):
--      update private.signup_settings set invite_only = true;
--      -- stop one Google account from ever creating an account again:
--      insert into private.signup_blocklist (email, reason) values ('someone@example.com', 'spam, 20 Nov');
--
--    To remove someone who already has an account: add them to the blocklist,
--    then delete the user in Authentication → Users (their profile, projects,
--    messages and connections go with it).
--
-- 2. Age: members must be 18 or older. A date of birth is required to finish
--    sign-up and can't be cleared afterwards; one under 18 is refused. Members
--    who joined before this and have no date of birth keep their account, but
--    until they add one they don't appear in the member directory and can't
--    browse it or send connection requests.
--
-- 3. Blocks: a member can block another. Any connection or request between them
--    is removed; neither can send the other a request or a message; neither sees
--    the other in the directory. Only the blocker sees the block.
--
-- 4. Reports: a member can report another. Reports are written here and can't
--    be read back through the API; Brayden reads them in the dashboard:
--
--      select * from public.member_reports where status = 'open' order by created_at;

-- ---------------------------------------------------------------------------
-- 1. Sign-up
-- ---------------------------------------------------------------------------
create table if not exists private.signup_settings (
  id boolean primary key default true check (id),
  invite_only boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table private.signup_settings is 'One row. invite_only = true limits new accounts to emails in public.invites.';
insert into private.signup_settings (id, invite_only) values (true, false) on conflict (id) do nothing;

create table if not exists private.signup_blocklist (
  email text primary key check (email = lower(email) and email like '%@%'),
  reason text,
  created_at timestamptz not null default now()
);
comment on table private.signup_blocklist is 'Google accounts (lower-case email) that may never create an account.';

revoke all on table private.signup_settings, private.signup_blocklist from public, anon, authenticated;

create or replace function private.check_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(btrim(coalesce(new.email, '')));
begin
  -- app_metadata is set by Supabase Auth, never by the person signing up.
  if coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'google' then
    raise exception 'google_only: accounts are created with Google sign-in only';
  end if;
  if em = '' or coalesce(new.raw_user_meta_data ->> 'email_verified', 'false') <> 'true' then
    raise exception 'email_unverified: Google has not verified this email address';
  end if;
  if exists (select 1 from private.signup_blocklist b where b.email = em) then
    raise exception 'signup_blocked: this Google account can''t create an account';
  end if;
  -- If the settings row is ever missing, fail closed: invite-only.
  if coalesce((select s.invite_only from private.signup_settings s where s.id), true)
     and not exists (select 1 from public.invites i where i.email = em) then
    raise exception 'invite_required: % is not on the invite list', em;
  end if;
  return new;
end;
$$;
comment on function private.check_signup() is
  'Runs before Supabase Auth creates a user: Google only, Google-verified email, not on private.signup_blocklist, and on public.invites while private.signup_settings.invite_only is on.';
revoke all on function private.check_signup() from public, anon, authenticated;
grant execute on function private.check_signup() to supabase_auth_admin;

drop trigger if exists require_invite_before_signup on auth.users;
drop trigger if exists check_signup_before_insert on auth.users;
create trigger check_signup_before_insert
  before insert on auth.users
  for each row execute function private.check_signup();
drop function if exists private.require_invite();

comment on table public.invites is
  'Who may create an account while private.signup_settings.invite_only is on. Add a row to invite someone; lower-case email.';

-- ---------------------------------------------------------------------------
-- 2. Age: 18 or older, date of birth required
-- ---------------------------------------------------------------------------
create or replace function private.check_member_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date is not null and new.birth_date > (current_date - interval '18 years')::date then
    raise exception 'too_young: SandBox members must be 18 or older' using errcode = '23514';
  end if;
  -- Finishing sign-up needs a date of birth, and an onboarded member can't clear it.
  -- Members who finished before this rule and have none can still save other changes.
  if coalesce(new.onboarding_completed, false) and new.birth_date is null
     and (tg_op = 'INSERT' or not coalesce(old.onboarding_completed, false) or old.birth_date is not null) then
    raise exception 'birth_date_required: add your date of birth to finish signing up' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists check_member_age on public.profiles;
create trigger check_member_age
  before insert or update of birth_date, onboarding_completed on public.profiles
  for each row execute function private.check_member_age();

create or replace function private.is_adult_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and coalesce(p.onboarding_completed, false)
      and p.birth_date is not null
      and p.birth_date <= (current_date - interval '18 years')::date
  );
$$;
comment on function private.is_adult_member(uuid) is 'True for a member who finished sign-up and is 18 or older.';
revoke all on function private.is_adult_member(uuid) from public, anon;
grant execute on function private.is_adult_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Blocks
-- ---------------------------------------------------------------------------
create table if not exists public.member_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists member_blocks_blocked_idx on public.member_blocks (blocked_id);
comment on table public.member_blocks is 'Who each member blocked. Only the blocker sees a block.';

alter table public.member_blocks enable row level security;
revoke all on table public.member_blocks from anon, authenticated;
grant select, delete on table public.member_blocks to authenticated;
grant insert (blocker_id, blocked_id) on table public.member_blocks to authenticated;

drop policy if exists "Members see their own blocks" on public.member_blocks;
drop policy if exists "Members block as themselves" on public.member_blocks;
drop policy if exists "Members unblock" on public.member_blocks;
create policy "Members see their own blocks" on public.member_blocks
  for select to authenticated using ((select auth.uid()) = blocker_id);
create policy "Members block as themselves" on public.member_blocks
  for insert to authenticated with check ((select auth.uid()) = blocker_id);
create policy "Members unblock" on public.member_blocks
  for delete to authenticated using ((select auth.uid()) = blocker_id);

create or replace function private.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.member_blocks m
    where (m.blocker_id = a and m.blocked_id = b) or (m.blocker_id = b and m.blocked_id = a)
  );
$$;
comment on function private.blocked_between(uuid, uuid) is 'True if either member blocked the other.';
revoke all on function private.blocked_between(uuid, uuid) from public, anon;
grant execute on function private.blocked_between(uuid, uuid) to authenticated;

-- Blocking removes any connection or request between the two. Runs as the
-- blocker, who may delete connections they're part of.
create or replace function private.drop_links_on_block()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.connections c
  where (c.requester_id = new.blocker_id and c.addressee_id = new.blocked_id)
     or (c.requester_id = new.blocked_id and c.addressee_id = new.blocker_id);
  return new;
end;
$$;
drop trigger if exists drop_links_on_block on public.member_blocks;
create trigger drop_links_on_block
  after insert on public.member_blocks
  for each row execute function private.drop_links_on_block();

-- The members you blocked, with a name to show in Settings.
create or replace function public.my_blocks()
returns table (id uuid, first_name text, last_name text, avatar_url text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name, p.avatar_url, b.created_at
  from public.member_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc;
$$;
comment on function public.my_blocks() is
  'SECURITY DEFINER by design: the caller''s own blocks with the blocked member''s name and photo only. Fixed empty search_path; executable by authenticated only.';
revoke all on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;

-- Connection requests: from and to members who are 18+, never across a block.
drop policy if exists "Members send requests as themselves" on public.connections;
create policy "Members send requests as themselves" on public.connections
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and not private.is_invisible(addressee_id)
    and private.is_adult_member((select auth.uid()))
    and private.is_adult_member(addressee_id)
    and not private.blocked_between(requester_id, addressee_id)
  );

-- Messages: still only to connections, and never across a block.
drop policy if exists "Members message their connections" on public.messages;
create policy "Members message their connections" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.connections c
      where c.status = 'accepted'
        and ((c.requester_id = (select auth.uid()) and c.addressee_id = messages.recipient_id)
          or (c.addressee_id = (select auth.uid()) and c.requester_id = messages.recipient_id))
    )
    and not private.blocked_between(sender_id, recipient_id)
  );

-- The directory: only for members who are 18+, only showing members who are
-- 18+, and never across a block. Otherwise unchanged.
create or replace function public.member_directory()
returns table (id uuid, first_name text, last_name text, avatar_url text, cover_url text, profile_type text, specialty text, headline text, bio text, age integer, region text, expertise_level text, employment_status text, business_sector text[], languages jsonb, skills text[], open_to_build boolean, open_type text, linkedin_url text, links jsonb, cv_path text, cv_name text, sprint_rating numeric, sprint_reviews integer, joined_at timestamptz, limited boolean, invisible boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as uid
    where private.is_adult_member(auth.uid())
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
      and p.birth_date is not null
      and p.birth_date <= (current_date - interval '18 years')::date
      and (not p.invisible or l.other is not null)
      and not exists (
        select 1 from public.member_blocks b
        where (b.blocker_id = me.uid and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = me.uid)
      )
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

create or replace function public.find_member(full_name text)
returns table (id uuid, first_name text, last_name text, avatar_url text, cover_url text, profile_type text, specialty text, headline text, bio text, age integer, region text, expertise_level text, employment_status text, business_sector text[], languages jsonb, skills text[], open_to_build boolean, open_type text, linkedin_url text, links jsonb, cv_path text, cv_name text, sprint_rating numeric, sprint_reviews integer, joined_at timestamptz, limited boolean, invisible boolean)
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
    and private.is_adult_member((select auth.uid()))
    and p.id <> (select auth.uid())
    and p.invisible
    and p.onboarding_completed
    and p.birth_date is not null
    and p.birth_date <= (current_date - interval '18 years')::date
    and not private.blocked_between((select auth.uid()), p.id)
    and char_length(btrim(full_name)) >= 3
    and lower(regexp_replace(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '\s+', ' ', 'g'))
      = lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g'))
  order by p.created_at desc
  limit 5;
$$;

comment on function public.member_directory() is
  'SECURITY DEFINER by design: returns the member-chosen public fields of other members (never birth_date or email; full profile only to accepted connections or when shared with everyone; CV only to accepted connections; invisible members only as name and join date unless connected). Only for callers who are 18+ members, only lists 18+ members, never across a block. Fixed empty search_path; executable by authenticated only.';
comment on function public.find_member(text) is
  'SECURITY DEFINER by design: finds invisible members by exact full name and returns only their name and join date. Only for callers who are 18+ members, never across a block. Fixed empty search_path; executable by authenticated only.';
revoke all on function public.member_directory() from public, anon;
grant execute on function public.member_directory() to authenticated;
revoke all on function public.find_member(text) from public, anon;
grant execute on function public.find_member(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Reports
-- ---------------------------------------------------------------------------
create table if not exists public.member_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  reported_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'fake', 'scam', 'inappropriate', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists member_reports_reported_idx on public.member_reports (reported_id);
create index if not exists member_reports_reporter_idx on public.member_reports (reporter_id);
comment on table public.member_reports is 'Reports members sent about other members. Write-only through the API; read in the dashboard.';

alter table public.member_reports enable row level security;
revoke all on table public.member_reports from anon, authenticated;
grant insert (reporter_id, reported_id, reason, details) on table public.member_reports to authenticated;

drop policy if exists "Members report as themselves" on public.member_reports;
create policy "Members report as themselves" on public.member_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and reported_id is not null
    and reported_id <> (select auth.uid())
  );
