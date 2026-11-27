# MORI: end-to-end reliability and real-time collaboration
## Brief for Claude Code

Prepared 24 November 2026 for Brayden Lim, founder of SandBox by MORI Group.

**Inputs:**
- *Engineering Audit & Action Brief: End-to-End Reliability & Real-Time Collaboration* (24 Nov 2026), called "the audit" below
- a read of `brayden-andersen/mori` at `main` = `e378454`
- Supabase's Realtime documentation

**IDs:**
- `A-xx`, `B-xx`, `E2E-xx` and the gates are the audit's own IDs.
- `M-xx` numbers the rows of the audit's collaboration acceptance matrix (section 9).
- `D-xx` marks decisions Brayden must approve.

---

## 0. How to use this brief

1. **Work gate by gate,** in the order in section 3. Use one branch and one pull request per gate, for example `collab/gate-1-baseline`. Never combine gates in one PR.
2. **Every PR description lists:**
   - the audit IDs it covers
   - the tests that prove each one
   - a link to the test report (section 10)
   - anything not done, and why
3. **Stop and ask Brayden** at every `D-xx` decision, before any change to the production Supabase project, and before deleting data, tables, columns or files.
4. **Where this brief and the code disagree,** trust the code and say so in the PR.
5. **If `CLAUDE.md` doesn't have these ground rules yet,** add them in the first PR, so every future session follows them:

### Ground rules

- **Production is project ref `ovchugvbujrqkowjalfx`.** Never apply a migration, run a script or write data there without Brayden's explicit approval in the conversation. Staging first, always.
- **Keys:**
  - Never commit the service-role key, or any key other than the public anon key, to the repo.
  - Service-role keys live only in GitHub Actions secrets and Brayden's local `.env`, which is in `.gitignore`.
- **Every script and test that talks to Supabase must refuse to run** if its URL contains the production ref, unless it's a read-only check Brayden explicitly asked for.
- **Logs and events never contain document text, task text or any member's personal data.** IDs, error codes and counts only.
- **Keep:**
  - the guest demo, and its test suite `tests/demo.spec.mjs`, passing
  - the existing conventions: the shared shell, content in `data.js`, `tools/set_csp.py` for the CSP, `tools/make_dark_css.py` after colour changes
  - cache tags bumped on every release
  - the README updated
- **No framework migration.** The site stays plain HTML/CSS/JS served as static files. The one exception is in section 2.2: a pinned, vendored bundle for the editor and collaboration libraries.

---

## 1. Where the code stands

The audit's findings match the code:

| Area | What the code does today | Where |
|---|---|---|
| Browser tests | 10 Playwright tests, guest demo only. Every request to Supabase is aborted. Chromium only. | `tests/demo.spec.mjs`, `playwright.config.mjs` |
| CI | Lint, HTML validation, guest-demo tests on every push and PR | `.github/workflows/checks.yml` |
| Structured project state | **Tasks:** `projects.milestones` (jsonb, max 100). **Everything else:** `projects.workspace` (jsonb, max 256 KB). Saves re-apply the change function to the latest row, using `updated_at` as a version check (`db.changeColumn`, `workspace.change`, `state.changeTasks`). | `assets/js/db.js`, `workspace.js`, `state.js` |
| Refresh | No live updates for project state. It refreshes on page switch, on visibility change and every 20 s (`setInterval(refreshAll, 20000)`). | `assets/js/project.js` |
| Documents | `contenteditable` plus `document.execCommand`, autosaved 800 ms after typing as sanitized HTML in `project_docs.body`. **Last save wins.** Word export is HTML saved as `.doc`. | `assets/js/planner-docs.js` |
| Realtime | One `postgres_changes` channel per member, for connections and messages only | `db.js` (around line 566) |
| Project access | Owner plus `project_members` (role `cofounder` only), enforced by RLS through `private.is_project_owner()` / `private.is_project_member()` | migrations `20261106210844`, `20261109000717` |
| Supabase client | Vendored `assets/vendor/supabase-2.58.0.js`. The CSP allows only `'self'` plus the Supabase host. | `*.html` |

### Known weak spots

Confirm each of these in Gate 1:

- **A failed save reverts the change** (`workspace.change`'s error branch restores the old part). The user's input is lost instead of kept for a retry, which contradicts A-05.
- **Edits to a task that was just deleted vanish silently.** `updateTask` maps over a list that no longer contains it. That's E2E-06.
- **Change functions are closures,** so a pending change can't survive a reload. That's E2E-10.
- **A teammate's edits only appear after the 20 s poll.** That's B-05.
- **Two people editing one document overwrite each other.** That's B-01.
- **Removing a co-founder doesn't stop their open tab** from showing cached content until it next refreshes. That's E2E-04 and B-02.

---

## 2. Decisions and constraints

### 2.1 Fixed constraints
- **Backend:** Supabase only (Auth, Postgres with RLS, Realtime, Storage). No new server to run.
- **Hosting:** GitHub Pages, static files, www.morisandbox.com.
- **Budget:** the Free plan during development. Brayden decides on Pro before Gate 5 (D-05).
- **Scope:** exactly the audit's. Its exclusions stand: comments, suggesting mode, track changes, advanced tables, embedded media, anonymous share links, full offline-first editing, unlimited editors, monetisation, profile features, cosmetic redesign. **Also out of scope:** an invite-acceptance flow. "Invite" in the audit means the existing flow, where the owner adds a connection as a co-founder.

### 2.2 The one allowed build step
The editor and CRDT libraries are npm packages, and they can't load from a CDN (the CSP is `'self'`).
- Add `tools/build-vendor.mjs`, using esbuild as a dev dependency.
- It bundles the pinned packages into **one** file, `assets/vendor/collab-<version>.js`. That bundle exposes `window.MoriCollab` and contains a single copy of Yjs, since duplicate Yjs copies break collaboration.
- Commit the built file plus `assets/vendor/LICENSES-collab.txt`.
- Add a CI step that rebuilds the bundle and fails if `git diff --exit-code` shows a difference.
- Pin exact versions in `package.json`, with no `^` or `~`.

### 2.3 Decisions for Brayden (propose, then wait for approval)

| ID | Decision | Recommended default |
|---|---|---|
| **D-01** | Order of the gates | **1 → 3 → 2 → 4 → 5** (see section 3) |
| **D-02** | Collaboration engine (written up as ADR-001) | **Tiptap (MIT) + Yjs + a small MORI provider over Supabase Realtime private channels, with an append-only update log in Postgres.** Fallback if the Gate 2 spike fails: a hosted Yjs backend (e.g. Tiptap Collaboration Cloud or Liveblocks), with a Supabase Edge Function issuing access tokens. |
| **D-03** | Conflict rules for structured data, with the wording users see (ADR-002) | The table in section 6.3 |
| **D-04** | Staging and test identities (ADR-003) | A second Supabase project plus email/password test accounts allowed **only in staging** (section 4.1) |
| **D-05** | Supabase plan for the pilot | Pro before Gate 5: no inactivity pausing, daily backups, higher Realtime limits |
| **D-06** | JWT lifetime, which controls how quickly Realtime re-checks permissions | Lower from the default to 10–15 minutes in production, after staging shows no side effects |

Write each ADR as `docs/adr/ADR-00x-<name>.md` with these sections: context, options, decision, consequences, rollback.

### 2.4 Facts the design must respect (from Supabase's docs)
- **Private channels:** a private channel is authorized by RLS policies on `realtime.messages`; the client joins with `config: { private: true }`.
- **Enforcing them:** private channels are only enforced after the "Allow public access" setting is turned off in Realtime Settings.
- **Postgres Changes isn't covered:** Supabase's authorization announcement says this method "currently only supports Broadcast and Presence". Postgres Changes keeps relying on table RLS.
- **Re-checks happen on token refresh:** Supabase advises being "aware of your token expiration time to ensure users policies are checked regularly". **So removing someone from a project does not by itself disconnect their open channel.** Section 5.6 handles that explicitly.
- **Free-plan limits** (Supabase's Realtime limits page):
  - 200 concurrent connections (Pro: 500)
  - 100 messages per second (Pro: 500)
  - 20 presence messages per second
  - 256 KB broadcast payload
  - Design to a message budget (section 5.3) and measure it in the stress test.
- **Re-check these limits in the docs** before relying on them; they change.

---

## 3. Order of work

The audit's gates and exit criteria are unchanged. Only the order of Gates 2 and 3 is swapped (D-01):

| Step | Gate | Covers | Why here |
|---|---|---|---|
| 1 | **Gate 1: baseline reliability** | A-01, A-02, A-03, A-04, A-06 (skeleton) | Everything else is tested on top of it |
| 2 | **Gate 3: live structured workspace** | B-05, E2E-05, E2E-06, M-09 | Smaller and lower risk, reuses Gate 1's channel and test setup, gives founders visible value quickly |
| 3 | **Gate 2: collaborative document editing** | B-01, B-02, B-03, B-04, M-01 to M-08 | The biggest risk, so it starts with a time-boxed spike |
| 4 | **Gate 4: resilience and recovery** | A-05, B-06, B-07, E2E-07, E2E-10, M-10, M-11 | Hardens both workstreams |
| 5 | **Gate 5: controlled rollout** | Flags, monitoring, rollback drill | Pilot cohort only |

If Brayden keeps the audit's order instead, run Gate 2 before Gate 3. Nothing else changes.

---

## 4. Gate 1: baseline reliability (A-01 to A-04, plus A-06 skeleton)

### 4.1 A-01: staging environment and test identities (P0)

**Brayden does** (section 11):
- creates a Supabase project `sandbox-staging` in the same region as production (us-east-2)
- creates a Supabase access token
- adds the GitHub secrets

**Claude Code does:**

1. **Apply every migration to staging** with the Supabase CLI (`supabase link --project-ref <staging>`, then `supabase db push`). Document the commands in `docs/staging.md`.

2. **Allow test accounts in staging only.** Add a migration with:
   - `private.signup_settings.allow_test_accounts boolean not null default false`
   - `private.signup_settings.test_email_domain text`

   Then extend `private.check_signup()`: when `allow_test_accounts` is true, accept email/password accounts whose address ends in `@<test_email_domain>` (e.g. `test.morisandbox.com`). Every other rule stays.

   In production, the setting stays false **and** the Email provider stays disabled in Auth settings, so there are two locks.

   Prove it with a test that runs this check against production read-only, with Brayden's approval: `select allow_test_accounts from private.signup_settings` returns false.

3. **Seed script `tools/staging-seed.mjs`** (service-role key from `.env` or CI secret):
   - Creates 12 test users, `owner@`, `collab1@` … `collab11@` on the test domain, each with a confirmed email, an 18+ date of birth, a completed profile, the Founder or Specialist role, and connections between them.
   - Is idempotent: running it twice changes nothing.
   - Refuses to run against the production ref.

4. **Isolate each run.** Each test creates its own projects named `e2e-<runId>-<test>` and deletes them in `afterAll`. Add `tools/staging-clean.mjs`, which deletes leftover `e2e-` projects older than 24 hours.

5. **Point the site at staging.**
   - Add `assets/js/config.staging.js`, loaded instead of `config.js` only when `tests/serve.mjs` is started with `MORI_ENV=staging`. The server rewrites the one `<script>` tag.
   - Add the staging Supabase host to the CSP via `tools/set_csp.py`. It's harmless in production.
   - The production site never loads staging config.

6. **Sign in without Google.** A Playwright `globalSetup` signs each test user in with `signInWithPassword` (supabase-js in Node) and writes a `storageState` file per user, putting the session where the site expects it (the `sb-<ref>-auth-token` localStorage key). Tests start already signed in.

   Google OAuth itself can't be reliably automated, and Google prohibits trying. It's covered by the manual checklist in section 11.

**Acceptance:** tests run repeatedly with no personal credentials and never touch production; the guard test proves a production URL makes them abort.

### 4.2 Authenticated test suite layout

Create the following (keep the demo suite as it is):
```
tests/
  demo.spec.mjs              (existing, guest demo)
  e2e/
    fixtures.mjs             (users, contexts per user/device, project factory, helpers)
    journeys.spec.mjs        (A-02: E2E-01, E2E-02, E2E-08)
    team.spec.mjs            (A-03: E2E-03, E2E-04, E2E-09)
    consistency.spec.mjs     (A-04 / B-05: E2E-05, E2E-06)
    resilience.spec.mjs      (A-05: E2E-07, E2E-10)
    collab-docs.spec.mjs     (Gate 2: M-01 to M-08)
    perf.spec.mjs            (B-07: M-10, latency targets)
```

**Playwright projects in `playwright.config.mjs`:**
- `demo-chromium`: the existing tests.
- `e2e-chromium-desktop`, `e2e-webkit-desktop` (Safari engine) and `e2e-chromium-mobile` (Pixel profile): the e2e suite.

**Fixture helpers:**
- `asUser('collab1', { device: 'mobile' })` returns a page in its own browser context. Use separate contexts per user, and a second context per user to stand in for a second device.
- `newProject(owner, { members: [...] })`
- `waitForSynced(page)`: waits until the save indicator says "Saved" or "Live"

**Network helpers:**
- `context.setOffline(true/false)`
- `route.fulfill({ status: 500 })` for failed saves on `**/rest/v1/**`
- a CDP latency/packet-loss profile (Chromium only)
- background/foreground: emulate `document.hidden` plus `visibilitychange`, or open a second tab

Put the audit ID in every test title, e.g. `test('[E2E-03] owner adds collaborator …')`, so reports can map results back to IDs.

### 4.3 A-02: full journeys (P0)

- **E2E-01:**
  1. A new test user opens a deep link (`project.html?id=…#tasks`) while signed out.
  2. They sign in (the session is injected at the post-callback point, simulating what Google returns), complete onboarding and land on the intended page.
  3. Reloading doesn't repeat setup.
- **E2E-02:**
  1. Create a project and edit its name, focus, tags, rung, a task, a Mainframe widget and a lean-canvas field.
  2. Close the context, then open a new context as the same user on the mobile profile.
  3. Everything is there, and nothing is "phantom": compare the UI with a direct REST read.
- **E2E-08:**
  1. Write a document using every supported format.
  2. Export it to Word, close it and reopen it.
  3. Content and formatting match the stored copy. Compare the export's HTML against a stored, approved fixture for that document.
- **Sign-out:** after signing out, no project data stays readable in localStorage. Assert that no `ws.<pid>` or `docs.<pid>` keys remain for that user.

### 4.4 A-03: multiuser project lifecycle (P0)

- **E2E-03:** the owner adds `collab1`. Both see the project. `collab1` edits a task and project fields, and the owner sees them, after a refresh in Gate 1 and live from Gate 3.
- **E2E-04:** the owner removes `collab1` while `collab1` has the project open.
  - **Gate 1 bar:** `collab1`'s next read or write fails cleanly and the UI says access was removed. No cached data is shown after that point.
  - **From Gate 3:** live updates stop within the latency target.
- **E2E-09:** the owner deletes the project while two collaborators have it open. All sessions reach one clear "This project was deleted" state. Nothing is recreated, and no edit "succeeds" afterwards.
- **Visibility:** a non-member requests the project, its documents and its workspace directly through REST and gets nothing (extend `tools/rls-check.mjs`). They can't find it through any UI route either.

### 4.5 A-04: cross-user consistency (P0)

E2E-05 and E2E-06 with two users on two devices, in Gate 1 against the current code: record what happens. These are **expected** to fail partly in Gate 1. That's the baseline.

### 4.6 Gate 1 deliverables

- **`docs/qa/baseline-2026-11.md`:** every E2E scenario run against the current code, with pass/fail and a short note on each failure. The audit asks for "baseline failures catalogued", so failures are fine here as long as they're recorded.
- **A-06 skeleton** (section 10): the new workflow running, and reports produced.
- **Exit gate:** A-01 to A-04 tests exist and run, baseline catalogued, Brayden approves the baseline doc.

---

## 5. Gate 2: collaborative document editing (B-01 to B-04)

### 5.1 Step 0: the spike (time-boxed)

Before touching the real editor, build `tools/spikes/collab/` (not shipped). It contains a bare page with the vendored bundle, two to five browser contexts on staging, and the provider described in 5.3.

Run M-01 to M-06 against it. Write the results into ADR-001, then **stop for Brayden's approval (D-02).** If the spike can't meet M-01 to M-06 and the latency target, recommend the hosted fallback in the ADR instead of pushing on.

### 5.2 Editor replacement (B-01, B-04)

- **Replace the `contenteditable` + `execCommand` editor** in `planner-docs.js` with a Tiptap editor using StarterKit plus only the extensions the current toolbar needs. **Inventory first:** list every toolbar command and every tag and attribute the `clean()` allowlist accepts, and map each to a Tiptap node or mark. Nothing the toolbar offers today may disappear, and nothing new is added.
- **Links:** only `https:` and `mailto:` (the same rule as today). Reuse `clean()` on every HTML that leaves the editor (export, derived body).
- **Collaboration extensions:** `Collaboration` (Yjs document) and `CollaborationCaret` (remote carets and selections, with each member's name and a colour).
  - **Disable StarterKit's own undo/redo,** because Collaboration brings Yjs's undo manager. That manager only undoes the local user's changes, which is what M-04 requires.
- **Keep the existing layout:** toolbar, title field, status line, Word button and delete button.
- **Guest demo:** the same editor with a **local-only** Y.Doc (no provider), saved to the guest database, so the demo still works offline from Supabase.

### 5.3 The MORI provider (`assets/js/collab/provider.js`)

**Channel:**
- One private channel per open document, topic `doc:<doc_uuid>`, with `config: { private: true, broadcast: { self: false, ack: true } }`.
- Events:
  - `y`: a Yjs update, base64, with `from` (session id) and `uid` (member id)
  - `sv-req` / `sv-res`: state-vector sync for clients joining
  - `aw`: awareness (cursor and selection)
- Presence on the same channel is used **only** for join/leave (the editor list). Never use it for cursor movement, because of the 20 presence messages per second limit on Free.

**Opening a document:**
1. Load the newest row in `doc_snapshots` for the document, plus all `doc_updates` with `id > snapshot.upto_update_id`, in order. Apply them with origin `"db"`. Remember `lastDbId`.
2. If the document has no collaborative state yet, run the migration (5.5).
3. Join the channel. On `SUBSCRIBED`, send `sv-req` with this client's state vector; peers answer with `Y.encodeStateAsUpdate(doc, theirSV)` via `sv-res`. Then fetch `doc_updates` again with `id > lastDbId`, to close the gap while joining.
4. **Backstop:** broadcast is at-most-once, so while connected, fetch `doc_updates > lastDbId` every 15 s, and always after a reconnect or when the tab returns to the foreground.

**Local changes:**
- **Broadcast:** merge local updates (`Y.mergeUpdates`) and broadcast them at most every **150 ms**.
- **Persist:** insert merged local updates into `doc_updates` at most every **500 ms**. Each row carries a `client_update_id` (uuid) so retries are idempotent (unique `(doc_id, client_update_id)`; on conflict do nothing).
- **Pending buffer:** keep un-acknowledged updates in **IndexedDB** (`mori-collab` database, store per document) until the insert is acknowledged. On load, re-apply anything still pending and persist it again. That makes E2E-10 work. This is only a buffer for unsaved work, not offline-first editing.
- **Awareness:** throttle to at most 2 messages per second per client.
- **Message budget:** at most about 9 broadcasts per second per active editor (updates plus awareness). Ten editors should then stay under the Free plan's 100 messages per second. The stress test (M-10) must report Realtime quota errors (`tenant_events`, `too_many_*`), if any.

**Remote changes:**
- Apply `y` / `sv-res` with origin `"remote"` **only if `uid` is in the project's current member set.** The client keeps that set and refreshes it on membership events (5.6). Ignore everything else, and record a `client_events` row with the code only.
- Each client persists **only its own** updates. The author persists remote updates.

**Snapshots** (compaction and history, used by B-06):
- After every 200 persisted updates, or 10 minutes of editing, any client may build a snapshot. It must be built **from the database only**: newest snapshot plus updates up to id N, merged. Never build it from its in-memory doc, because only persisted, authorised updates may enter a snapshot.
- Insert it with `upto_update_id = N`, unique `(doc_id, upto_update_id)`, on conflict do nothing.
- During the pilot, **never delete `doc_updates`.** Pruning is a later, separately tested change.

**The derived HTML body:**
- Keep `project_docs.body` up to date for the documents list, search, export fallback and rollback.
- Five seconds after the last local persist, write `clean(editor.getHTML())` to `body`, **only if** `body_update_id < lastDbId` (a conditional update, so an older copy never overwrites a newer one).
- `body` is a derived copy, not the source of truth, while the collaboration flag is on.

### 5.4 Save and connection states (B-03)

One small state machine in `collab/status.js`, shown in the document's status line and announced in a polite live region (no more than once every 5 s):

| State | When | Wording (Brayden approves, D-03) |
|---|---|---|
| Connecting | Joining, or loading from the database | "Connecting…" |
| Saving | Local updates not yet acknowledged | "Saving…" |
| Saved | Every local update acknowledged by the database | "Saved" |
| Offline | No connection and something is pending | "Offline. Your changes are kept on this device and will save when you're back online." |
| Retrying | A save failed (network or 5xx) | "Couldn't save. Retrying…" plus a **Retry now** button |
| No access | RLS denial, project or document deleted, or member removed | "You no longer have access to this document." Read-only, with **Download my unsaved text** if anything is pending |

**"Saved" may only show when the pending set is empty and the last insert succeeded.** Test it with an intercepted, delayed insert: the UI must not say "Saved" before the response arrives.

Add a `beforeunload` prompt only while something is pending.

### 5.5 Existing documents: migration and compatibility (B-04)

- **Conversion on first open.**
  1. The client calls `claim_doc_seed(doc_id)`, a conditional update `set collab_seeded_at = now() where id = $1 and collab_seeded_at is null`. Exactly one client wins.
  2. The winner converts `body` HTML → Tiptap document → Yjs update, persists it as the first `doc_updates` row, and writes a `doc_snapshots` row of kind `migration` that keeps the **original HTML unchanged**.
  3. Other clients wait (polling every 1 s, up to 15 s), then load.
  4. If the winner disappears mid-way, release the claim after 60 s, via `seed_started_at` compared with `now()`.
- **Conversion report:** count anything the schema dropped (unknown tags or attributes) and record it in `client_events` as `kind = 'migration'`, with document id and counts only. Any document that lost something shows a one-time notice to its team, with a link to the original version (B-06).
- **Fixtures:** `tests/e2e/fixtures/docs/*.html` covers every format the old editor could produce, including pasted content. Round-trip test: old HTML → collaborative doc → export → compare with approved output. Zero unexplained differences.
- **Word export:** unchanged format (`.doc` HTML), now built from `clean(editor.getHTML())`. Regression-test it with the fixtures.

### 5.6 Permissions and revocation (B-02)

**Policies on `realtime.messages`:**
- `select` (join/receive) and `insert` (send) are allowed only when `realtime.topic()` is `doc:<id>` for a document whose project the user owns or belongs to, or `project:<id>` for such a project.
- Put the check in `private.can_use_topic(topic text)`: `security definer`, fixed `search_path = ''`, and parse the id safely (an invalid uuid returns false).
- Index whatever the policy looks up.

**Turn off "Allow public access"** in Realtime settings (Brayden, dashboard): first in staging, after confirming the existing `postgres_changes` channels for messages and connections still work; then in production.

**Revocation, in three layers:**
1. **The database refuses at once.** `doc_updates` and `project_docs` RLS deny the removed member's next write, and the client switches to "No access".
2. **An explicit signal:**
   - **Removing a member:** a trigger on `project_members` delete calls `realtime.send(…, 'member-removed', 'project:<pid>', true)` with the removed member's id. The removed member's channel is still joined (Realtime re-checks only on token refresh), so they receive it. Their client then:
     - stops the provider
     - leaves both channels
     - clears that project's cached data in localStorage and IndexedDB, keeping only unsaved text they wrote themselves, offered as a download
     - shows "You were removed from this project"

     Peers drop the member from their allowed set.
   - **Deleting a project:** the same mechanism, with a `project-deleted` event.
   - **Deleting a document:** the same mechanism, with a `doc-deleted` event, sent to `doc:<id>`.
3. **A shorter token lifetime (D-06)** limits how long a stale channel can last even if the signal is missed.

**Document deleted while open (M-08):** the editor locks and says who deleted it, and offers **Save my copy as a new document**. It never recreates the document silently. Inserts for a missing document fail on the foreign key, and the client treats that as deleted.

### 5.7 Feature flag

- `projects.collab boolean not null default false`. Members can't update it (it's not in the column grants). Brayden sets it with SQL.
- **Flag off:** the old editor and old save path, unchanged.
- **Flag on:** the collaborative editor.
- **Rollback is safe** because `body` is kept current. Turning the flag off shows the latest content in the old editor.
- Gates 2 to 4 run with the flag on for `e2e-` projects in staging only.

### 5.8 Database changes (one migration per concern, staging first)

1. **`collab_docs`:**
   - `doc_updates` (`id bigserial`, `doc_id → project_docs on delete cascade`, `project_id` (denormalised for RLS), `update_b64 text` with a size check, `client_update_id uuid`, `author_id default auth.uid()`, `created_at`; unique `(doc_id, client_update_id)`)
   - `doc_snapshots` (`id`, `doc_id`, `upto_update_id`, `state_b64`, `html`, `kind` in `auto | migration | pre-restore | manual`, `label`, `created_by`, `created_at`; unique `(doc_id, upto_update_id, kind)`)
   - `project_docs.collab_seeded_at`, `seed_started_at`, `body_update_id`
   - `projects.collab`
   - **Grants:** `select` and `insert` for the team on both new tables. **No `update` or `delete`** for `authenticated`.
2. **`realtime_topics`:** `private.can_use_topic()` and the `realtime.messages` policies.
3. **`realtime_signals`:** the triggers for `member-removed`, `project-deleted`, `doc-deleted`, and (Gate 3) `project-changed`.
4. **`client_events`:**
   - Columns: `id`, `at`, `user_id default auth.uid()`, `project_id`, `kind` (a checked list), `code`, `detail jsonb` (≤ 2 KB, never content), `app_version`.
   - Insert-only for members (`user_id = auth.uid()`). No select for `authenticated`; Brayden reads it in the dashboard.
   - Rows older than 90 days are deleted by a scheduled job, or in the README's monthly checklist if pg_cron isn't available.

After each migration, run Supabase's security advisor on staging and fix anything new.

### 5.9 Gate 2 exit

Matrix rows M-01 to M-08 pass with **2 to 5 concurrent editors** in Chromium and WebKit, B-04's fixture round-trip passes, and the latency target (section 8.3) is met at 5 editors. ADR-001 is approved.

---

## 6. Gate 3: live structured workspace (B-05)

### 6.1 Live notices instead of polling

- **Trigger** on `projects` update. When `workspace` or `milestones` changes, it calls `realtime.send(payload, 'project-changed', 'project:<pid>', true)` with:
  - `version` (the new `updated_at`)
  - `parts` (the top-level workspace keys that changed, plus `"tasks"` if `milestones` changed)
  - `by` (`auth.uid()`)

  **Never send the data itself.** Clients then call `workspace.load()` / reload tasks for the parts that changed.
- **Channel:** one private channel per open project, `project:<pid>`, opened by `project.js` and the homepage panels that show project data. It also carries the signals from 5.6.
- **Keep the 20 s refresh only as a fallback** while the channel isn't `SUBSCRIBED`. Show a small "Live" / "Reconnecting…" indicator in the planner header.

### 6.2 Serialisable operations instead of closures

Introduce `workspace.apply(pid, ops)` and `state.applyTaskOps(pid, ops)`. Each op is plain JSON:

```js
{ id: "<uuid>", part: "tasks", op: "add",    item: {...} }
{ id: "<uuid>", part: "tasks", op: "set",    target: "<taskId>", fields: { text: "…" }, base: { text: "<value before>" } }
{ id: "<uuid>", part: "tasks", op: "remove", target: "<taskId>" }
{ id: "<uuid>", part: "tasks", op: "move",   target: "<taskId>", status: "doing", before: "<taskId>|null" }
{ id: "<uuid>", part: "gtm",   op: "set",    target: "done.<key>", value: true }
```

- **Rewrite every call site:** the 11 `W.change` sites, the `change(part, fn)` helper in `planner-tools.js` and every function it serves, `addTask`, `updateTask`, `removeTask` and `moveTask`.
- **Express target values, never relative actions.** A checkbox sends `value: true` or `false`, never "toggle", because operations can be re-applied.
- **Apply ops** to the latest stored copy with the existing version check (`changeColumn`). Report the outcome of each op: `applied`, `noop`, or `conflict` with a reason.
- **Outbox** (A-05, E2E-07, E2E-10):
  - Ops wait in an outbox in IndexedDB (`mori-outbox`) until acknowledged, survive reload and replay in order.
  - Idempotency comes from the op `id`: keep a list of the last 500 applied op ids per project in `workspace._applied`, and skip repeats.
  - **No more silent reverts.** On a permanent rejection (RLS or validation), show what couldn't be saved, with its value, so it can be copied or retried.

### 6.3 Conflict rules (ADR-002, wording approved by Brayden, D-03)

| Situation | Rule | What users see |
|---|---|---|
| Different items or different parts | Both apply (already true; prove it) | Nothing special |
| Same field of the same item | Last write wins, but the earlier writer is told | "Budi changed this a moment ago" next to the field, with the current value |
| Edit an item someone deleted | Delete wins; the edit becomes a `conflict` | "This task was deleted by Budi." **Restore** (from history, 7.2) |
| Delete an item someone just edited | Delete wins | The editor sees the message above |
| Two moves of the same task | Last move wins, deterministically (ties by op id) | The task animates once to its final place; no duplicate |
| Moves around a moved or deleted neighbour | Insert relative to the nearest surviving neighbour, else the end of the column | No lost or duplicated tasks |
| Mainframe layout collisions | Apply both; overlapping widgets are re-flowed by the existing `resolve()` | Widgets shift; nothing removed |
| Lean canvas and other free-text fields | Last write wins per field, with the notice above | As above |
| Lists of entries (finance, campaigns, interviews…) | Keyed by id; add, set and remove as for tasks | As for tasks |
| Task cap (100) reached by concurrent adds | The add that crosses the cap is rejected | "This project already has 100 tasks." |

### 6.4 Gate 3 exit

E2E-05, E2E-06 and M-09 pass with two users on two devices in Chromium and WebKit. 95% of task and widget changes appear on the other device within 2 s (section 8.3). The fallback refresh and the "Live" indicator work.

---

## 7. Gate 4: resilience and recovery (A-05, B-06, B-07)

### 7.1 A-05: failure and recovery

`resilience.spec.mjs` covers, for **both** documents and structured state:
- **Going offline mid-edit:** the right state shows, local work is kept, and it saves on reconnect.
- **The server rejecting a save** (forced 500, then 403): retry for 5xx; the No access state for 403; nothing lost silently.
- **Background tab:** hide for 60 s, come back. The client catches up and nothing is duplicated.
- **Refresh during a pending save** (E2E-10): pending changes are restored from IndexedDB, and there's no false "Saved".
- **Reconnect after 30 s offline** (M-06): state reconciles, with no ghost overwrite.

Every failed or pending action must be visible. Assert on the status element's text, not on internal state.

### 7.2 B-06: version history and recovery

**Documents:**
- A **Version history** panel lists `doc_snapshots` (time, author, kind), with a read-only preview rendered from the snapshot.
- **Restore:**
  1. Write a `pre-restore` snapshot of the current state.
  2. Apply the old content **as a new edit** (replace the document's content in one transaction), so teammates see it live and the restore can itself be undone by restoring the `pre-restore` version.
  3. Never rewrite or delete `doc_updates`.
- The `migration` snapshot (original HTML) always appears in the list.

**Structured state:**
- A trigger on `projects` update writes `project_history` rows: `project_id`, `at`, `by`, `parts jsonb` (the **previous values of the changed parts only**), and `tasks_before jsonb` if tasks changed.
- Keep 30 days, at most 300 rows per project; the trigger prunes older rows. Watch database size: the Free plan's 500 MB is shared.
- **UI:**
  - "Recently deleted" in Tasks and in each list-based tool restores single items.
  - "See earlier versions" per tool shows the change log and can restore one field or item.
  - **No whole-workspace restore button,** because it would wipe later valid edits, and B-06 forbids that.

**Acceptance (M-11):** restoring is visible to everyone, keeps later valid edits, and the restore itself can be undone.

### 7.3 B-07: concurrency, accessibility and stress QA

- **Latency harness** (`perf.spec.mjs`):
  1. User A inserts a unique marker (a word in a document, a task title).
  2. User B waits until it appears; record the milliseconds.
  3. Take 50 samples per scenario, then report p50 and p95.
- **Scenarios:**
  - 2 editors
  - **5 editors** (pilot acceptance)
  - **10 editors** (stress: record degradation, quota errors and limitations; it doesn't have to meet the target)
- **Test profile** (state it in every report): GitHub-hosted ubuntu runner (US) ↔ Supabase us-east-2, no throttling; plus an informational 150 ms RTT / 1% loss profile in Chromium.
- **Known gap:** pilot users are in Jakarta. Brayden runs the manual two-device check from Indonesia with a pilot member (section 11) and records the result next to the automated numbers.
- **Accessibility:**
  - axe on the editor, the version panel and every save state, in both themes
  - a keyboard-only pass through editing, the toolbar, the version history and restore
  - remote carets hidden from screen readers
  - joins and leaves announced politely and rate-limited ("Budi joined")
  - one VoiceOver smoke test, by Brayden

### 7.4 Gate 4 exit

A-05, B-06, B-07 and every matrix row pass under normal, high-latency, disconnect/reconnect and background/foreground conditions; the performance numbers are recorded.

---

## 8. Gate 5: controlled rollout

1. **Before turning anything on:**
   - Brayden decides D-05 (Pro), since rollback depends on backups.
   - Run a **rollback drill in staging:**
     1. Enable the flag on a project and edit with three users.
     2. Turn the flag off and confirm the old editor shows the latest content.
     3. Turn it on again and confirm nothing was lost.
     4. Restore a document from a snapshot.

     Write it up in `docs/runbooks/collab-rollback.md`.
2. **Enable in production, in stages:**
   - Brayden's own test project first, for 2–3 days.
   - Then the pilot cohort's projects, by flag, one by one.
3. **Monitoring:**
   - `docs/runbooks/collab-monitoring.md` with saved SQL queries on `client_events`: save failures, sync gaps, migration losses, revocation events and quota errors per day.
   - Brayden checks it daily during the pilot.
   - **Thresholds for turning a project's flag off:** any data-integrity error, any access error, or save failures above 1% of saves in a day.
4. **Exit gate:** no unresolved P0 data-integrity, access or concurrency failures; the rollback drill passed and is written up.

### 8.1 Feature flags at a glance
- `projects.collab`: the collaborative editor, per project.
- The live structured workspace (Gate 3) needs no flag. It has no data migration, and its fallback is the existing refresh. If Brayden wants one anyway, use `projects.live` with the same pattern.

### 8.2 What Claude Code must never do during rollout
Change flags, run SQL or apply migrations in production without Brayden's go-ahead in the conversation.

### 8.3 Performance targets (from the audit; to be agreed with Brayden)
- Documents: 95% of remote edits visible within **1.5 s**.
- Workspace: 95% of task/widget changes visible within **2 s**.
- Measured under the test profile in 7.3. These are pilot targets, not guarantees.

---

## 9. Traceability: every audit requirement mapped to tests

### E2E inventory

| ID | Test file | Browsers and devices | Gate |
|---|---|---|---|
| E2E-01 | journeys | Chromium desktop, WebKit, Chromium mobile | 1 |
| E2E-02 | journeys | Desktop → mobile (two contexts) | 1 |
| E2E-03 | team | Two users | 1 (refresh), 3 (live) |
| E2E-04 | team | Two users | 1 (next action), 3 (live) |
| E2E-05 | consistency | Two users, two devices | 3 |
| E2E-06 | consistency | Two users, two devices | 3 |
| E2E-07 | resilience | Chromium (+ WebKit offline) | 4 |
| E2E-08 | journeys | Chromium, WebKit | 1, again in 2 |
| E2E-09 | team | Owner + 2 collaborators | 1 |
| E2E-10 | resilience | Chromium, WebKit | 4 |

### Collaboration matrix

| ID | Audit row | Test file | Priority | Gate |
|---|---|---|---|---|
| M-01 | Two users type at once | collab-docs | P0 | 2 |
| M-02 | Same paragraph / position | collab-docs | P0 | 2 |
| M-03 | Concurrent formatting | collab-docs | P0 | 2 |
| M-04 | Undo / redo | collab-docs | P0 | 2 |
| M-05 | Mid-edit disconnect | collab-docs + resilience | P0 | 2, 4 |
| M-06 | Reconnect after 30 s | resilience | P0 | 2, 4 |
| M-07 | Permission revoked mid-session | collab-docs + team | P0 | 2 |
| M-08 | Document deletion during edit | collab-docs | P0 | 2 |
| M-09 | Task move / deletion collision | consistency | P1 | 3 |
| M-10 | 5 active editors; 10 stress | perf | P1 | 4 |
| M-11 | Version restore | collab-docs + consistency | P1 | 4 |

### Required work items

| ID | Where in this brief |
|---|---|
| A-01 | 4.1 |
| A-02 | 4.3 |
| A-03 | 4.4 |
| A-04 | 4.5 (baseline), 6 |
| A-05 | 6.2, 7.1 |
| A-06 | 10 |
| B-01 | 5.2, 5.3 |
| B-02 | 5.3, 5.6 |
| B-03 | 5.3, 5.4 |
| B-04 | 5.5 |
| B-05 | 6 |
| B-06 | 7.2 |
| B-07 | 7.3 |

---

## 10. A-06: reporting and the CI gate

### Workflows
- **`checks.yml`** (existing): add the vendor-bundle freshness check (2.2). Unchanged otherwise.
- **`e2e-staging.yml`** (new):
  - **Triggers:** pull requests to `main` that touch `assets/**`, `supabase/**`, `tests/**`, `*.html` or `playwright.config.mjs`; a nightly run (which also keeps the free staging project from pausing); manual dispatch.
  - **Job:** `concurrency: e2e-staging`, so runs never overlap on shared staging.
  - **Steps:**
    1. Apply pending migrations to **staging** (`supabase db push` with the staging secrets).
    2. Seed (idempotent).
    3. Run the e2e projects.
    4. Clean up.
    5. Build the report.
  - **Secrets:** `STAGING_SUPABASE_URL`, `STAGING_ANON_KEY`, `STAGING_SERVICE_ROLE_KEY`, `STAGING_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `TEST_USER_PASSWORD`.

### Evidence on every run
- Playwright HTML report, plus trace, screenshot and video **on failure**, uploaded as artifacts and kept for 30 days.
- **`tools/report.mjs`** turns the JSON reporter output into `reports/<date>-<sha>.md`:
  - one row per audit ID (from the `[ID]` in test titles): status, browser/device, duration, and for failures the expected vs actual result plus the artifact link
  - a performance section with p50 and p95 per scenario and the test profile
- The PR's report is linked in its description. Reports for release candidates are committed under `reports/`.

### Gate
- Brayden adds branch protection on `main` requiring **Checks** and **E2E staging** to pass (section 11).
- No PR that touches collaboration merges with an unresolved P0 failure.

### Release checklist
`docs/release/collab-pilot-checklist.md`, one line per item of the audit's definition of done:
- functional reliability
- collaboration
- availability of edits
- access and privacy
- compatibility
- rollback
- evidence

Each line has a link to its evidence and a box for Brayden to tick, with the date.

---

## 11. What Brayden does (Claude Code can't)

| When | Action |
|---|---|
| Before Gate 1 | Create the Supabase project **sandbox-staging** (Free, region us-east-2). Create an access token (Account → Access Tokens). Send Claude Code the staging project ref, never keys in chat. |
| Before Gate 1 | In **staging** Auth: enable the Email provider (for test accounts). In **production**: confirm Email is **off** and Google is the only provider. |
| Before Gate 1 | Add the GitHub Actions secrets listed in section 10 (repo → Settings → Secrets and variables → Actions). |
| End of Gate 1 | Approve `docs/qa/baseline-2026-11.md`. Turn on branch protection for `main` (require Checks and E2E staging). |
| Gate 1 / Gate 2 | Decide D-01 (order) and D-02 (engine, after the spike). |
| Gate 3 | Approve ADR-002 and every user-facing message (D-03). |
| Gate 2 | Realtime settings → turn **off** "Allow public access": staging first, production after Claude Code confirms. |
| Gate 4 | Decide D-06 (shorter JWT lifetime, Auth settings). Do the manual checks below. |
| Before Gate 5 | Decide D-05 (Pro). Watch the rollback drill. Flip `projects.collab` per project. Check monitoring daily. Sign the release checklist. |

**Manual checks** (record the results in the report):
1. Google sign-in on Chrome (desktop) and Safari (iPhone), from a deep link: you land where the link pointed.
2. Co-edit a document and a task board with a pilot member **in Indonesia**, phone + laptop, for 10 minutes. Note anything slow or surprising.
3. One pass with VoiceOver on iPhone through opening, editing and the version history.

---

## 12. Definition of done (audit section 08)

| Condition | Evidence |
|---|---|
| Functional reliability | All P0 E2E tests pass on staging with real test accounts and server data (the report) |
| Collaboration | M-01 to M-08 pass; no silent last-save-wins (the report) |
| Availability of edits | Save states accurate through pending, disconnect, retry and access changes (resilience report, plus the delayed-insert test) |
| Access and privacy | Removal and permission changes apply to open sessions (E2E-04, M-07); RLS check script passes; the security advisor is clean |
| Compatibility | Fixture round-trip and Word export regression pass; the migration report shows zero unexplained losses |
| Rollback | Staging rollback drill written up and passed |
| Evidence | QA report, performance numbers and the signed release checklist archived in `reports/` and `docs/release/` |

The **explicit non-scope** (section 2.1) stays out. If a gate tempts you into any of it, write it down under "Later" in the PR, and don't build it.
