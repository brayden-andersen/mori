# Mori: Sandbox — concept site

The clickable concept for **SandBox by MORI Group**: an open-access place where Indonesia's aspiring founders and specialists *find their people, build their idea and earn the spotlight*.

Plain HTML, CSS and JavaScript. There is no build step. It uses the design language of the original Sandbox drafts: aura background, glass panels, Inter, and the blue and orange accents.

## Pages and flow

| Page | What it is |
| --- | --- |
| `index.html` | **Landing page**, laid out like a professional network's landing page. Sign in and join use Google. |
| `onboarding.html` | **Sign-up questions** for new members: name, age and region · founder or specialist · years of experience and employment status · up to 3 industries (popular picks + searchable full list) · LinkedIn and/or CV upload · languages. Reopen it with `onboarding.html?edit=1` to update answers. |
| `home.html` | **Homepage**: greeting, entry cards, your pinned project, recent messages, insights. |
| `projects.html` | **Projects**: search, tag filters, sort, pagination, project drawer (pin to homepage), declare a new project. |
| `network.html` | **Network**: Explore the members who signed up, connection Requests, and Messages (your connections; messaging is coming soon). |

**Profile**, **Settings** and **Notifications** are modals in the Account menu. The profile shows the onboarding answers. Notifications come from connection requests: someone asking to connect, or accepting your request.

Apart from the homepage insights, nothing is pre-filled: projects appear once the member declares them, and the Network shows real members.

### Network

- **Explore** lists everyone who finished the sign-up questions, except you. Search covers names, headlines, skills, regions, industries and languages.
- **Filters:** founder or specialist · years of experience · minimum sprint rating · industry (searchable checklist; industries members chose are listed first) · open to build. **Sort** by newest, sprint rating, experience or name.
- **Connect** from a card, or from a member's profile with an optional note (300 characters). The other member sees it under **Requests**, in the nav badge and in Notifications, and can accept or ignore it. You can withdraw a request or remove a connection.
- **Connections** can see each other's CV. A member who sets **Settings → Privacy → Profile visibility** to *Connections* shows only their name, photo, role and headline to everyone else.
- **Sprint rating** is shown on cards and profiles. Members can't set it themselves; it stays empty ("No sprint rating yet") until sprint reviews exist.

The sign-in flow works like this:
1. "Continue with Google" shows a loading screen and goes to Google.
2. Google returns the member to `index.html?auth=callback`, which keeps showing the loading screen.
3. New members go to onboarding; returning members go to their start page.
4. Anyone who opens an app page before finishing onboarding is sent back to it.

## Run it locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Supabase (sign-in, profiles, CVs, network)

The site uses the Supabase project **Sandbox**. The URL and anon key are in `assets/js/config.js`; the anon key is safe in browser code because row-level security protects the data.

- **Auth:** Google provider. In Supabase → Authentication → URL Configuration, add every address that serves the site to **Redirect URLs**, e.g. `http://localhost:4173/**` and later `https://<you>.github.io/**`.
- **`public.profiles`:** one row per member, readable and writable only by that member. The onboarding answers map to these columns:
  - `first_name`, `last_name`, `age`, `region`
  - `profile_type` (Founder / Specialist), `expertise_level`, `employment_status`
  - `business_sector` (up to 3 industries)
  - `linkedin_url`, `cv_path`, `cv_name`, `languages`
  - `headline`, `bio`, `skills`, `open_to_build`, `open_type`
  - `profile_visibility` (everyone / connections), `onboarding_completed`
  - `sprint_rating`, `sprint_reviews`: read-only for members (a trigger, `protect_profile_stats`, ignores their edits)
- **`public.member_directory()`:** the list behind Explore, callable by signed-in members only. It returns the shareable fields of onboarded members. Age, birthday and phone are never included, CV paths only for connections, and only name, photo, role and headline for members who share with connections only.
- **`public.connections`:** one row per pair of members (`requester_id`, `addressee_id`, `status` pending / accepted / ignored, `note`). Members can only send requests as themselves, only the addressee can accept or ignore, and either side can withdraw or remove. Column privileges stop anything else from being edited.
- **Storage bucket `cvs`:** private, PDF or Word up to 10 MB. Each member can read and write `cvs/<their user id>/…`; connections can read each other's CVs.

The client library is vendored at `assets/vendor/supabase-2.58.0.js`, so there's no CDN dependency. It loads only when needed.

### Database changes live in `supabase/`

`supabase/migrations/` holds every database change in order. The file versions match the project's migration history in Supabase, so changes that are already live are never applied twice. Starting from an empty database, the three files rebuild the live schema exactly.

- `20261106000000_initial_profiles.sql`: the `profiles` table as it was before changes were tracked. It does nothing on the live project, where the table already exists.
- `20261106150912_…` and `20261106172453_…`: the onboarding and network changes, exactly as they were applied.

To make a new database change, add the next migration file here and apply it to the project. If you turn on **Deploy to production** in Supabase → Project Settings → Integrations → GitHub, merging into `main` applies new migration files automatically.

**The "Supabase Preview" check on GitHub** comes from Supabase Branching, which creates a temporary copy of the database for each pull request. It needs the Pro plan, and the organization is on the free plan, so the check shows *Skipped*. That is expected. The live site doesn't use it: it talks to the Sandbox project directly through `config.js`.

**Demo mode:** when the site is opened straight from disk (`file://`), "Continue with Google" opens a demo sign-in instead. Onboarding and everything else work with data kept in the browser; CVs keep their file name only.

## Project structure

```
index.html  onboarding.html  home.html  projects.html  network.html
assets/
  css/
    mori.css        design system: tokens, aura, nav, glass, chips, buttons, forms,
                    modals, toasts, loading screen, account modals, motion
    landing.css · onboarding.css · home.css · projects.css · network.css
  js/
    config.js       Supabase URL + anon key
    auth.js         storage (with parsed-value cache), session, route guards (loads in <head>)
    db.js           Supabase: Google sign-in, profiles, CVs, member directory, connection requests
    data.js         option lists (roles, regions, industries, languages…), milestone ladder, insights
    state.js        per-member state: profile, settings, projects, network + notifications (cached locally)
    ui.js           helpers, icons, avatars, toasts, modals, sliding highlights, loading screen
    motion.js       reveal-on-scroll, spotlight, tilt, parallax, count-ups, rings, off-screen pausing
    shell.js        shared nav + footer, page prerendering, Profile / Settings / Notifications
    landing.js · onboarding.js · home.js · projects.js · network.js
  vendor/supabase-2.58.0.js
  img/favicon.svg   the MORI logo (森)
supabase/
  config.toml       read by Supabase's GitHub integration and the Supabase CLI
  migrations/       every database change, in order
```

## Performance notes

- **Prerendering:** on signed-in pages, hovering a nav link prerenders the page (Chrome / Edge Speculation Rules), so the click feels instant. Other browsers get a quick cross-fade.
- **Frosted blur only where it shows:** it's used on surfaces that sit over content (nav, dropdowns, sticky bars, modal backdrop, toasts, the overlapping hero cards). Cards and panels that only cover the soft background look the same without it and scroll much more smoothly.
- **Animations rest off-screen:** the marquee, orbit, floating cards and spinning band pause when they're out of view.
- **Loading screen instead of a blank wait:** sign-in, onboarding save and sign-out show a full-screen loader.

## Motion utilities

| Attribute / class | Effect |
| --- | --- |
| `data-reveal="up / scale / left / right / blur / fade"` | Fades in when scrolled into view |
| `data-stagger="80"` on a container | Children reveal one after another |
| `data-count="128"` | Counts up when visible |
| `.progress-circle[data-percent="75"]` | Ring animates to its value |
| `.spotlight` / `.tilt` / `.magnetic` | Cursor light, 3D tilt, button lean |
| `data-pause-offscreen` | Pauses the element's animations while out of view |

Everything respects the device's reduced-motion setting and **Settings → Preferences → Motion effects**.

## Content sources

Copy follows the SandBox Lean Canvas v2 report and the Milestone Ladder core-kit doc (November 2026). For now the app focuses on two roles, **founders** and **specialists**. The homepage insights are sample content; the illustrations on the landing page are decorative.
