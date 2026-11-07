# SandBox by MORI — concept site

The clickable concept for **SandBox by MORI Group**: an open-access place where Indonesia's aspiring founders and specialists *find their people, build their idea and earn the spotlight*.

Plain HTML, CSS and JavaScript. There is no build step. It uses the design language of the original Sandbox drafts: aura background, glass panels and Inter, with the MORI logo in black and red (#B80000). There's a light and a dark mode (the toggle on the right of every nav bar).

## Pages and flow

| Page | What it is |
| --- | --- |
| `index.html` | **Landing page**, laid out like a professional network's landing page. Sign in and join use Google. |
| `onboarding.html` | **Sign-up questions** for new members: name, date of birth and region · founder or specialist · a specialist's role (software engineer, UI/UX designer…, or their own) · years of experience and employment status · up to 3 industries (popular picks + searchable full list) · LinkedIn and/or CV upload · languages. Reopen it with `onboarding.html?edit=1` to update answers. |
| `home.html` | **Homepage**: greeting, entry cards, your pinned project, your latest conversations, insights. |
| `projects.html` | **Projects**: search, tag filters, sort, pagination, project drawer (pin to homepage), declare a new project and add co-founders. |
| `network.html` | **MORI Network** (the nav and links still say *Network*), laid out like LinkedIn's *My network*: **Manage my network** on the left (Discover, Requests, Messages, Connections, Sent requests); on the right, the requests you received sit on top of **Discover**, the members who signed up. |

**Profile**, **Settings** and **Notifications** are modals in the Account menu. The profile shows the onboarding answers, your photo and your links. Notifications come from connection requests: someone asking to connect, or accepting your request. The **Connections** window opens from the Network menu or from the Connections count on your profile.

Apart from the homepage insights, nothing is pre-filled: projects appear once the member declares them, and the Network shows real members.

### Light and dark mode

- The sun/moon button on the right of every nav bar switches between light and dark instantly: element transitions are paused for the switch, so all text and surfaces change in the same frame. The choice is remembered in the browser, applied before the page first paints, and followed by other open tabs.
- **Light:** a light grey base with a light grey aura at the top and the MORI red at the bottom; accents are the original blue, purple and orange, slightly softened.
- **Dark:** a deep grey base, a faint light grey aura at the top and a stronger MORI red at the bottom; accents become dark, intense versions of the same hues. The logo stays black and red.
- Dark mode is `assets/css/dark.css`, generated from the light stylesheets by `tools/make_dark_css.py` (hand-tuned values in `tools/dark-overrides.css`). After changing colours in any stylesheet, run `python3 tools/make_dark_css.py`.

### Sign-up questions

- **Date of birth** replaces age. It stays private: other members only ever see the age it works out to, and only if the member shows their age. On their birthday, the homepage says *Happy birthday*.
- **Specialists** name their role on the next step (software engineer, UI/UX designer, graphic designer, product manager… or their own). It shows next to "Specialist" on their profile and card, and Discover can filter by it.
- **Members who signed up before these questions** are sent through onboarding once, with their earlier answers filled in, the next time they open the site.

### Profile photo, banner and links

- **Photo:** everyone starts with the default icon (a gray person on white). The camera button on your profile lets you upload a photo (JPEG, PNG or WebP up to 15 MB), then drag and zoom to frame it before it's saved as a 512 px square. *Adjust or resize* reopens the current photo in the same editor, use your Google account photo, or go back to the default icon.
- **Banner:** the banner behind your photo is dark by default. *Add a banner* (bottom right of the banner) uploads your own image, framed in the same editor at 3:1; you can adjust it later or go back to the default.
- **What your profile shows:** Edit profile → *Show on your profile* has switches for age, region, employment and languages. Age starts hidden; the others start shown. Region and age appear in the small print under your headline, employment as a bubble next to your sprint rating and join date, and languages in their own section. Years of experience is never shown: it's only used to sort and filter members.
- **Invisible:** Edit profile → *Invisible* hides you from the MORI Network. You don't appear in Discover, and nobody can send you a request (the database refuses it). Someone who searches your exact full name in Discover still finds you, but sees only your name and when you joined, with the default photo. Your connections, and anyone you've sent a request to, still see your profile as before.
- **Links:** next to the CV and LinkedIn you can add up to 8 links: GitHub, website, portfolio, X, Instagram, TikTok, YouTube, Behance, Dribbble, Medium or other. Addresses are saved as `https://` links; anything else is refused. Links are shared like LinkedIn: with everyone, or only with connections if your profile is set to *Connections*.

### Network

- **Discover** lists everyone who finished the sign-up questions, except you and the people you're already connected with (they're under *Manage my network → Connections*), newest members first. The **Requests** you received sit above it (the first three, then *Show all*), with Ignore and Accept. Search covers names, headlines, skills, regions, industries and languages.
- **Filters** (dropdowns): **Role** (All, Founders, Specialists, or a specialist role) · years of experience · **region** (regions members are in come first) · minimum sprint rating · industry (searchable checklist; industries members chose are listed first).
- **Connect** from a card, or from a member's profile with an optional note (300 characters). The other member sees it under **Requests**, in the nav badge and in Notifications, and can accept or ignore it. You can withdraw a request or remove a connection.
- **Connections** can see each other's CV. A member who sets **Settings → Privacy → Profile visibility** to *Connections* shows only their name, photo, role and headline to everyone else.
- **Live updates:** requests, accepted requests and removed connections reach the other member straight away, with a pop-up and updated badges, on whichever page they have open. No reload needed.
- **Messages:** once connected, a **Message** button appears on the member's card and under *Connected* on their profile. Conversations are real time, with day dividers, a *Seen* marker on your last read message, and *Not sent → Retry* if the connection drops. New messages show in the nav badge, as a pop-up and in the homepage's recent messages. Messages are **not end-to-end encrypted**: they are stored in Supabase and protected by row-level security, so only the two members can read them.
- **Sprint rating** is shown on cards and profiles. Members can't set it themselves; it stays empty ("No sprint rating yet") until sprint reviews exist.

### Projects and co-founders

Projects are saved to Supabase for members signed in with Google (projects made before this were moved over once, automatically). When a **founder** declares a project, they can pick co-founders from their connections; they can add or remove co-founders later from the project drawer. Co-founders see the project on their own Projects page, can tick its milestones, and can leave it. Pins to the homepage are personal.

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
  - `avatar_url` (the photo the member chose; empty means the default icon), `links` (up to 8 `{type, url}` links)
  - `show_age`, `show_region`, `show_employment`, `show_languages`: what the profile shows other members
  - `invisible`: hidden from the MORI Network (see *Invisible* above)
  - `birth_date` (private: never in the member directory), `specialty` (a specialist's role), `cover_url` (the profile banner)
  - `sprint_rating`, `sprint_reviews`: read-only for members (a trigger, `protect_profile_stats`, ignores their edits)
- **`public.member_directory()`:** the list behind Discover, callable by signed-in members only. It returns the shareable fields of onboarded members. Age (worked out from the date of birth) only when the member shows it, region, employment and languages only when they show them; birthday and phone are never included, CV paths only for connections, and only name, photo, role and headline for members who share with connections only.
- **`public.find_member(full_name)`:** finds invisible members by their exact full name (case and spacing don't matter) and returns only their name and join date. Signed-in members only.
- **`public.connections`:** one row per pair of members (`requester_id`, `addressee_id`, `status` pending / accepted / ignored, `note`). Members can only send requests as themselves, only the addressee can accept or ignore, and either side can withdraw or remove. Column privileges stop anything else from being edited.
- **`public.messages`:** direct messages (`sender_id`, `recipient_id`, `body` up to 2,000 characters, `read_at`). Only the two members can read a message, members can only message accepted connections, the sender and time are set by the database, and only the recipient can mark it read.
- **`public.projects`** and **`public.project_members`:** projects (`owner_id`, `name`, `focus`, `tags`, `rung`, `milestones`) and their co-founders. The owner and co-founders can see and update a project; only the owner can delete it. Only a founder who owns the project can add co-founders, and only from their accepted connections. Owners can remove co-founders, and co-founders can leave. The policy checks live in a `private` schema that the API doesn't expose.
- **Realtime:** `connections` and `messages` are in the `supabase_realtime` publication. Each signed-in page listens for changes to the member's own requests and messages; Realtime only delivers rows the member is allowed to read.
- **Storage bucket `cvs`:** private, PDF or Word up to 10 MB. Each member can read and write `cvs/<their user id>/…`; connections can read each other's CVs.
- **Storage bucket `avatars`:** public profile photos and banners, JPEG, PNG or WebP up to 2 MB. Each member can only write `avatars/<their user id>/…`.

The client library is vendored at `assets/vendor/supabase-2.58.0.js`, so there's no CDN dependency. It loads only when needed.

### Database changes live in `supabase/`

`supabase/migrations/` holds every database change in order. The file versions match the project's migration history in Supabase, so changes that are already live are never applied twice. Starting from an empty database, the files rebuild the live schema exactly.

- `20261106000000_initial_profiles.sql`: the `profiles` table as it was before changes were tracked. It does nothing on the live project, where the table already exists.
- `20261106150912_…` and `20261106172453_…`: the onboarding and network changes, exactly as they were applied.
- `20261106210821_profile_photos_and_links.sql`: the `avatars` bucket, the `links` column and the updated member directory. It also cleared the Google photos that earlier sign-ins copied in automatically, so everyone starts from the default icon.
- `20261106210844_projects_and_cofounders.sql` and `20261106211239_…`: projects shared with co-founders.
- `20261106210856_messages_and_realtime.sql`: messages and the Realtime publication.
- `20261106222340_profile_display_choices.sql`: the *Show on your profile* switches, applied in the member directory.
- `20261107010827_birth_date_specialty_cover.sql`: date of birth, a specialist's role and the profile banner.
- `20261107155209_invisible_members.sql`: Invisible mode (the column, the directory and name-search rules, and the policy that refuses requests to invisible members).

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
    dark.css        dark mode, generated by tools/make_dark_css.py (don't edit by hand)
  js/
    config.js       Supabase URL + anon key
    auth.js         storage (with parsed-value cache), session, route guards (loads in <head>)
    db.js           Supabase: Google sign-in, profiles, photos, CVs, member directory, connection
                    requests, projects + co-founders, messages, Realtime subscription
    data.js         option lists (roles, regions, industries, languages, link types…), milestone ladder, insights
    state.js        per-member state: profile, settings, projects, network, chat, notifications,
                    live updates (cached locally)
    ui.js           helpers, icons, avatars, photo cropping, toasts, modals, sliding highlights, loading screen
    motion.js       reveal-on-scroll, spotlight, tilt, parallax, count-ups, rings, off-screen pausing
    shell.js        shared nav + footer, page prerendering, Profile / Settings / Notifications, live pop-ups
    people.js       member profiles, the Connections window, connect / accept / message buttons
    landing.js · onboarding.js · home.js · projects.js · network.js
  vendor/supabase-2.58.0.js
  img/favicon.svg   the MORI logo (森)
tools/
  make_dark_css.py  builds assets/css/dark.css from the light stylesheets
  dark-overrides.css hand-tuned dark values (aura, base colour, logo)
supabase/
  config.toml       read by Supabase's GitHub integration and the Supabase CLI
  migrations/       every database change, in order
```

## Performance notes

- **Prerendering:** on signed-in pages, hovering a nav link prerenders the page (Chrome / Edge Speculation Rules), so the click feels instant. Other browsers get a quick cross-fade.
- **Frosted blur only where it shows:** it's used on surfaces that sit over content (nav, sticky bars, modal backdrop, toasts, the overlapping hero cards). Menus are solid so text behind them never shows through. Cards and panels that only cover the soft background look the same without it and scroll much more smoothly.
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
