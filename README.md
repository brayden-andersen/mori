# SandBox by MORI — concept site

The clickable concept for **SandBox by MORI Group**: an open-access place where Indonesia's aspiring founders and specialists *find their people, build their idea and earn the spotlight*.

Plain HTML, CSS and JavaScript. There is no build step. It uses the design language of the original Sandbox drafts: aura background, glass panels and Inter (served from the site itself), with the MORI logo in black and red (#B80000). There's a light and a dark mode (the toggle on the right of every nav bar).

## Pages and flow

| Page | What it is |
| --- | --- |
| `index.html` | **Landing page**, laid out like a professional network's landing page, with a few scroll scenes in the spirit of a product page: the hero ("SandBox turns ideas into viable businesses", one centred column with the moving marquee of features under *New to Sandbox? Join now*) recedes as you scroll, *What is Sandbox?* sums it up in one line and three before → after pairs, and *How Sandbox works* pins while its three steps (find your people, build your idea, earn the spotlight) play on a product screen. Then the launch path, sprints, vetted partners and the milestone ladder. Sign in and join use Google. There are no simulated chats: messaging is real, on the Network page. |
| `partners.html` | **Partners** (public, no sign-up): mentors, investors and service providers join as vetted partners, by invitation or application. Who partners are, how vetting works (identity, firm or track record, references, a signed partner agreement), how partners are paid, and **the partner application** (`#apply`): identity, firm or track record, references, services and consent. It checks the answers in place, then shows the application ready to send and opens an email draft to `contactEmail` in `config.js`. Nothing is stored. |
| `directory.html` | **Vetted partners** (members): notaries, lawyers, accountants, tax advisers and designers, with placeholder member prices and the referral fee stated. A service in the address (`directory.html#notary`) filters it; the launch path links there. Only sample partners exist yet, so only the guest demo lists them; members see that the first partners haven't been listed. `[BRAYDEN: real partners and member prices]` |
| `legal.html` | **Terms, privacy, cookies and cancellation** (public): a plain-language draft, not yet reviewed by a lawyer, with `#terms`, `#privacy`, `#cookies` and `#cancellation`. The privacy section describes what the code actually does. The sign-up screens and the footer link here. |
| `about.html` | **About SandBox** (public): the mission, the problem and what SandBox does, with a founder note still to be written. |
| `contact.html` | **Contact** (public): one address for joining, partnering, reports, problems and data requests. The address is `contactEmail` in `config.js`. |
| `toolkits.html` | **Toolkits** (public): the planner's templates, each readable in full, with a way into the planner or the demo. |
| `404.html` | **Page not found**, served by GitHub Pages for any missing address. |
| `onboarding.html` | **Sign-up**, short: name (region optional) · founder or specialist, with a line on what each changes · a specialist's role · one industry · *Where are you right now?* (an idea and need a team, skills and want to join, a prototype to make real). Only the name and the role are required; every other step has *Skip for now*. The answer picks the first page: declare a project, Discover, or declare at rung 2. A `?next=` deep link wins over it. **Complete your profile** is the same page with `?edit=1`: every step, including date of birth, experience and employment (*Details*), LinkedIn or CV, and languages. |
| `home.html` | **Homepage**: a fixed grid of panels. Row 1: *Continue where you left off* (up to three projects, pinned first, each with its focus, next launch-path step and progress ring; a new account gets *Start here* instead) beside **Today** (see below). Row 2: *Needs your attention*, the launch path, sprints. Row 3: *People to meet* beside *Your profile* while it's incomplete. Under the welcome: today's date and what's on. Two columns on tablets, one on phones with Today first. |
| `projects.html` | **Projects**: search, tag filters, sort, pagination, declare a new project and add people. Clicking a project opens its **preview** (the board at a glance, milestone ladder, team, pin to homepage); clicking the preview opens the planner. |
| `project.html?id=…` | **Project planner**: the project's **Mainframe** (its home page, a canvas of widgets) and a page for each tool: daily tasks, GTM checklist, milestone ladder, **launch path**, **compliance tracker**, people, documents, customer interviews, lean canvas, marketing, metrics, finance, funding opportunities, **program navigator** and toolkits. See *Projects* and *The launch path* below. |
| `sprints.html` | **Sprints**: your spots, the lobbies by niche, what starts next and how sprints work (`sprints.html`); a lobby with its upcoming and past sprints (`#lobby/<id>`); a sprint with its brief, dates, team size, how teams form, what gets verified and how badges are earned, and **Save my spot** (`#sprint/<id>`). The first sprints haven't run yet and the page says so. See *Sprints* below. |
| `subscription.html` | **Subscription**: the SandBox ladder of plans (Explorer, Builder, Founder Pro, Studio), each card a step higher than the last on wide screens, with monthly or yearly billing (two months free), a comparison table and a few questions. Free: the MORI Network, sprints, the verified work record and the first stages of the launch path; paid plans add the full launch path, team agreements, the program navigator and compliance tracker (both coming soon) and member pricing with vetted partners. No plan buys visibility. **Prices and perks are placeholders** (`plans` in `assets/js/data.js`); everyone is on Explorer, and choosing another plan says payments aren't part of the demo. In the Account menu and the footer. |
| `network.html` | **MORI Network** (the nav and links still say *Network*), laid out like LinkedIn's *My network*: **Manage my network** on the left (Discover, Requests, Messages, Connections, Sent requests); on the right, the requests you received sit on top of **Discover**, the members who signed up. Every profile has an address, `network.html#member/<id>`, that opens it over Discover (see *Profiles* below). |

**Profile**, **Settings** and **Notifications** are modals in the Account menu. Settings has five sections: Account, Preferences (including *Take the tour* for the site tour), Privacy, Projects (what a project opens on, the planner's tools sidebar, which projects are pinned to the homepage, and the project tour; also under *Projects → Project settings* in the nav) and Notifications. The profile shows the onboarding answers, your photo and your links. Notifications come from connection requests: someone asking to connect, or accepting your request. The **Connections** window opens from the Network menu or from the Connections count on your profile.

For signed-in members nothing is pre-filled: projects appear once the member declares them, and the Network shows real members. The guest demo is the exception (see *Prototype, invite only*).

### Guided tours

- **The site tour** opens right after sign-up, on whichever page the first step led to: four slides in a modal. *Find your people*, *Build it in the planner*, *Make it real, stage by stage* (the launch path) and *Earn it with verified work*. It doesn't sell a plan. The last slide's *Let's go* closes it where the member is.
- **The project tour** starts when a member declares their **first project**, which (like every new project) opens straight on its Mainframe. A spotlight walks through the sidebar's tools (Plan; Build with their own documents, interviews and the lean canvas; Grow, Money and Learn), then the **People** page (the team, adding people from their connections, the roles the team needs, the team in the header), then back to the **Mainframe** to show how widgets work: what they are (with *Add starter widgets* for an empty Mainframe), *Add widget*, and *Edit Mainframe*, which it turns on so they can move and resize widgets right there. On phones the tools drawer opens and closes along the way.
- Every slide's picture is a small animated demo drawn in CSS (with reduced motion it just shows how it ends). Both tours can be skipped at any step (*Skip tour*, or Escape) and taken again from **Settings → Preferences / Projects → Take the tour**; the footer's *Sandbox Guide* starts the site tour too, on the page you're on (from a project page, on the homepage).
- Where a member is in each tour is kept with their settings (`settings.tour`), so it follows them to other devices, and a skipped tour stays skipped. The code is `assets/js/tour.js` and `assets/css/tour.css`.

### Homepage: Today and meetings

**Today** is a calendar of the day, like a phone's calendar widget: the date; all-day items (a project's obligation due today, a project countdown that lands today, a saved sprint that starts today); today's meetings in time order, with a *Now* line between what's past and what's next; and the tasks due today in any of your projects, with tick boxes that tick them in the project.

**Meetings:** *Add a meeting* (on Today) asks what, the day, from and (optionally) to, and who it's for. A meeting for a project is saved with that project (its workspace, `meetings.items`), so its whole team sees it on their homepage; one for *Just me* is saved with your settings, which only you see and which follow you to your other devices. Click a meeting to change, move or delete it. Meetings more than 60 days old are dropped when the list is next saved. There's no calendar sync yet (Google Calendar could come later). The guest demo has three sample meetings, always on today's date.

### Colours

The site is shades of grey. Red is kept only where it means something: the logo and the red words on the landing page, *Mainframe* in a project's header, unread dots and counts, overdue markers, errors and delete buttons. The one accent is a dark cherry red (`--cherry` in `mori.css`, lighter in dark mode) on the small icon at the top left of each panel and Mainframe widget. Members choosing text colours in documents keep their colours. The page you're on in the nav shows in full ink on a faint grey pill. Icon tiles (the tick for *All caught up* and other empty states) and progress rings are ink: black in light mode, white in dark mode, for contrast.

### Homepage: the opening

The first homepage after signing in (Google sign-in, the end of sign-up, or opening the guest demo) plays an opening of about 2.5 seconds: *Welcome* fades in, word by word, alone at the centre of the screen, then glides up under the nav while the links, panels and footer rise from the bottom of the screen into place. Data that loads meanwhile is drawn before the glide or held until it ends, so nothing pops in. It plays once: a reload, a new tab or coming back from another page shows the content straight away. Nothing is locked while it plays, and any click, tap, key or scroll skips to the end. It's off when the device or **Settings → Preferences → Motion effects** asks for reduced motion. Sign-in sets `sessionStorage["mori.justSignedIn"]`; the first app page uses it up.

### Light and dark mode

- The sun/moon button on the right of every nav bar switches between light and dark with one quick (0.5 s) cross-fade of the whole page; browsers without view transitions, and reduced motion, switch at once. Element transitions are paused for the switch, so nothing lags behind. The choice is remembered in the browser, applied before the page first paints, and followed by other open tabs.
- **Light:** a light grey base with a light grey aura at the top and the MORI red at the bottom; accents are the original blue, purple and orange, slightly softened.
- **Dark:** a deep grey base, a faint light grey aura at the top and a stronger MORI red at the bottom; accents become dark, intense versions of the same hues. The logo has a white top half and a red bottom half.
- **The aura** (both modes) is the original release-5 background, held still: a grey hue at the top left, the MORI red at the bottom right, two large soft layers (a 120px blur) and three faint orbs. It's drawn as images: `tools/make_aura.py` works out those gradients and the blur with full precision and dithers them to 8 bits, writing `assets/img/aura-{light,dark}-{wide,tall}.webp` (2400 × 1500 for desktops, 860 × 1864 for phones in portrait; lossless, about 400 KB and 225 KB). Drawn live, Safari shows such faint gradients in visible steps (Chrome smooths them) and renders large blurs at low resolution; the images look the same in every browser and match Chrome's rendering of the original to within about one colour level. A page asks for its image before the first paint (the base colour shows until it arrives) and fetches the other theme's once idle, so switching is instant. To change the aura's colours, edit `tools/make_aura.py` and run it. The loading screen (signing in, signing out, saving the sign-up answers) carries its own copy of the aura, so it matches the pages in both modes, and it stays on top of the nav during page and theme fades.
- Dark mode is `assets/css/dark.css`, generated from the light stylesheets by `tools/make_dark_css.py` (hand-tuned values in `tools/dark-overrides.css`). After changing colours in any stylesheet, run `python3 tools/make_dark_css.py`.

### Languages: English, Bahasa Indonesia and 简体中文

- **Where to choose:** English is the default, from the landing page on. The first step of sign-up starts with a language picker. Afterwards, **Account → Language** (below Subscription) opens **Settings → Preferences** at the Language setting, just above Motion effects. Choosing a language reloads the page in it.
- **What changes:** the whole site, including pages, menus, windows, tours, errors, toasts, page titles, labels for screen readers, and the guest demo's sample content (people's and projects' names stay as they are). Dates and numbers follow the language (`id-ID`, `zh-CN`), and `<html lang>` is set, so Chinese gets Chinese fonts. What members write (documents, messages, project names) is never translated.
- **Remembered:** the choice is kept in the browser (`mori.lang`), so it applies before a page draws. For members it's also saved with their synced settings (`settings.language`), so it follows them to their other devices.
- **Legal text:** the terms, privacy and cookie page, and the legal templates (founders' agreement, equity and vesting, NDA and IP, registration, sector licences), are translated but marked *"This is an unofficial translation, not checked by a lawyer. The English version is the one that counts."* A document started from a template in Indonesian or Chinese starts translated, with that note on top for the legal ones.
- **How it works:** the site is written in English. `assets/js/i18n.js` (loaded first on every page) swaps each piece of English text it finds for the chosen language, using a dictionary in `assets/i18n/id.js` or `assets/i18n/zh.js`. It watches the page, so text drawn later (windows, tours, toasts) is translated as it appears. In English nothing extra loads. In another language the page waits (at most 2.5 s) for the dictionary, so there's no English flash. The dictionary is about 175 KB for Indonesian and 120 KB for Chinese, and it's cached.
- **Phrases with values:** `{#}` is a number ("Updated {#}h ago"); `{1}`, `{2}` are values such as a name or a title ("Welcome back, {1}"). A value that is itself a known phrase is translated too, and lines made of parts ("Fintech · Starts in 3 days") are translated part by part.

**Updating the translations** (after changing or adding English text):

1. `python3 tools/i18n/scan_js.py` collects the phrases written in the scripts.
2. `node tools/i18n/extract.mjs` collects the phrases the pages show, by walking the site in a browser (about 20 minutes; optional for small changes).
3. `python3 tools/i18n/merge.py` lists what isn't translated yet in `tools/i18n/todo.json`.
4. Add each phrase with its Indonesian and Chinese to `tools/i18n/translations.json`: `"English": { "id": "…", "zh": "…" }`. Keep the same `{#}` and `{1}` placeholders. A word ending that only English needs ("project{1}" → "projects") can be dropped by writing `{1=}`.
5. `python3 tools/i18n/build.py` writes `assets/i18n/id.js` and `zh.js`, and stops if a translation's placeholders don't match.

A phrase without a translation simply shows in English.

### Sign-up questions

- **Member roles are Founder and Specialist only.** This is enforced in three places: `Mori.data.roles` (`assets/js/data.js`), `onboarding.js` (it ignores any other `joinRole`), and the database's `profiles_profile_type_check` constraint (`'Founder'` or `'Specialist'`). Mentors, investors and service providers never sign up: they join as vetted partners, by invitation or application (see `partners.html`).

- **Date of birth** replaces age. It stays private: other members only ever see the age it works out to, and only if the member shows their age. On their birthday, the homepage says *Happy birthday*.
- **Specialists** name their role on the next step (software engineer, UI/UX designer, graphic designer, product manager… or their own). It shows next to "Specialist" on their profile and card, and Discover can filter by it.
- **Members who signed up before these questions** are sent through onboarding once, with their earlier answers filled in, the next time they open the site.

### Profile photo, banner and links

- **Photo:** everyone starts with the default icon (a gray person on white). The camera button on your profile lets you upload a photo (JPEG, PNG or WebP up to 15 MB), then drag and zoom to frame it before it's saved as a 512 px square. *Adjust or resize* reopens the current photo in the same editor, use your Google account photo, or go back to the default icon.
- **Banner:** the banner behind your photo is dark by default. *Add a banner* (bottom right of the banner) uploads your own image, framed in the same editor at 3:1; you can adjust it later or go back to the default.
- **What your profile shows:** Edit profile → *Show on your profile* has switches for age, region, employment and languages. Age starts hidden; the others start shown. Region and age appear in the small print under your headline, employment as a bubble next to your verified sprints and join date, and languages in their own section. Years of experience is never shown: it's only used to sort and filter members.
- **Invisible:** Edit profile → *Invisible* hides you from the MORI Network. You don't appear in Discover, and nobody can send you a request (the database refuses it). Someone who searches your exact full name in Discover still finds you, but sees only your name and when you joined, with the default photo. Your connections, and anyone you've sent a request to, still see your profile as before.
- **Links:** next to the CV and LinkedIn you can add up to 8 links: GitHub, website, portfolio, X, Instagram, TikTok, YouTube, Behance, Dribbble, Medium or other. Addresses are saved as `https://` links; anything else is refused. Links are shared like LinkedIn: with everyone, or only with connections if your profile is set to *Connections*.

### Network

- **Discover** lists everyone who finished the sign-up questions, except you and the people you're already connected with (they're under *Manage my network → Connections*), newest members first. A click anywhere on a card opens that member's profile; the buttons at its foot (Connect, View profile) do their own thing. The **Requests** you received sit above it (the first three, then *Show all*), with Ignore and Accept. Search covers names, headlines, skills, regions, industries and languages.
- **Requests** in *Manage my network* (and *Network → Requests* in the nav, or the address `network#requests`) opens a window listing everyone asking to connect, with their note, and Ignore and Accept.
- **Filters** (dropdowns): **Role** (All, Founders, Specialists, or a specialist role) · years of experience · **region** (regions members are in come first) · minimum verified sprints · industry (searchable checklist; industries members chose are listed first).
- **Connect** from a card, or from a member's profile with an optional note (300 characters). The other member sees it under **Requests**, in the nav badge and in Notifications, and can accept or ignore it. You can withdraw a request or remove a connection.
- **Connections** can see each other's CV. A member who sets **Settings → Privacy → Profile visibility** to *Connections* shows only their name, photo, role and headline to everyone else.
- **Live updates:** requests, accepted requests and removed connections reach the other member straight away, with a pop-up and updated badges, on whichever page they have open. No reload needed.
- **Messages:** once connected, a **Message** button appears on the member's card and under *Connected* on their profile. Conversations are real time, with day dividers, a *Seen* marker on your last read message, and *Not sent → Retry* if the connection drops. New messages show in the nav badge, as a pop-up and in the homepage's recent messages. Messages are **not end-to-end encrypted**: they are stored in Supabase and protected by row-level security, so only the two members can read them.
- **Verified sprints, not ratings:** credibility comes only from verified work. Cards and profiles show how many sprints a member's teammates confirmed ("No verified sprints yet" until sprints run). This is the `profiles.sprint_reviews` column; `sprint_rating` stays in the database but is never shown. Members can't set either themselves. There are no star ratings, scores, leaderboards or paid visibility. The profile's *Work record* (rungs reached and verified sprints) can be hidden in Settings → Privacy.

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
3. New members go to the short sign-up, then to the first step for their situation (or to the page they were trying to open), where the site tour waits; returning members go to their start page.
4. Anyone who opens an app page without a role on their profile is sent to sign-up, and comes back to that page afterwards. Members who signed up before the questions changed are not sent back: the homepage and their profile show what's missing instead.

## The launch path

Each project has a **Launch path** page in the planner (`project.html?id=…#launch`): eight stages from a declared idea to a registered, operating company in Indonesia (declare the idea, choose a structure, register and get an NIB, a company tax number, a business bank account, team agreements, sector licences, first hires). `[BRAYDEN: final stage list]`

- Each stage shows the **rung** of the milestone ladder it belongs to, a short explanation, a checklist, buttons for its **toolkit templates** (each starts a document) and **Get help from a vetted partner** (to `partners.html#<kind>` until the partner directory exists).
- Its legal wording is taken from the existing toolkit checklists in `data.js`; nothing new is claimed. Every legal stage says *Guidance, not legal advice* and carries `[BRAYDEN: verify]` until it has been checked.
- **Plan limits:** Explorer, the plan everyone is on in the demo (`plans.current` in `data.js`), opens the first three stages. The others show what they hold and say they open with Builder, which includes the full launch path, linking to the plans.
- Ticks are kept in the project's workspace (`launch.done`), so the whole team sees them. The **Launch path** Mainframe widget shows the next step, which you can tick there, or every stage; new projects' starter widgets include it. The homepage shows the next step on the project you're working on.

## Sprints

`sprints.html` lists two-week online sprints by niche. The lobbies, sprints and how they work are SandBox's own (`sprintLobbies`, `sprints`, `sprintKinds` and `sprintHow` in `data.js`). Dates count from today, so the list always looks current. `[BRAYDEN: the lobbies and the first sprint topics; how teams form]`

- **Save my spot** keeps a member's spot. Google members' spots go into the `sprint_spots` table, where row-level security lets a member insert, read and delete only their own rows. Guests keep theirs in the browser with the rest of the demo, and demo accounts in this browser. Until the table exists, Google members' spots stay in their browser.
- Saved spots show on the sprints page and the homepage. The nav, the footer, the landing page's sprints section and the profile's work record link to the page.
- **To count interest**, in Supabase → SQL editor:

```sql
select sprint_id, count(*) from public.sprint_spots group by sprint_id order by 2 desc;
```

## Profiles

- **Every profile has an address**, `network.html#member/<id>`, and a *Copy profile link* button; yours is in your own profile. The address opens the same window as a click in Discover, built only from what `member_directory()` and `find_member()` return, so invisible members and connections-only profiles are exactly as private as before. An address that can't be shown (an invisible member, someone who left, a wrong link) says so and shows nothing else. Signed out, the address survives signing in.
- **The order** is the same on yours and on other members': name, role or specialty and headline; what they're building or looking for; the work record (verified sprints and rungs); skills and industries; then links, CV, languages and the rest, folded away on phones.

## Program navigator and compliance tracker

- **Program navigator** (planner, under Money): grants, incubators and competitions filtered by rung (starting on the project's), sector and region, with a live count. *Add to Funding opportunities* puts one in the project's funding pipeline. The entries are sample ones (`programs` in `sample.js`), so only the guest demo lists them. `[BRAYDEN: real list later]`
- **Compliance tracker** (planner, under Plan): the recurring obligations a team adds after registration, each with how often it comes round and its next date. Ticking one moves it to its next date; overdue ones show on the homepage. It claims nothing about the law: which obligations apply is for a vetted partner to confirm. The guest demo's sample project has three sample obligations.
- The subscription page lists both as part of Builder and Founder Pro. In the demo every member can use them, and each page says so. The launch path is the one tool with plan limits.

## Prototype, invite only

SandBox is a prototype, invite only (the landing page says *Prototype · Invite only*). It's shown in customer interviews and used by the people you invite; anyone can look around as a guest.

- **Explore the demo** (on the landing page, in the join window, and as `index.html?demo=1` from the public pages) opens the app as a **guest**: a sample founder, Nadia Pratiwi, with sample members, connections, conversations, projects and documents already in place. Everyone and everything in it is fictional and carries a *Sample* label, and it all lives only in that browser. `assets/js/guestdb.js` stands in for Supabase with the same API (`Mori.db`), fed by `assets/js/sample.js`, so every page works exactly as it does for a signed-in member: guests can connect, message, declare projects, write documents and change widgets. A strip under the nav says so on every page, with *Reset the demo* (puts the sample data back the way it started) and *Leave the demo* (forgets it all). Signed-in members never see sample data.
- **Invite only, with Google.** Only Google addresses on your invite list can create an account. A database trigger (`private.check_signup()` on `auth.users`, in `supabase/migrations/20261116120000_open_google_signin.sql`) checks every new account before it exists: while `private.signup_settings.invite_only` is on (it is), the address must be in `public.invites`; and always, it must come from Google sign-in (never email and password, anonymous sign-in or another provider, even if one is switched on by mistake), Google must have verified its email address, and the address mustn't be on the blocklist. If it's refused, Supabase sends the person back to the landing page, which says SandBox is a prototype, invite only, offers the guest demo, and links to *Ask for one* (an email to `contactEmail`). Accounts that already exist aren't affected.
- **18 and over.** Sign-up asks for a date of birth on its first step, and the database refuses one under 18 (`private.check_member_age()`). Only the member sees it; others see an age only if the member chooses to show it. Members who joined before this rule and have no date of birth are asked for one the next time they open SandBox; until they add it they don't appear in the MORI Network and can't browse it or send requests.
- **Block and report.** Every profile has *Report* and *Block* at its foot. Blocking ends any connection or request between the two members, and neither can see the other in the network, send a request or send a message; only the blocker knows. *Settings → Privacy → Blocked members* lists them, with *Unblock*. A report (a reason and, optionally, what happened) is saved to `public.member_reports`, which members can write to but never read, and the reporter's email app opens with the report addressed to `contactEmail`, so it's seen straight away. *Also block* is ticked by default. In the guest demo both stay in the browser and nothing is sent.

### How to invite someone

You need the Google address they'll sign in with (a Gmail address, or a Google Workspace one).

**In the Supabase dashboard** (no SQL):

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → the **Sandbox** project → **Table Editor** (the grid icon on the left).
2. Pick the **invites** table (schema **public**).
3. **Insert → Insert row.**
4. **email**: their address, **all in lower case** (`name@gmail.com`, not `Name@Gmail.com`; the table refuses capitals). **note**: anything that helps you remember, such as "interview, 20 Nov". Leave **created_at** as it is.
5. **Save.** They can sign in straight away with *Continue with Google*; sign-up then asks for their name, date of birth (18 or over) and role.

**Or in the SQL editor** (Supabase → **SQL Editor** → *New query* → paste → **Run**), several at once:

```sql
insert into public.invites (email, note) values
  ('first.person@gmail.com', 'interview, 20 Nov'),
  ('second.person@gmail.com', 'pilot group');
```

**Who's invited, and who has joined:**

```sql
select i.email, i.note, i.created_at, (u.id is not null) as joined
from public.invites i left join auth.users u on lower(u.email) = i.email
order by i.created_at desc;
```

**Take back an invite nobody has used:** delete the row (Table Editor → tick the row → *Delete*), or `delete from public.invites where email = 'name@gmail.com';`. Deleting an invite doesn't remove an account that already exists: for that, see below. Members who joined before SandBox went back to invite-only keep their accounts.

**Open sign-up to everyone again later:** `update private.signup_settings set invite_only = false;` (and `true` to go back).

**Other controls** (SQL editor):

```sql
-- Stop a Google account from ever creating an account, invited or not:
insert into private.signup_blocklist (email, reason) values ('name@example.com', 'spam, 20 Nov');

-- Reports waiting for you, and marking one done:
select r.id, r.created_at, r.reason, r.details, r.reported_id, r.reporter_id from public.member_reports r where r.status = 'open' order by r.created_at;
update public.member_reports set status = 'closed' where id = 1;
```

To remove someone who already has an account: add their address to the blocklist, then delete the user in Authentication → Users. Their profile, projects, messages and connections go with it. Emails are lower case in both lists.

The contact address for the Contact page, refused sign-ups, partner applications and member reports is `contactEmail` in `assets/js/config.js`.

## Run it locally

```bash
npm run serve
```

Then open <http://localhost:4180>. Like GitHub Pages, it serves `home.html` for `/home` and `404.html` for missing addresses. (`python3 -m http.server` also works if you open pages by their `.html` names; it doesn't do clean addresses.) Opened straight from disk (`file://`), the site puts the `.html` back on its links itself.

### Clean addresses

Pages are linked without `.html`: `/home`, `/projects`, `/project?id=…`, `/network#messages`, and the landing page is the site root `/`. The files are still `home.html` and so on; GitHub Pages serves `home.html` for `/home`. If an address without `.html` is ever missed, `404.html` sends it on to the `.html` file. An address that still says `.html` (an old bookmark, a link in an email) works, and the address bar is tidied to the short form (`assets/js/auth.js`). Links you add to the site should use the short form, `href="projects"`, and `href="./"` for the landing page.

**Signed in already?** The landing page (`/`) goes straight to your start page (Home unless you chose another in Settings → Preferences), or to onboarding if sign-up isn't finished. It stays put while Google is returning from sign-in and right after you sign out.

## Checks: lint, HTML validation and tests

The site has no build step; these tools only check it. Install them once (Node 20 or newer):

```bash
npm install
npx playwright install chromium
```

- `npm run lint`: ESLint (`eslint.config.mjs`) on the site's scripts, `tools/` and `tests/`. The vendored Supabase library is skipped.
- `npm run validate`: html-validate (`.htmlvalidate.json`, its recommended rules) on every page. Self-closing `<link/>` and `<meta/>` are allowed.
- `npm test`: ten Playwright tests in `tests/demo.spec.mjs`, run against the guest demo, so they need no Supabase project or Google account; requests to Supabase are blocked. They cover: the guest demo and its reset; sign-up showing only once and the homepage opening at once on a reload; a deep link surviving sign-in; Escape closing a dialog with focus back on what opened it; menus with the keyboard; Projects and Discover filters, chips, live counts and pagination; no sideways scrolling at 360 px; no "coming soon" anywhere; hostile text staying text under the Content-Security-Policy.
- `npm test` also runs `tests/guard.spec.mjs` (no script or test can run against the production Supabase project) and `tests/docs-fixture.spec.mjs` (a document with every format round-trips through the editor, and its Word export matches the approved copy in `tests/e2e/fixtures/docs/`).
- `npm run check`: all three. GitHub runs the same on every push and pull request (`.github/workflows/checks.yml`).

### Authenticated tests on staging

The reliability and collaboration work (the brief of 24 Nov 2026; rules in `CLAUDE.md`) tests the site as real signed-in members, against a **staging** Supabase project, never production. `docs/staging.md` has the one-time setup and the commands:

- `npm run staging:seed`: twelve test members on `test.morisandbox.com`.
- `npm run test:e2e`: the suite in `tests/e2e/`, in Chromium, WebKit and a Chromium phone. Each test's title carries its audit ID (`[E2E-03]`).
- `npm run rls-check`: the two-member row-level security check (`tools/rls-check.mjs`), now on staging only.
- `npm run report`: `reports/<date>-<sha>.md`, one row per audit ID.

`.github/workflows/e2e-staging.yml` runs it all on pull requests, nightly and on demand, once the staging secrets exist. Every script that talks to Supabase refuses the production project (`tools/lib/env.mjs`).

Where things stand: `docs/qa/baseline-2026-11.md` (the Gate 1 baseline), `docs/security/review-2026-11-24.md` (the security review), `docs/adr/` (decisions).

**Cache tags:** every page loads its CSS and JS with `?v=17` (the language dictionaries take the same number). Raise the number in all pages when you change a stylesheet or script, so browsers fetch the new copy.

## Supabase (sign-in, profiles, CVs, network)

The site uses the Supabase project **Sandbox**. The URL and anon key are in `assets/js/config.js`; the anon key is safe in browser code because row-level security protects the data.

- **Auth:** Google provider. In Supabase → Authentication → URL Configuration, set **Site URL** to `https://www.morisandbox.com` and add every address that serves the site to **Redirect URLs**: `https://www.morisandbox.com/**`, and `http://localhost:4173/**` while developing.
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
- `20261114160000_invite_only_signup.sql`: the `invites` table and the first sign-up trigger (invite-only), replaced by the next-but-two.
- `20261116090000_sprint_spots.sql`: the `sprint_spots` table for *Save my spot*, with its own-rows-only policies (see *Sprints*).
- `20261116100000_security_notes.sql`: comments explaining why `member_directory()` and `find_member()` are SECURITY DEFINER, and an explicit deny-all policy on `invites`.
- `20261116120000_open_google_signin.sql`: open Google sign-up with its checks and the invite-only switch, the blocklist, 18 and over, blocks (`member_blocks`, `my_blocks()`) and reports (`member_reports`), and the directory and request rules that go with them (see *Prototype, invite only*).

The last three were applied together on 16 Nov 2026, as one migration named `sprint_spots_security_notes_open_google_signin`. **To apply a migration by hand:** Supabase → SQL editor → paste the file's contents → *Run*. Each file is safe to run twice.

To make a new database change, add the next migration file here and apply it to the project. If you turn on **Deploy to production** in Supabase → Project Settings → Integrations → GitHub, merging into `main` applies new migration files automatically.

**The "Supabase Preview" check on GitHub** comes from Supabase Branching, which creates a temporary copy of the database for each pull request. It needs the Pro plan, and the organization is on the free plan, so the check shows *Skipped*. That is expected. The live site doesn't use it: it talks to the Sandbox project directly through `config.js`.

**Demo mode:** when the site is opened straight from disk (`file://`), "Continue with Google" opens a demo sign-in instead. Onboarding and everything else work with data kept in the browser; CVs keep their file name only.

## Security and accessibility

- **Google sign-in:** the PKCE flow (the sign-in code is swapped for a session in the browser, and it's removed from the address straight after); Google shares only name, email address and photo; the address a member returns to after signing in must be one of the site's own pages; only Google accounts with an email Google has verified can create an account, checked in the database (see *Prototype, invite only*). *Sign out* ends the session in this browser and clears other members' details from it; *Settings → Account → Sign out of all devices* ends every session the account has (other devices within the hour, when their sign-in next refreshes).
- **Row-level security, checked from outside:** `tools/rls-check.mjs` signs in two staging test members (or takes two staging accounts' access tokens) and calls the REST API directly. It refuses production. Account B must not read or change account A's private profile fields, CV, messages, projects, documents, connections, sprint spots or blocks, can't block or report as A, and can't read reports; anonymous callers must get nothing. How to run it is at the top of the file and in docs/staging.md. On 16 Nov 2026 the same rules, plus the sign-up checks, the age rule and blocking, were checked inside the database by impersonating real members (39 checks, all passed, every change rolled back).
- **SECURITY DEFINER functions:** `member_directory()`, `find_member()` and `my_blocks()` are flagged by the Supabase advisor on purpose. They set a fixed, empty `search_path`, only signed-in members can call them, and they return only the fields a member chose to show (`my_blocks()`: only your own blocks, with a name and photo). The directory and name search answer only members who are 18 or over and never cross a block. Comments on each function say so. The advisor's *Leaked password protection* warning doesn't apply: there are no passwords.
- **No unsafe HTML:** every value from a member goes into the page through `esc()` or `textContent`. Links from members (LinkedIn, profile links, funding links, links in documents) are shown only if they start with `https://` (`mailto:` too, in documents). Photos load only from `https://`, `data:` or `blob:` addresses. A test fills a name, headline, project, task, message, document, obligation and links with script-carrying strings and checks nothing runs.
- **Content-Security-Policy** (a `<meta>` tag on every page, since GitHub Pages can't set headers): scripts, styles, fonts and pages from this site only; data from the Supabase project (REST, storage, realtime); images also from Google profile photos. No inline scripts, apart from the 404 page's base-path snippet, allowed by its hash. Google sign-in is a redirect through Supabase, so it needs nothing more. **If you change `supabaseUrl` in `config.js`** or an inline script, run `python3 tools/set_csp.py` to rewrite the tags.
- **Menus are disclosures:** a button with `aria-expanded` shows a list of links. Tab moves through them, Escape closes the menu and returns to its button, and no arrow keys are needed. Projects and Network keep their links, with a small toggle beside each for the keyboard and touch.
- **Errors:** a form shows each error under its field, tied to it with `aria-describedby`, until it's fixed. Something that fails in the background (a save, a sign-in, a load) shows an alert that stays until it's dismissed. Toasts only confirm things that worked.
- **Checked on 16 Nov 2026:** axe finds no serious or critical issues on any page, dialog or error state, in light and dark mode. Nothing overflows at 200% zoom. On touch screens every control is at least 44 px (`@media (pointer: coarse)` in `mori.css`). Repeated actions (tabs, filters, menus, planner pages) animate for 200 ms at most.

### Settings only you can change

These live in the Supabase and Google dashboards, not in this repository. For a public launch they should look like this:

- **Supabase → Authentication → Sign In / Providers:** Google on; Email, Phone and Anonymous sign-ins off. (The database refuses anything but Google anyway; turning them off means nobody even gets that far.)
- **Supabase → Authentication → URL Configuration:** *Site URL* is `https://www.morisandbox.com` (the custom domain in `CNAME`). *Redirect URLs* lists only the addresses that serve the site: `https://www.morisandbox.com/**`; remove `localhost` entries when you aren't developing.
- **Supabase → Authentication → Sessions:** keep refresh-token rotation and reuse detection on (the default), and the access token lifetime at an hour or less.
- **Google Cloud → Google Auth Platform (OAuth consent screen):** the publishing status decides whether Google keeps its own invite list too. *Testing*: only the test users listed under **Audience → Test users** (up to 100) can get past Google's sign-in screen, so everyone you invite goes on that list as well as on `public.invites`. *In production*: anyone's Google account gets through Google, and the database's invite list alone decides. Either way the database refuses anyone not invited. Give it the app name, a support email, the home page, the privacy policy (`legal.html#privacy`) and the terms (`legal.html#terms`). Ask only for the `openid`, `email` and `profile` scopes.
- **Google Cloud → Credentials → the OAuth client:** the only authorised redirect URI is `https://ovchugvbujrqkowjalfx.supabase.co/auth/v1/callback`. The client secret lives only in Supabase; if it was ever shared, make a new one.
- **Legal:** the legal page is a draft. Have a lawyer check it, the privacy policy above all, against Indonesia's Personal Data Protection Law before inviting the public.

## Project structure

```
index.html  onboarding.html  home.html  projects.html  project.html  network.html  sprints.html
directory.html  subscription.html  partners.html  legal.html  about.html  contact.html  toolkits.html  404.html
assets/
  css/
    mori.css        design system: tokens, aura, nav, glass, chips, buttons, forms,
                    modals, toasts, loading screen, account modals, motion
    landing.css · onboarding.css · home.css · network.css
    subscription.css the subscription ladder
    tour.css        the guided tours: slideshow, its animated pictures, the spotlight
    sprints.css     the sprints page
    directory.css   the partner directory
    projects.css    Projects page, plus the parts the planner shares (preview, team, pickers)
    project.css     the project planner
    dark.css        dark mode, generated by tools/make_dark_css.py (don't edit by hand)
  i18n/             the Indonesian and Chinese dictionaries (built by tools/i18n/build.py; don't edit)
  js/
    i18n.js         languages: the chosen language, and the translation of every page (loads first)
    config.js       Supabase URL + anon key
    auth.js         storage (with parsed-value cache), session, route guards (loads in <head>)
    db.js           Supabase: Google sign-in, profiles, photos, CVs, member directory, connection
                    requests, projects + co-founders, messages, Realtime subscription
    data.js         option lists (roles, regions, industries, languages, link types…), milestone ladder, the subscription plans (placeholders)
                    the launch path stages (marked [BRAYDEN: final stage list]) and the sprint catalogue
    sample.js       the guest demo's fictional members, connections, conversations, projects, documents, sprints, partners and programmes (all labelled Sample)
    guestdb.js      the guest demo's database: Mori.db with the same API as db.js, kept in this browser and seeded from sample.js
    public.js       the public pages: the contact address, the toolkit library, the partner application
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
    planner-tools.js the tool pages: tasks, GTM checklist, ladder, launch path, people, interviews,
                    lean canvas, marketing, metrics, finance, funding, toolkits
    sprints.js      the sprints page: lobbies, sprint pages, Save my spot
    directory.js    the partner directory
    planner-docs.js the documents: list and editor (formatting, autosave, Word download, sanitising)
    tour.js         the guided tours: the site tour (four slides after sign-up)
                    and the first-project tour (a spotlight over the planner)
    landing.js · onboarding.js · home.js · projects.js · network.js · subscription.js
  vendor/supabase-2.58.0.js
  fonts/            Inter (latin and latin-ext, weights 400–700) and its licence (OFL)
  img/              the MORI logo (森) on a rounded white tile, as the site icon: mori-icon.svg,
                    mori-icon-32.png, mori-icon-180.png (a full square: phones round it themselves);
                    the background aura: aura-light-wide.webp, aura-dark-wide.webp, aura-*-tall.webp
favicon.ico         the MORI logo for browsers that look for /favicon.ico
tools/
  i18n/             translations.json (the source of truth) and the scripts that collect the
                    English phrases and build the dictionaries; see Languages above
  make_dark_css.py  builds assets/css/dark.css from the light stylesheets
  dark-overrides.css hand-tuned dark values (aura images, base colour, logo)
  make_aura.py      renders the background aura images (needs numpy and Pillow)
  set_csp.py        writes the Content-Security-Policy tag into every page
  rls-check.mjs     the two-account row-level security check (staging only; signs in seeded members)
  staging-seed.mjs  creates the twelve staging test members (refuses production)
  staging-clean.mjs deletes leftover e2e- projects on staging
  report.mjs        test results → reports/<date>-<sha>.md, one row per audit ID
  lib/env.mjs       staging settings and the production guard
tests/
  demo.spec.mjs     the ten browser tests (guest demo)
  guard.spec.mjs    nothing may run against the production Supabase project
  docs-fixture.spec.mjs  the editor and Word export against the approved fixture
  e2e/              the authenticated suite on staging (fixtures, sign-in setup, specs, docs fixtures)
  serve.mjs         a small static server for the tests and for local use (MORI_ENV=staging serves the staging config)
docs/               staging.md · adr/ · qa/ (baselines) · security/ (reviews)
CLAUDE.md           the ground rules for every session
package.json · eslint.config.mjs · .htmlvalidate.json · playwright.config.mjs   the checks (npm install)
.github/workflows/checks.yml   runs them on GitHub
supabase/
  config.toml       read by Supabase's GitHub integration and the Supabase CLI
  migrations/       every database change, in order
```

## Performance notes

- **Prerendering:** on signed-in pages, hovering a nav link prerenders the page (Chrome / Edge Speculation Rules), so the click feels instant. Other browsers get a quick cross-fade without blur. Phones and tablets only prefetch the link being pressed, and never prerender; with Save-Data on, or on 2G, nothing is fetched ahead.
- **No jumps while loading:** the nav and the guest demo bar are drawn by script after the first paint, so app pages reserve their height from the start (estimates in `mori.css`, then the height last measured at that width, applied in `auth.js` before the page paints). Icon placeholders carry the icon's class, so they take its size before the icon arrives.
- **Mobile Lighthouse (16 Nov 2026, local server, guest demo):** landing page 97, home 100, Network 82, a project's Mainframe 98. The local server doesn't compress files; GitHub Pages does, which helps further. Network's remaining layout shift comes from its first render of the requests and Discover lists.
- **The background aura** is one image per theme and shape: 225–405 KB (WebP), only the one for the current theme and screen shape loads. They're dithered on purpose (smooth gradients in Safari), which is what keeps them from getting smaller.
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

Copy follows the SandBox Lean Canvas (final, 13 November 2026) and the Milestone Ladder core-kit doc. For now the app focuses on two roles, **founders** and **specialists**. Subscription prices and perks are placeholders; the illustrations on the landing page and in the tours are decorative.
