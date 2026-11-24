# Baseline, November 2026 (Gate 1)

**For Brayden's approval.** Every E2E scenario in the audit, against the code as it is today
(`demo/revamp` at `0bf6856`, the live site). The audit asks for "baseline failures catalogued", so
failures here are expected: they are what Gates 2–4 fix.

**How each row was established**

- **Run:** executed and passed in this environment.
- **Code:** established by reading the code (file:line). The test exists and is ready to run, but the staging
  project doesn't exist yet, so it hasn't run on real accounts.
- Tests marked `test.fail()` encode a known baseline failure. While the gap remains, they report
  "baseline: known failure". When a later gate fixes it, they error until the marker is removed.

## Summary

| ID | Scenario | Baseline | Basis | Test |
|---|---|---|---|---|
| A-01 | Tests never touch production | **Pass** | Run (5 guard tests) | `tests/guard.spec.mjs` |
| E2E-01 | Deep link → sign-in → onboarding → intended page; reload doesn't repeat setup | Expected pass | Code (the guest-demo version passes) | `journeys` |
| E2E-02 | Edits on a laptop all present on a phone; nothing phantom | Expected pass | Code | `journeys` |
| E2E-03 | Owner adds collaborator; both see it; edits arrive (after refresh) | Expected pass after a refresh; **not live** | Code | `team` |
| E2E-04 | Collaborator removed while the project is open | **Fail** (user-facing part) | Code | `team` (2 tests) |
| E2E-05 | Concurrent edits to different items both survive | Expected pass (after refresh) | Code | `consistency` |
| E2E-06 | Edit to a task a teammate just deleted | **Fail**: edit lost silently | Code | `consistency` |
| E2E-07 | Offline / failed save | **Fail**: change reverted, input lost | Code | Gate 4 |
| E2E-08 | Every format survives the editor and the Word export | **Pass** (guest demo); staging version ready | Run | `docs-fixture`, `journeys` |
| E2E-09 | Project deleted while two collaborators have it open | **Fail** | Code | `team` |
| E2E-10 | Reload during a pending save | **Fail**: pending changes lost | Code | Gate 4 |
| A-02 | After sign-out, no project data left in the browser | **Fail** | Code | `journeys` |
| A-03 | A non-member gets nothing through the API or any page | Expected pass | Code + production policy read | `team`, `tools/rls-check.mjs` |
| B-01 | Two people editing one document | **Fail**: last save wins | Code | Gate 2 |
| B-05 | A teammate's edits appear without a refresh | **Fail**: 20 s poll | Code | Gate 3 |

## Findings, with evidence

### 1. Saves after removal or deletion look successful but go nowhere (E2E-04, E2E-09). New.
`db.changeColumn` returns `null` when the project row can no longer be read
(`assets/js/db.js:447`), whether the member was removed or the project deleted. Both save paths
treat `null` as success:

- `workspace.change` resolves and keeps the local copy (`assets/js/workspace.js:110`).
- `state.commit` resolves without an error (`assets/js/state.js:657`).

So a removed collaborator or a deleted project's open tab can keep "saving" edits that never reach
the server, and nothing tells them. RLS does keep the data out of the database; the gap is that the
UI says nothing, and can show stale data indefinitely.

### 2. A failed save reverts the change, and the input is lost (A-05, E2E-07)
- **Workspace:** on any other error, `workspace.change` puts the old part back:
  `now[part] = before[part]` (`assets/js/workspace.js:115`).
- **Tasks and project fields:** `state.commit` restores the previous values (`assets/js/state.js:660`).

The user sees an error toast, but what they typed is gone and can't be retried.

### 3. Editing a task that was just deleted vanishes silently (E2E-06)
`updateTask` maps over the latest list (`assets/js/state.js:688`). If the task isn't there, the map
changes nothing, and the save "succeeds" with no message.

### 4. Pending changes can't survive a reload (E2E-10)
Saves are closures (`workspace.change(pid, part, fn)`, `state.changeTasks(pid, change)`), held in
memory and re-applied to the latest row. A reload or a closed tab loses anything still in flight.

### 5. Teammates' edits only appear on refresh (B-05)
- **Project pages:** refresh on a 20-second timer, on tab focus and on page switch
  (`assets/js/project.js:442-444`).
- **Live updates:** the only Realtime channel carries connections and messages (`assets/js/db.js:567`).

### 6. Two people editing one document overwrite each other (B-01)
- **Saves:** `saveDoc` is a plain update with no version check (`assets/js/db.js:496`); the last save wins.
- **Incoming changes:** a teammate's newer version is applied only when this editor isn't focused or dirty
  (`assets/js/planner-docs.js:150`). Otherwise the next autosave (800 ms after typing) overwrites it.

### 7. Sign-out leaves project data in the browser (A-02). New.
`forgetPrivate()` removes other members' details, links, messages, the project list and blocks
(`assets/js/state.js:829-831`). The member's cached workspaces (`mori.<uid>.ws.<pid>`) and documents,
**including document text** (`mori.<uid>.docs.<pid>`), stay in localStorage. On a shared computer, the
next person could read them through the browser's developer tools.

### 8. A removed co-founder's open tab keeps showing the project (E2E-04, B-02)
No signal reaches an open tab when membership changes, and the cached copy stays on screen until
the member navigates. With finding 1, edits there appear to save.

## Compatibility baseline for the editor (B-04)

`tests/e2e/fixtures/docs/all-formats.html` holds every format the current editor can produce, plus
pasted content. Its cleaned Word export is stored as
`tests/e2e/fixtures/docs/all-formats.export.html` (**proposed for approval**). What the current
cleaner does:

- **Kept:** headings 1–3, paragraphs, bold, italic, underline, strike, both list types, quotes, line
  breaks, rules, `https:` and `mailto:` links (which open in a new tab with `noopener`), Unicode and emoji.
- **Dropped:** scripts, images, styles, classes and event handlers.
- **Links that lose their address but keep their text:** `javascript:` and plain `http:` links.
- **A pasted table becomes plain text,** with no paragraph around it.

The Gate 2 editor must reproduce this output, or explain each difference.

## Not yet run, and why

The authenticated suite (`tests/e2e`, 12 tests × 3 browsers) needs the staging project
(`docs/staging.md`, steps for Brayden). Once it exists, the first run of the e2e-staging workflow
turns the **Code** rows above into **Run** rows, and the report goes in `reports/`.
