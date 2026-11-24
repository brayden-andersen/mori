# Staging: the Supabase project the tests use

Production (`ovchugvbujrqkowjalfx`) is never used by tests or scripts: everything here refuses it
(`tools/lib/env.mjs`). Staging is a second, free Supabase project with the same schema, twelve test
members, and nothing real in it.

## One-time setup (Brayden)

1. **Create the project.** Supabase dashboard → New project → name `sandbox-staging`, plan **Free**,
   region **us-east-2** (the same as production). Keep the database password.
2. **Auth → Providers → Email: on** (staging only). In production, check that Email stays **off**
   and Google is the only provider.
3. **Create an access token:** Account → Access Tokens. It lets CI apply migrations to staging.
4. **Apply the schema to staging** (from this repository, with the [Supabase CLI](https://supabase.com/docs/guides/cli)):

   ```bash
   supabase link --project-ref <staging-ref>
   ```

   ```bash
   supabase db push
   ```

   `supabase link` asks for the staging database password. Never link production here.
5. **Allow test accounts in staging** (SQL editor, staging project only):

   ```sql
   update private.signup_settings
      set allow_test_accounts = true, test_email_domain = 'test.morisandbox.com'
    where id;
   ```

6. **GitHub secrets** (repository → Settings → Secrets and variables → Actions → New repository secret):

   | Secret | Where it comes from |
   |---|---|
   | `STAGING_SUPABASE_URL` | staging → Settings → API → Project URL (`https://<staging-ref>.supabase.co`) |
   | `STAGING_ANON_KEY` | staging → Settings → API → anon public key |
   | `STAGING_SERVICE_ROLE_KEY` | staging → Settings → API → service_role key (secret: only here and in your `.env`) |
   | `STAGING_DB_PASSWORD` | the password from step 1 |
   | `SUPABASE_ACCESS_TOKEN` | the token from step 3 |
   | `TEST_USER_PASSWORD` | make one up (20+ characters); all twelve test members use it |

7. **Tell Claude Code the staging project ref** (the `<staging-ref>` part only; never keys in chat).

## Running locally

Create `.env` in the repository folder (it's git-ignored) with the same names as the secrets:

```
STAGING_SUPABASE_URL=https://<staging-ref>.supabase.co
STAGING_ANON_KEY=…
STAGING_SERVICE_ROLE_KEY=…
TEST_USER_PASSWORD=…
```

Then:

```bash
npm run staging:seed
```

```bash
npm run test:e2e
```

```bash
npm run rls-check
```

```bash
npm run report
```

- `staging:seed` creates or updates `owner@` and `collab1@` … `collab11@test.morisandbox.com`: 18+,
  finished profiles, the owner connected to collab1–10, collab11 connected to nobody. Safe to repeat.
- `test:e2e` serves the site with `MORI_ENV=staging` (pages load `assets/js/config.staging.js`, filled
  in from `.env`, and their security policy names the staging host), signs every test member in once
  without Google (`tests/e2e/global-setup.mjs`, saved to the git-ignored `tests/e2e/.auth/`), and runs
  the suite in Chromium, WebKit and a Chromium phone. Each test makes its own `e2e-<run>-<test>`
  projects and deletes them.
- `staging:clean` deletes `e2e-` projects left behind by crashed runs (older than 24 h; `--all` for every one).
- `rls-check` probes row-level security as two members (owner and the unconnected collab11).
- `report` writes `reports/<date>-<sha>.md`: one row per audit ID.

## In CI

`.github/workflows/e2e-staging.yml` runs on pull requests to `main` that touch the site, tests or
database, every night (which also stops the free project from pausing), and on demand. It applies
pending migrations to staging, seeds, runs the suite and the RLS check, cleans up, and uploads the
report with traces, screenshots and videos of failures (kept 30 days). Runs never overlap. Until
the secrets exist it says so and does nothing.

Traces of failed tests can contain staging session tokens and test data: they're short-lived and
belong to test accounts, never to real members.

## Google sign-in

It can't be automated (Google forbids it), so the tests start at the point Google returns to
(`/?auth=callback`) with a session from an email/password test account. Real Google sign-in is
on the manual checklist (brief, section 11).
