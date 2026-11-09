# SandBox by MORI — concept site

The clickable concept for **SandBox by MORI Group**: an open-access place where Indonesia's aspiring founders and specialists *find their people, build their idea and earn the spotlight*.

Plain HTML, CSS and JavaScript. There is no build step. It uses the design language of the original Sandbox drafts: aura background, glass panels and Inter (served from the site itself), with the MORI logo in black and red (#B80000). There's a light and a dark mode (the toggle on the right of every nav bar).

## Pages and flow

| Page | What it is |
| --- | --- |
| `index.html` | **Landing page**, laid out like a professional network's landing page, with a few scroll scenes in the spirit of a product page: the hero recedes as you scroll, *What is Sandbox?* sums it up in one line and three before → after pairs, and *How Sandbox works* pins while its three steps (find your people, build your idea, earn the spotlight) play on a product screen. Sign in and join use Google. |
| `onboarding.html` | **Sign-up questions** for new members: name, date of birth and region · founder or specialist · a specialist's role (software engineer, UI/UX designer…, or their own) · years of experience and employment status · up to 3 industries (popular picks + searchable full list) · LinkedIn and/or CV upload · languages. Reopen it with `onboarding.html?edit=1` to update answers. |
| `home.html` | **Homepage**: greeting, entry cards, your pinned projects, your latest conversations, and *Insights are coming soon* where insights will go. It opens with a short welcome (see *Homepage: the opening* below). |
| `projects.html` | **Projects**: search, tag filters, sort, pagination, declare a new project and add people. Clicking a project opens its **preview** (the board at a glance, milestone ladder, team, pin to homepage); clicking the preview opens the planner. |
| `project.html?id=…` | **Project planner**: the project's **Mainframe** (its home page, a canvas of widgets) and a page for each tool: daily tasks, GTM checklist, milestone ladder, people, documents, customer interviews, lean canvas, marketing, metrics, finance, funding opportunities and toolkits. See *Projects* below. |
| `subscription.html` | **Subscription**: the SandBox ladder of plans (Explorer, Builder, Founder Pro, Studio), each card a step higher than the last on wide screens, with monthly or yearly billing (two months free), a comparison table and a few questions. **Prices and perks are placeholders** (`plans` in `assets/js/data.js`); everyone is on Explorer, and choosing another plan says payments open soon. In the Account menu and the footer. |
| `network.html` | **MORI Network** (the nav and links still say *Network*), laid out like LinkedIn's *My network*: **Manage my network** on the left (Discover, Requests, Messages, Connections, Sent requests); on the right, the requests you received sit on top of **Discover**, the members who signed up. |

**Profile**, **Settings** and **Notifications** are modals in the Account menu. Settings has five sections: Account, Preferences (including *Take the tour* for the site tour), Privacy, Projects (what a project opens on, the planner's tools sidebar, which projects are pinned to the homepage, and the project tour; also under *Projects → Project settings* in the nav) and Notifications. The profile shows the onboarding answers, your photo and your links. Notifications come from connection requests: someone asking to connect, or accepting your request. The **Connections** window opens from the Network menu or from the Connections count on your profile.

Nothing is pre-filled: projects appear once the member declares them, and the Network shows real members.

### Guided tours

- **The site tour** starts as soon as a new member finishes the sign-up questions: instead of the homepage they land on the **MORI Network** (Discover), where a slideshow opens in a modal: finding people, connecting with a note, requests and messages, and their profile. *Next: Projects* takes them to the **Projects** gallery, where the slides show how to declare a first project (name and focus, tags and rung, co-founders, the planner) without asking them to make one. *Next: Plans* ends on the **subscription ladder**: the plans, climbing up or down, monthly or yearly, and a last slide that offers *Start my first project* (the new project form) or their homepage.
- **The project tour** starts when a member declares their **first project**, which (like every new project) opens straight on its Mainframe. A spotlight walks through the sidebar's tools (Plan; Build with their own documents, interviews and the lean canvas; Grow, Money and Learn), then the **People** page (the team, adding people from their connections, the roles the team needs, the team in the header), then back to the **Mainframe** to show how widgets work: what they are (with *Add starter widgets* for an empty Mainframe), *Add widget*, and *Edit Mainframe*, which it turns on so they can move and resize widgets right there. On phones the tools drawer opens and closes along the way.
- Every slide's picture is a small animated demo drawn in CSS (with reduced motion it just shows how it ends). Both tours can be skipped at any step (*Skip tour*, or Escape) and taken again from **Settings → Preferences / Projects → Take the tour**; the footer's *Sandbox Guide* starts the site tour too. If a member leaves the site tour half way, a small *Continue* pill waits on the other pages.
- Where a member is in each tour is kept with their settings (`settings.tour`), so it follows them to other devices, and a skipped tour stays skipped. The code is `assets/js/tour.js` and `assets/css/tour.css`.

### Homepage: the opening

Each time a member arrives on the homepage fresh (after signing in, after reloading, or when the browser had unloaded the tab), it plays a short opening, on desktop and phones alike: only *Welcome* shows, fading in at the centre of the screen; after about a second it glides up to its place under the nav while the prompt, the entry cards, the pinned projects and the rest glide up from the bottom of the screen into place, about 2.5 seconds in all. Any click, tap, key or scroll skips it. Moving between pages within a visit doesn't replay it, and it's off when the device or **Settings → Preferences → Motion effects** asks for reduced motion.

### Light and dark mode

- The sun/moon button on the right of every nav bar switches between light and dark with one quick (0.5 s) cross-fade of the whole page; browsers without view transitions, and reduced motion, switch at once. Element transitions are paused for the switch, so nothing lags behind. The choice is remembered in the browser, applied before the page first paints, and followed by other open tabs.
- **Light:** a light grey base with a light grey aura at the top and the MORI red at the bottom; accents are the original blue, purple and orange, slightly softened.
- **Dark:** a deep grey base, a faint light grey aura at the top and a stronger MORI red at the bottom; accents become dark, intense versions of the same hues. The logo has a white top half and a red bottom half.
- **The aura** (both modes) is the original release-5 background, held still: a grey hue at the top left, the MORI red at the bottom right, two large soft layers (a 120px blur) and three faint orbs. It's drawn as images: `tools/make_aura.py` works out those gradients and the blur with full precision and dithers them to 8 bits, writing `assets/img/aura-{light,dark}-{wide,tall}.webp` (2400 × 1500 for desktops, 860 × 1864 for phones in portrait; lossless, about 400 KB and 225 KB). Drawn live, Safari shows such faint gradients in visible steps (Chrome smooths them) and renders large blurs at low resolution; the images look the same in every browser and match Chrome's rendering of the original to within about one colour level. A page asks for its image before the first paint (the base colour shows until it arrives) and fetches the other theme's once idle, so switching is instant. To change the aura's colours, edit `tools/make_aura.py` and run it. The loading screen (signing in, signing out, saving the sign-up answers) carries its own copy of the aura, so it matches the pages in both modes, and it stays on top of the nav during page and theme fades.
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

### Projects: preview and planner

A project is a **planner** for the people building it. (Sprints are separate: a hackathon-like event members sign up for, outside project management.)

- **Declaring a project** takes you straight to its new Mainframe (with a note that it was declared); your first one also gets the project tour (see *Guided tours*).
- **Opening a project:** on the Projects page a project opens its **preview** first (the board at a glance, its rung, its team); clicking the preview opens the planner. Projects pinned to the homepage, and the pinned list in the nav, open the planner straight away.
- **The planner's pages:** the header (tags, name, the page you're on in red, when it was updated and created, the team, *Edit details*, *Pin*) and the overall progress stay at the top of every page. The sidebar on the left lists the project's pages; the button at the top left shows or hides it. The page itself stays centred and never moves: on wide screens a sidebar-wide space is kept free on both sides and the sidebar slides into the left one; up to 1240px wide (and on phones) the sidebar is a drawer over the page. Each page has its own address (`project.html?id=…#finance`, `#docs/<document id>`…) and tab title, so it can be bookmarked or shared and the back button works. Switching pages is instant: they share one app shell and the project's data, and nothing being saved is lost on the way.
- **Overall progress:** how far the project is from idea to early traction on the milestone ladder: its rung, plus the share of the next rung's proof steps that are done (rung 1 with one of the next rung's three steps done is 27%). The ring on a pinned project on the homepage shows the same figure. Next to it, how many tasks are overdue or due this week.
- **Mainframe** (the project's home page) starts empty. *Add widget* opens a drawer on the right with every widget: pick one, then its style and size, like adding a widget on a phone, with a preview. The canvas is four columns wide with as many rows as it needs. *Edit Mainframe* turns on editing (the button becomes *Done*; Escape or leaving the page also ends it): the grid's cells show, and you drag a widget by its top bar to move it, or by its corner to resize it. While resizing, the widget follows the pointer and the cells it will take are highlighted: a quarter of a cell outward grows it by a cell, a quarter back shrinks it; on release it settles into those cells. The others move down out of the way, and a widget never gets smaller than its style needs (a checklist takes two rows to show a few items; the task progress bar two columns; a document can be a single cell). In editing, a widget's ⋯ menu changes its style and size, or removes it. Outside editing, widgets stay put. On phones the widgets stack in one column; they're arranged on a larger screen.
- **Widgets:** Daily tasks (today's list, a progress bar or the whole board) · GTM checklist (list or progress ring) · Milestone ladder (next rung or its proof steps) · Finance (runway, summary or cash-flow chart) · Funding opportunities (next deadline or pipeline) · Metrics (one metric or three) · Marketing (campaigns or sign-ups) · Document (one document's name and last edit, or the latest edits) · People (team or roles we need) · Customer interviews · Lean canvas (value proposition or the whole canvas) · Note · Countdown (to a launch or demo day).
- **The tools, one page each:**
  - *Daily tasks:* the board (To do, In progress, Done). Type in *Add a task* under any column, drag tasks between columns, tick them off, or open one to set who it's for, a due date and its column, or to delete it (two taps). Overdue tasks are flagged in red.
  - *GTM checklist:* 18 go-to-market steps in six groups (positioning, pricing, channels, launch, sales and retention, legal and admin), plus your own.
  - *Milestone ladder:* the proof steps for the next rung, *Move up* once they're done, the stage picker, and every rung at a glance.
  - *People:* the team, and the roles it still needs (with a link to find specialists in the MORI Network).
  - *Documents:* documents the team writes together (headings, bold, italics, lists, quotes, links), saved as you type and downloadable for Word. Pasted text is cleaned; links only open `http(s)` and `mailto` addresses. Teammates see each other's latest saved version: the last save wins, it isn't live co-editing.
  - *Customer interviews:* log each problem interview (who, their pain, a quote, would they pay); eight interviews tick off rung 1's first step.
  - *Lean canvas:* the nine boxes of a lean canvas, saved as you type.
  - *Marketing:* campaigns by channel, status, budget and sign-ups, with the cost per sign-up.
  - *Metrics:* the numbers you track, with an optional target, logged by date with a trend line.
  - *Finance:* starting cash, money in and out by category, balance, monthly burn (the average net spend of the last three months with entries), runway and a six-month cash-flow chart, in IDR, USD, SGD or EUR.
  - *Funding opportunities:* the grants, competitions, accelerators and investors you're going after, with deadlines and status, plus where to look.
  - *Toolkits:* templates that start a document: problem brief, interview script, interview summary, pitch deck outline, go-to-market plan, founders' agreement checklist, monthly update and meeting notes.
- **Team:** owner first, then co-founders, each with their open tasks. A **founder** who owns the project adds people from their connections (*Add to team*) and can remove them; their tasks go back to the team. Co-founders can edit everything in the planner and leave the project. Only the owner can delete the project (*Edit details → Delete project*), for everyone, with its tools and documents.
- **Working together:** every change shows at once and is saved in the background (undone, with a message, if saving fails). Each save carries a version check: if a teammate saved in between, the change is re-applied to their newer copy and saved again, so two people editing at the same moment both keep their change. Teammates' changes appear when you switch pages, when the page comes back into view and every 20 seconds.
- **Limits:** up to 100 tasks per project, 256 KB of tool data per project (the Mainframe layout, finance, marketing and the rest) and 200,000 characters per document; only founders can add people. All are database rules that can be changed.

Projects are saved to Supabase for members signed in with Google (projects made before this were moved over once, automatically); demo accounts keep them in the browser. Pins to the homepage are personal.

**Across devices:** for Google members, settings (including the project ones), pinned projects, light/dark mode and which notifications you've read are saved on the account as well as in the browser, so a change on the phone shows on the laptop the next time a page opens, comes back into view or its window is clicked into. Settings, pins and the theme each carry the time they last changed, and the newer copy wins, part by part; pins made before syncing existed are merged on the first sync. A notification read on any device is read everywhere.

The sign-in flow works like this:
1. "Continue with Google" shows a loading screen and goes to Google.
2. Google returns the member to `index.html?auth=callback`, which keeps showing the loading screen.
3. New members go to onboarding, then to the MORI Network for the site tour; returning members go to their start page.
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
  - `prefs`: settings, pinned projects and the theme, synced across devices (see *Across devices* above; up to 32 KB, never in the member directory)
  - `birth_date` (private: never in the member directory), `specialty` (a specialist's role), `cover_url` (the profile banner)
  - `sprint_rating`, `sprint_reviews`: read-only for members (a trigger, `protect_profile_stats`, ignores their edits)
- **`public.member_directory()`:** the list behind Discover, callable by signed-in members only. It returns the shareable fields of onboarded members. Age (worked out from the date of birth) only when the member shows it, region, employment and languages only when they show them; birthday and phone are never included, CV paths only for connections, and only name, photo, role and headline for members who share with connections only.
- **`public.find_member(full_name)`:** finds invisible members by their exact full name (case and spacing don't matter) and returns only their name and join date. Signed-in members only.
- **`public.connections`:** one row per pair of members (`requester_id`, `addressee_id`, `status` pending / accepted / ignored, `note`). Members can only send requests as themselves, only the addressee can accept or ignore, and either side can withdraw or remove. Column privileges stop anything else from being edited.
- **`public.messages`:** direct messages (`sender_id`, `recipient_id`, `body` up to 2,000 characters, `read_at`). Only the two members can read a message, members can only message accepted connections, the sender and time are set by the database, and only the recipient can mark it read.
- **`public.projects`** and **`public.project_members`:** projects (`owner_id`, `name`, `focus`, `tags`, `rung`, `milestones`, `workspace`) and their co-founders. `milestones` holds the planner's tasks (up to 100), each `{ id, text, status: todo|doing|done, done, assignee, due }` (older `{ text, done }` items are read as tasks and upgraded on the next save). `workspace` holds the Mainframe's widget layout and the tools' data (finance, marketing, GTM checklist, funding, metrics, interviews, lean canvas, ladder proof, roles), up to 256 KB. The planner saves both with `updated_at` as a version, so concurrent saves are re-applied instead of overwritten. The owner and co-founders can see and update a project; only the owner can delete it. Only a founder who owns the project can add co-founders, and only from their accepted connections. Owners can remove co-founders, and co-founders can leave. The policy checks live in a `private` schema that the API doesn't expose.
- **`public.project_docs`:** the planner's documents (`project_id`, `title`, `body` as sanitised HTML up to 200,000 characters, `created_by`, `updated_by`, `created_at`, `updated_at`). The owner and co-founders of the project can read, write and delete them; a trigger stamps who edited and when, and keeps the author and project from being changed. The list loads without the text; a document's text loads when it's opened.
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
- `20261109000717_project_workspace_and_docs.sql`: the planner's `workspace` column, up to 100 tasks per project, and the `project_docs` table with its policies and trigger.
- `20261109062222_member_prefs_sync.sql`: the `prefs` column on profiles, for settings, pins and the theme across devices.

To make a new database change, add the next migration file here and apply it to the project. If you turn on **Deploy to production** in Supabase → Project Settings → Integrations → GitHub, merging into `main` applies new migration files automatically.

**The "Supabase Preview" check on GitHub** comes from Supabase Branching, which creates a temporary copy of the database for each pull request. It needs the Pro plan, and the organization is on the free plan, so the check shows *Skipped*. That is expected. The live site doesn't use it: it talks to the Sandbox project directly through `config.js`.

**Demo mode:** when the site is opened straight from disk (`file://`), "Continue with Google" opens a demo sign-in instead. Onboarding and everything else work with data kept in the browser; CVs keep their file name only.

## Project structure

```
index.html  onboarding.html  home.html  projects.html  project.html  network.html  subscription.html
assets/
  css/
    mori.css        design system: tokens, aura, nav, glass, chips, buttons, forms,
                    modals, toasts, loading screen, account modals, motion
    landing.css · onboarding.css · home.css · network.css
    subscription.css the subscription ladder
    tour.css        the guided tours: slideshow, its animated pictures, the spotlight
    projects.css    Projects page, plus the parts the planner shares (preview, team, pickers)
    project.css     the project planner
    dark.css        dark mode, generated by tools/make_dark_css.py (don't edit by hand)
  js/
    config.js       Supabase URL + anon key
    auth.js         storage (with parsed-value cache), session, route guards (loads in <head>)
    db.js           Supabase: Google sign-in, profiles, photos, CVs, member directory, connection
                    requests, projects + co-founders, messages, Realtime subscription
    data.js         option lists (roles, regions, industries, languages, link types…), milestone ladder, the subscription plans (placeholders)
    state.js        per-member state: profile, settings, projects, network, chat, notifications,
                    live updates (cached locally)
    ui.js           helpers, icons, avatars, photo cropping, toasts, modals, sliding highlights, loading screen
    motion.js       reveal-on-scroll, spotlight, tilt, parallax, count-ups, rings, off-screen pausing
    shell.js        shared nav + footer, page prerendering, Profile / Settings / Notifications, live pop-ups
    people.js       member profiles, the Connections window, connect / accept / message buttons
    projectkit.js   shared by the Projects page and the planner: team list, Add to team, tags, due dates
    project.js      the project planner: its pages, header, overall progress and sidebar
    workspace.js    a project's workspace (Mainframe layout + tool data) and documents, saved with version checks
    mainframe.js    the Mainframe: widgets, the widget drawer, drag to move and resize
    planner-tools.js the tool pages: tasks, GTM checklist, ladder, people, interviews, lean canvas,
                    marketing, metrics, finance, funding, toolkits
    planner-docs.js the documents: list and editor (formatting, autosave, Word download, sanitising)
    tour.js         the guided tours: the site tour (a slideshow on Network, Projects and Subscription)
                    and the first-project tour (a spotlight over the planner)
    landing.js · onboarding.js · home.js · projects.js · network.js · subscription.js
  vendor/supabase-2.58.0.js
  fonts/            Inter (latin and latin-ext, weights 400–700) and its licence (OFL)
  img/              the MORI logo (森) on a rounded white tile, as the site icon: mori-icon.svg,
                    mori-icon-32.png, mori-icon-180.png (a full square: phones round it themselves);
                    the background aura: aura-light-wide.webp, aura-dark-wide.webp, aura-*-tall.webp
favicon.ico         the MORI logo for browsers that look for /favicon.ico
tools/
  make_dark_css.py  builds assets/css/dark.css from the light stylesheets
  dark-overrides.css hand-tuned dark values (aura images, base colour, logo)
  make_aura.py      renders the background aura images (needs numpy and Pillow)
supabase/
  config.toml       read by Supabase's GitHub integration and the Supabase CLI
  migrations/       every database change, in order
```

## Performance notes

- **Prerendering:** on signed-in pages, hovering a nav link prerenders the page (Chrome / Edge Speculation Rules), so the click feels instant. Other browsers get a quick cross-fade without blur.
- **Animations run on the GPU:** loops (pulsing dots, rings, floating cards, the landing's scroll scenes) only change `transform` and `opacity`. Nothing animates `box-shadow`, blur or layout on every frame. The landing's scroll scenes use one passive scroll listener, update at most once per frame, and measure positions only on load and resize.
- **Frosted blur only where it's needed:** the nav (once you scroll), sticky bars, the modal backdrop and toasts. The floating landing cards and the background use none, and the nav is fully transparent at the top of the page.
- **Animations rest off-screen:** the hero, marquee, orbit, constellation and spinning band pause when they're out of view.
- **Fewer requests:** Inter is served from the site (no Google Fonts round trip before the first paint). The sign-in library loads once the landing page is idle, or as soon as a visitor reaches for a sign-in button. Pages load each kind of data once and share it.
- **Measured** in a headless browser without a GPU (2 s of continuous scrolling, every page): about 4 frames per second before this release, about 60 after; the worst frame went from about 330 ms to 17 ms.
- **Loading screen instead of a blank wait:** sign-in, onboarding save and sign-out show a full-screen loader.
- **No wait between a tap and what it does:** app pages show their content at once (no reveal delays), page changes cross-fade in 0.12 s out and 0.2 s in, and connection requests, accepts, ignores and removals show straight away and are undone if saving fails. On signed-in pages, Chrome and Edge fetch the linked app pages ahead of time and prerender the one you hover. In the planner, switching pages doesn't load anything new: the page draws from what's on hand, then brings in teammates' changes.

## Speed on the server side

Pages render straight away from a copy kept in the browser, then refresh from Supabase. The waits that remain are the round trips to the database:

1. **Move the database closer to members.** The Supabase project is in **us-east-2 (Ohio)**, about 250 ms from Indonesia per request. A project in **ap-southeast-1 (Singapore)** is about 20–40 ms away. Supabase can't move a project, so this means a new project in Singapore, `supabase/migrations/` applied to it, data and storage copied over, then the new URL and key in `config.js` and the Google redirect URLs updated. This is the biggest single gain.
2. **Pro plan when members rely on it:** the free plan pauses after a week without activity and has small shared compute. Pro removes pausing and adds image resizing for photos.
3. **Page the member directory** once there are a few thousand members: filter and page in the database instead of loading everyone.
4. **Hosting with cache control and a build step:** GitHub Pages can't set long cache headers. Cloudflare Pages, Netlify or Vercel, with a small build (bundled and minified files with hashed names), lets browsers keep files for a year and fetch only what changed.
5. **A service worker** would keep the app shell offline and make repeat visits instant, as Notion and Google Drive do.

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

Copy follows the SandBox Lean Canvas v2 report and the Milestone Ladder core-kit doc (November 2026). For now the app focuses on two roles, **founders** and **specialists**. Subscription prices and perks are placeholders; the illustrations on the landing page and in the tours are decorative.
