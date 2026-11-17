-- Invite-only sign-in, for the demo release.
--
-- Only people on the invite list can create an account. The list is
-- public.invites, one row per email address. To invite someone, add a row
-- from the Supabase dashboard (Table Editor → invites → Insert row) or with:
--
--   insert into public.invites (email, note) values ('someone@example.com', 'interview, 20 Nov');
--
-- The check runs before a row is written to auth.users, so an uninvited
-- Google sign-in creates no account and no profile: Supabase sends the
-- person back to the site with "Database error saving new user", and the
-- landing page explains that sign-in is invite-only and offers the guest
-- demo. Accounts that already exist are not affected (the trigger only runs
-- on insert). To open sign-up to everyone again, drop the trigger.

create table if not exists public.invites (
  email text primary key check (email = lower(email) and email like '%@%'),
  note text,
  created_at timestamptz not null default now()
);
comment on table public.invites is 'Who may create an account while sign-in is invite-only. Add a row to invite someone; lower-case email.';

-- Nobody reaches the list through the API: no policies for anon or authenticated.
-- The dashboard (as postgres, the owner) and the trigger below can.
alter table public.invites enable row level security;
revoke all on table public.invites from anon, authenticated;

create or replace function private.require_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not exists (select 1 from public.invites i where i.email = lower(new.email)) then
    raise exception 'invite_required: % is not on the invite list', coalesce(new.email, '(no email)')
      using hint = 'Ask for an invite, or explore the guest demo.';
  end if;
  return new;
end;
$$;
comment on function private.require_invite() is 'Refuses new auth.users rows whose email is not in public.invites (invite-only sign-in).';
revoke all on function private.require_invite() from public;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.require_invite() to supabase_auth_admin;

drop trigger if exists require_invite_before_signup on auth.users;
create trigger require_invite_before_signup
  before insert on auth.users
  for each row execute function private.require_invite();
