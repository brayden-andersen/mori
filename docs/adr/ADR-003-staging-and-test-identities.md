# ADR-003: Staging environment and test identities

**Status:** Proposed (decision D-04, awaiting Brayden's approval) · 24 November 2026

## Context

The audit (A-01) asks for end-to-end tests with real accounts and server data that never touch
production. Today the only automated tests use the guest demo, with every request to Supabase
blocked. Sign-in is Google only, and production's `private.check_signup()` refuses anything else.
Google OAuth can't be automated (and Google prohibits trying).

## Options

1. **A second Supabase project for staging, with email/password test accounts allowed only there.**
   Free plan, same region as production, same migrations. A database setting
   (`allow_test_accounts`, off by default) lets one test domain sign up with a password.
2. **Supabase branching.** Per-PR database branches. Needs the Pro plan, and branches are
   created from migrations, so the same test-account question remains.
3. **A local Supabase stack in CI** (`supabase start`, Docker). No shared state and free, but not
   the hosted Realtime, Auth and Storage the site really uses; slower CI; Realtime limits and
   private-channel settings differ from the hosted service.
4. **Mock Supabase in the browser.** Fast, but it tests the mock, not RLS, triggers or Realtime,
   which are exactly what the audit is about.

## Decision (proposed)

Option 1. A staging project `sandbox-staging` (Free, us-east-2), migrations applied by
`supabase db push` from CI, and twelve seeded test members on `test.morisandbox.com`. Test accounts
need **two** things that production never has: the Email provider enabled in Auth settings, and
`private.signup_settings.allow_test_accounts = true` (migration
`20261124120000_staging_test_accounts.sql`). Production keeps both off; even with Email on,
production's check would refuse a non-Google account.

Tests sign in once per member in Node (`signInWithPassword`) and hand the session to the site at
its Google-callback address, so the site's real sign-in code completes. Every script and test
refuses the production project ref.

## Consequences

- Real RLS, triggers, Realtime and Storage are exercised; failures are real.
- One shared staging project: runs are serialised (`concurrency: e2e-staging`) and each test names
  and deletes its own `e2e-` projects; a clean-up script removes leftovers.
- The free staging project pauses after a week without activity; the nightly run prevents it.
- Real Google sign-in stays a manual check (section 11 of the brief).
- Staging adds about 6 secrets to GitHub; the service-role key exists only there and in a local
  git-ignored `.env`.

## Rollback

Delete the staging project and the secrets; the e2e workflow then skips itself. The migration only
adds two settings that default to off and keeps every existing sign-up rule, so it can stay in
production harmlessly, or be reverted by restoring the previous `check_signup()` (in
`20261116120000_open_google_signin.sql`) and dropping the two columns.
