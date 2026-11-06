# Mori: Sandbox — concept site

The first clickable concept for **SandBox by MORI Group**: an open-access place where Indonesia's aspiring founders *find their people, build their idea and earn the spotlight*.

Plain HTML, CSS and JavaScript. There is no build step and nothing to install. It uses the same design language as the original Sandbox drafts (aura background, glass panels, Inter, the blue and orange accents) plus a motion layer on top.

## Pages and flow

| Page | What it is |
| --- | --- |
| `index.html` | **Landing page.** Laid out like a professional network's landing page: hero with sign-in, topic and search pills, a "declare your startup" band, toolkits, sprints, "open to build", mentors, the milestone ladder, "who is Sandbox for?" and a closing call to action. |
| `home.html` | **Homepage** once signed in, from the original `index.html` draft: greeting, the two entry cards, pinned project with progress ring, recent messages, insights. |
| `projects.html` | **Projects**, from the original `projects.html` draft: search, tag filters, sort and pagination. Adds a project drawer (sprint milestones, milestone ladder, team) and **New Project**. |
| `network.html` | **Network** with three tabs: **Explore** (people and active rooms), **Requests** (accept, ignore, withdraw) and **Messages** (chat with typing indicator and replies). |

**Profile**, **Settings** and **Notifications** are modals opened from the **Account** menu on every signed-in page.

Sign in or join from the landing page, and you land on the homepage (or the start page you chose in Settings). If you open a signed-in page while signed out, you go to the landing page and come back afterwards.

## Run it locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>. Opening `index.html` straight from disk also works in demo mode, but Google sign-in needs http(s).

## Google sign-in

Until a Client ID is set, the site runs in **demo mode**. "Continue with Google" opens a clearly labelled demo sheet that signs you in with a local profile. Nothing leaves the browser.

To turn on real Google sign-in:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), configure the OAuth consent screen (External, Testing is fine) and add yourself as a test user.
2. Create an **OAuth client ID** of type **Web application**.
3. Under **Authorized JavaScript origins**, add every origin you serve from, for example `http://localhost:4173` and later `https://<you>.github.io`.
4. Paste the Client ID into `assets/js/config.js`:

   ```js
   window.MORI_CONFIG = { googleClientId: "1234-abc.apps.googleusercontent.com" };
   ```

This uses Google Identity Services (pop-up account chooser) and reads the member's name, email and photo. It runs **only in the browser**, which is fine for a concept. Before launch, verify sign-ins on a server (or move to Supabase or Firebase Auth with the Google provider).

## Project structure

```
index.html  home.html  projects.html  network.html
assets/
  css/
    mori.css       design system: tokens, aura, nav, glass cards, chips, buttons,
                   forms, modals, toasts, account modals, motion utilities
    landing.css    landing page sections and auth modal
    home.css       homepage (keeps the draft's pinned-project layout)
    projects.css   subnav, grid, pager, project drawer, new-project modal
    network.css    tabs, people, rooms, requests, chat
  js/
    config.js      Google Client ID
    auth.js        storage, session, Google sign-in, route guard (loads in <head>)
    data.js        demo content: projects, people, rooms, messages, notifications, ladder
    state.js       per-member state on top of the demo data (saved in localStorage)
    ui.js          helpers, icons, avatars, toasts, modal/drawer manager
    motion.js      reveal-on-scroll, spotlight, tilt, parallax, count-ups, rings
    shell.js       shared nav + footer + Profile / Settings / Notifications modals
    landing.js · home.js · projects.js · network.js   page scripts
  img/favicon.svg
```

The nav and footer for signed-in pages are rendered once by `shell.js`, so a change there shows on every page.

## Motion

You can add these effects in markup:

| Attribute / class | Effect |
| --- | --- |
| `data-reveal="up / scale / left / right / blur / fade"` | Fades in when scrolled into view |
| `data-stagger="80"` on a container | Children reveal one after another |
| `data-count="128"` | Counts up when visible |
| `.progress-circle[data-percent="75"]` | Ring animates to its value |
| `.spotlight` | Light and border glow follow the cursor |
| `.tilt` (`data-tilt="4"`) | Gentle 3D tilt toward the cursor |
| `.magnetic` | Button leans toward the cursor |

Page changes cross-fade with the View Transitions API where the browser supports it. Everything respects the device's reduced-motion setting and **Settings → Preferences → Motion effects** (System / Full / Reduced). The animated background can be turned off there too.

## Demo data and state

Seed content lives in `assets/js/data.js`. What a member changes is saved in `localStorage` per member: new projects, ticked milestones, connections, messages, read notifications, profile and settings. **Settings → Account → Reset demo data** clears it.

## Content sources

Copy follows the SandBox Lean Canvas v2 report and the Milestone Ladder core-kit doc (November 2026). Names, projects and numbers in the app are demo data.
