-- A-01: test accounts for the staging project only.
--
-- Staging needs real, signed-in test members without Google (Google sign-in can't be automated).
-- Two settings, both OFF by default, let staging accept email/password accounts on one test
-- domain. Production keeps them off, and its Auth settings keep the Email provider disabled:
-- two locks. Everything else check_signup() does is unchanged.
--
-- Turn it on in STAGING only (SQL editor, or the e2e workflow's seed step):
--   update private.signup_settings
--      set allow_test_accounts = true, test_email_domain = 'test.morisandbox.com'
--    where id;
-- Prove it's off in production (read-only, with Brayden's go-ahead):
--   select allow_test_accounts from private.signup_settings;   -- false

alter table private.signup_settings
  add column if not exists allow_test_accounts boolean not null default false,
  add column if not exists test_email_domain text;

alter table private.signup_settings
  drop constraint if exists signup_settings_test_domain_check;
alter table private.signup_settings
  add constraint signup_settings_test_domain_check
  check (not allow_test_accounts or (test_email_domain is not null and test_email_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'));

comment on column private.signup_settings.allow_test_accounts is
  'STAGING ONLY. When true, email/password accounts on test_email_domain may sign up (automated tests). Must stay false in production.';
comment on column private.signup_settings.test_email_domain is
  'The only domain test accounts may use while allow_test_accounts is true, e.g. test.morisandbox.com.';

create or replace function private.check_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(btrim(coalesce(new.email, '')));
  st private.signup_settings%rowtype;
begin
  select * into st from private.signup_settings s where s.id;

  -- Staging test accounts: email/password, on the one test domain, only while the setting is on.
  if coalesce(st.allow_test_accounts, false)
     and coalesce(new.raw_app_meta_data ->> 'provider', '') = 'email'
     and st.test_email_domain is not null
     and em like '%@' || st.test_email_domain then
    if exists (select 1 from private.signup_blocklist b where b.email = em) then
      raise exception 'signup_blocked: this account can''t be created';
    end if;
    return new;
  end if;

  -- Everyone else: unchanged.
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
  if coalesce(st.invite_only, true)
     and not exists (select 1 from public.invites i where i.email = em) then
    raise exception 'invite_required: % is not on the invite list', em;
  end if;
  return new;
end;
$$;

comment on function private.check_signup() is
  'Runs before Supabase Auth creates a user: Google only, Google-verified email, not on private.signup_blocklist, and on public.invites while private.signup_settings.invite_only is on. In staging only (allow_test_accounts), email/password accounts on test_email_domain are allowed for automated tests.';
revoke all on function private.check_signup() from public, anon, authenticated;
grant execute on function private.check_signup() to supabase_auth_admin;
