# SandBox by MORI: rules for every session

The site is plain HTML, CSS and JavaScript, served as static files by GitHub Pages at
www.morisandbox.com. The backend is Supabase (Auth, Postgres with RLS, Realtime, Storage).
The README explains how everything works; docs/ holds the staging guide, ADRs, QA baselines,
security reviews and runbooks.

## Ground rules (from the collaboration and reliability brief, 24 Nov 2026)

- **Production is project ref `ovchugvbujrqkowjalfx`.** Never apply a migration, run a script or
  write data there without Brayden's explicit approval in the conversation. Staging first, always.
  Never run `supabase db push` against production: its applied migration versions differ from the
  file names in `supabase/migrations/` (see docs/security/review-2026-11-24.md).
- **Keys:** never commit the service-role key, or any key other than the public anon key.
  Service-role keys live only in GitHub Actions secrets and Brayden's local `.env` (git-ignored).
- **Every script and test that talks to Supabase refuses to run** if its URL contains the
  production ref (`tools/lib/env.mjs`), unless it's a read-only check Brayden explicitly asked for.
- **Logs and events never contain document text, task text or any member's personal data.**
  IDs, error codes and counts only.
- **Stop and ask Brayden** at every `D-xx` decision in the brief, before any change to production,
  and before deleting data, tables, columns or files.
- **Work gate by gate,** one branch and one pull request per gate (`collab/gate-<n>-<name>`). Every PR
  lists the audit IDs it covers, the tests that prove each, the test report, and anything not done.
- **Keep:**
  - the guest demo and its tests (`tests/demo.spec.mjs`) passing
  - the conventions: the shared shell, content in `assets/js/data.js`, `python3 tools/set_csp.py`
    for the security policy, `python3 tools/make_dark_css.py` after colour changes, translations
    through `tools/i18n/` (README → Languages)
  - cache tags (`?v=N`) bumped on every release
  - the README up to date
- **No framework migration.** The one allowed build step is the pinned, vendored editor/collaboration
  bundle described in the brief (section 2.2).

## Checks

- `npm run check`: lint, HTML validation, the demo suite and the production-guard tests.
- `npm run test:e2e`: the authenticated suite on staging (needs `.env`, see docs/staging.md).
- `npm run rls-check`: two-member row-level security check on staging.

## Deploying

The live site is built from the branch `claude/festive-allen-tw9q27` (GitHub Pages). Development
happens on `demo/revamp` and gate branches; `main` is updated by pull request.
