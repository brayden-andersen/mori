/* ==========================================================================
   Mori: Sandbox — homepage
   --------------------------------------------------------------------------
   A fixed grid of panels (render(), below), the same for everyone:
     Row 1: your projects (pinned first) beside Today, a calendar of today's
            meetings, all-day items and tasks due; a new account gets where
            to start instead of projects.
     Row 2: what needs your attention, the launch path, sprints.
     Row 3: people to meet, beside your profile while it's incomplete.
   Under the welcome: today's date and what's on. Every panel that has
   nothing to show says how to start.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, ago, splitWords, avatar, toast, createModal } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const W = Mori.workspace;

  const emptyState = (ic, title, sub, action, kind = "none") =>
    `<div class="empty home-empty empty--${kind}"><span class="empty-ico">${icon(ic)}</span><div>${title}</div><div class="meta">${sub}</div>${action || ""}</div>`;
  /** A panel: the cherry icon at its top left, a small title, and a grey link on the right. `cls` places it on the grid. */
  const panel = (id, ic, title, link, body, cls) =>
    `<section class="panel home-panel ${cls}" id="${id}" aria-labelledby="${id}Title">
      <div class="panel-head"><span class="panel-ico" aria-hidden="true">${icon(ic)}</span><h2 class="panel-title" id="${id}Title">${title}</h2>${link ? `<a class="panel-link" href="${link[0]}">${link[1]}</a>` : ""}</div>
      ${body}
    </section>`;
  const enc = encodeURIComponent;
  const pad = (n) => String(n).padStart(2, "0");
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); };
  const todayISO = () => inDays(0);
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dayLabel = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(Mori.i18n.locale, { day: "numeric", month: "short" }); };
  const L = () => Mori.i18n.locale;
  const weekdayOf = (d) => d.toLocaleDateString(L(), { weekday: "long" });
  const monthOf = (d) => d.toLocaleDateString(L(), { month: "long" });
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* ---------- Greeting ---------- */
  const s = S.session();
  const hello = $("#hello");
  const birthday = S.isBirthday(); // from the date of birth given at sign-up, if any
  hello.innerHTML = `${birthday ? "Happy birthday" : s.isNew ? "Welcome" : "Welcome back"}, <span id="username">${esc(s.givenName || s.name)}</span>`;
  if (birthday) document.body.classList.add("is-birthday");
  if (s.isNew) Mori.auth.updateSession({ isNew: false });

  /* ---------- What the member has done ---------- */
  const hasActivity = () => S.projects().length > 0 || S.network.connections().length > 0 || S.chat.threads().length > 0;
  /** Projects to continue: pinned first, then the most recently touched. */
  const recentProjects = () => {
    const pinned = S.pinnedProjects();
    const ids = new Set(pinned.map((p) => p.id));
    const rest = S.projects().filter((p) => !ids.has(p.id)).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    return pinned.concat(rest);
  };
  const focusProject = () => recentProjects()[0] || null;

  /* ---------- The launch path: the next unticked step of a project (workspace.js works it out) ---------- */
  const launchNext = (p) => {
    const L = W.launch(p ? W.get(p.id) : null);
    return { L, total: L.total, ticked: L.ticked, pct: L.pct, next: L.next && { stage: L.next.stage, index: L.next.index, text: L.next.item.text, open: L.next.open } };
  };

  /* ---------- Meetings ----------
     A project's meetings are saved with the project (its workspace), so its
     whole team sees them; a meeting for "Just me" is kept with your settings,
     which only you see (and which follow you to your other devices).
     { id, title, date: "YYYY-MM-DD", start: "HH:MM", end: "HH:MM" | "" }.
     Meetings more than 60 days old are dropped when the list is next saved. */
  const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const validMeeting = (m) => m && typeof m === "object" && m.id && DAY.test(m.date || "") && HM.test(m.start || "") && String(m.title || "").trim();
  const keepRecent = (list) => { const floor = inDays(-60); return list.filter((m) => validMeeting(m) && m.date >= floor); };
  const personalMeetings = () => (Array.isArray(S.settings().meetings) ? S.settings().meetings : []).filter(validMeeting);
  function meetingsOn(date) {
    const mine = personalMeetings().filter((m) => m.date === date).map((m) => ({ m, p: null }));
    const team = [];
    S.projects().forEach((p) => W.get(p.id).meetings.items.forEach((m) => { if (validMeeting(m) && m.date === date) team.push({ m, p }); }));
    return mine.concat(team).sort((a, b) => a.m.start.localeCompare(b.m.start) || a.m.title.localeCompare(b.m.title));
  }
  function findMeeting(id) {
    const mine = personalMeetings().find((m) => m.id === id);
    if (mine) return { m: mine, p: null };
    for (const p of S.projects()) {
      const m = W.get(p.id).meetings.items.find((x) => x && x.id === id);
      if (m) return { m, p };
    }
    return null;
  }
  function removeMeeting(id, pid) {
    if (pid) return W.change(pid, "meetings", (cur) => ({ items: cur.items.filter((x) => x && x.id !== id) }));
    S.saveSettings({ meetings: personalMeetings().filter((x) => x.id !== id) });
    return Promise.resolve();
  }
  async function saveMeeting(m, pid, before) {
    if (before && before.pid !== pid) await removeMeeting(m.id, before.pid); // moved to another project, or to Just me
    if (pid) await W.change(pid, "meetings", (cur) => ({ items: keepRecent(cur.items.filter((x) => x && x.id !== m.id).concat([m])) }));
    else S.saveSettings({ meetings: keepRecent(personalMeetings().filter((x) => x.id !== m.id).concat([m])) });
  }

  /* ---------- Today: what's on, like a calendar widget ---------- */
  function today() {
    const date = todayISO();
    const allDay = [];
    S.projects().forEach((p) => {
      const ws = W.get(p.id);
      ws.compliance.items.forEach((x) => { if (x && !x.done && x.due === date) allDay.push({ text: `${x.name || "An obligation"} is due`, where: p.name, href: `project.html?id=${enc(p.id)}#compliance` }); });
      ws.layout.forEach((w) => { if (w.type === "countdown" && w.opts && w.opts.date === date) allDay.push({ text: w.opts.label || "The big day", where: p.name, href: `project.html?id=${enc(p.id)}#mainframe` }); });
    });
    D.sprints.forEach((x) => { if (x.startsIn === 0 && S.sprints.has(x.id)) allDay.push({ text: `${x.title} starts`, where: "Sprint", href: `sprints.html#sprint/${enc(x.id)}` }); });
    const tasks = [];
    S.projects().forEach((p) => p.tasks.forEach((t) => { if (t.due === date) tasks.push({ p, t }); }));
    return { date, allDay, meetings: meetingsOn(date), tasks };
  }

  function todayPanel() {
    const d = new Date();
    const t = today();
    const now = nowHM();
    const nowLine = `<li class="td-now" aria-label="Now, ${now}"><span class="td-now-dot"></span><span class="td-now-time">Now ${now}</span><span class="td-now-rule"></span></li>`;
    const rows = [];
    let nowShown = false;
    t.meetings.forEach(({ m, p }) => {
      if (!nowShown && m.start > now) { rows.push(nowLine); nowShown = true; }
      const past = m.end ? m.end <= now : m.start < now;
      rows.push(`<li class="td-meet${past ? " is-past" : ""}"><button type="button" class="td-meet-btn" data-meeting="${esc(m.id)}" aria-label="${esc(m.title)}, ${esc(m.start)}${m.end ? ` to ${esc(m.end)}` : ""}, ${p ? esc(p.name) : "just you"}. Edit">
        <span class="td-time">${esc(m.start)}</span>
        <span class="td-what"><b>${esc(m.title)}</b><span class="meta">${esc(m.start)}${m.end ? `–${esc(m.end)}` : ""} · ${p ? esc(p.name) : "Just me"}</span></span>
      </button></li>`);
    });
    if (t.meetings.length && !nowShown) rows.push(nowLine);
    const nothing = !t.allDay.length && !t.meetings.length && !t.tasks.length;
    return `
    <section class="panel home-panel s4 td" id="todayPanel" aria-labelledby="todayPanelTitle">
      <div class="panel-head"><span class="panel-ico" aria-hidden="true">${icon("calendar")}</span><h2 class="panel-title" id="todayPanelTitle">Today</h2></div>
      <div class="td-date"><span class="td-day">${d.getDate()}</span><span class="td-wk"><b>${esc(weekdayOf(d))}</b><span class="meta">${esc(monthOf(d))}</span></span></div>
      ${t.allDay.map((x) => `<a class="td-allday" href="${x.href}"><span class="td-allday-tag">All day</span><span>${esc(x.text)}<span class="meta"> · ${esc(x.where)}</span></span></a>`).join("")}
      ${rows.length ? `<ol class="td-list" aria-label="Meetings today">${rows.join("")}</ol>` : ""}
      ${t.tasks.length ? `<div class="td-tasks"><p class="td-label">Due today</p>${t.tasks.map(({ p, t: k }) => `
        <label class="td-task${k.done ? " is-done" : ""}"><input type="checkbox" data-today-task="${esc(p.id)}" data-task="${esc(k.id)}" ${k.done ? "checked" : ""}><span class="td-task-text">${esc(k.text)}<span class="meta"> · ${esc(p.name)}</span></span></label>`).join("")}</div>` : ""}
      ${nothing ? `<p class="meta td-empty">Nothing scheduled today. Your meetings, and tasks due today in your projects, show here.</p>` : ""}
      <button class="btn btn--sm td-add" type="button" data-add-meeting>${icon("plus")} Add a meeting</button>
    </section>`;
  }

  /** The line under the welcome: today's date, and what's on. */
  function summary() {
    const d = new Date();
    const t = today();
    const open = t.tasks.filter((x) => !x.t.done).length;
    const parts = [];
    if (t.meetings.length) parts.push(plural(t.meetings.length, "meeting", "meetings"));
    if (open) parts.push(plural(open, "task", "tasks") + (t.meetings.length ? "" : " due"));
    const what = parts.length ? `${parts.join(" and ")} today` : hasActivity() ? "nothing scheduled today" : "let’s get you started";
    return { date: d.toLocaleDateString(L(), { weekday: "long", day: "numeric", month: "long" }), what };
  }

  function showSummary() {
    const sm = summary();
    $("#prompt").innerHTML = `<span>${esc(sm.date)}</span> · <span>${esc(sm.what)}</span>`;
  }

  /* ---------- Panels ---------- */
  function startPanel() {
    const sit = S.settings().situation;
    const role = S.profile().role;
    const options = [
      { id: "idea", icon: "bulb", title: "Declare your first project", body: "Put the idea in a form a specialist can judge in two minutes. It opens on its Mainframe, with its launch path.", href: "projects.html?new=1", cta: "Declare a project" },
      { id: "skills", icon: "compass", title: "Find founders to build with", body: "Discover founders by industry and region, connect with a note, and join a sprint when the first ones start.", href: "network.html#explore", cta: "Discover members" },
      { id: "prototype", icon: "rocket", title: "Make your prototype real", body: "Declare the project at the stage you’re at, then follow the launch path: structure, registration, licences, tax.", href: "projects.html?new=1&rung=2", cta: "Start the launch path" },
    ];
    const first = options.find((o) => o.id === (sit || (role === "specialist" ? "skills" : "idea")));
    const rest = options.filter((o) => o !== first);
    return panel("startPanel", "compass", "Start here", null, `
      <div class="start-grid">
        <a class="card spotlight start-main" href="${first.href}">
          <span class="start-ico">${icon(first.icon)}</span>
          <h3>${esc(first.title)}</h3>
          <p class="meta">${esc(first.body)}</p>
          <span class="btn btn--ink btn--sm">${esc(first.cta)}</span>
        </a>
        <div class="start-rest">${rest.map((o) => `<a class="card spotlight start-alt" href="${o.href}"><span class="start-ico start-ico--sm">${icon(o.icon)}</span><div><b>${esc(o.title)}</b><span class="meta">${esc(o.cta)}</span></div></a>`).join("")}</div>
      </div>`, "s8");
  }

  function continuePanel() {
    const list = recentProjects().slice(0, 3);
    if (!list.length) {
      return panel("continuePanel", "projects", "Continue where you left off", ["projects.html", "All projects"],
        emptyState("projects", "No projects yet", "Declare your first project to track its launch path and milestones here.", `<a class="btn btn--ink" href="projects.html?new=1">${icon("plus")} Declare a project</a>`), "s8");
    }
    return panel("continuePanel", "projects", "Continue where you left off", ["projects.html", "All projects"], `
      <div class="cp-list">${list.map((p) => {
        const l = launchNext(p);
        const tag = p.tags && p.tags.length ? p.tags[0] : "";
        const when = p.updatedAt || p.createdAt;
        return `
        <article class="cp-row" data-project="${esc(p.id)}">
          <div class="cp-main">
            <div class="cp-top"><a class="cp-name continue-name" href="project.html?id=${enc(p.id)}">${esc(p.name)}</a>${p.sample ? Mori.ui.sampleTag("A sample project for the demo") : ""}${tag ? `<span class="chip">${esc(tag)}</span>` : ""}${p.pinned ? `<span class="chip">${icon("pin")} Pinned</span>` : ""}${when ? `<span class="meta cp-when">Updated ${esc(ago(when).toLowerCase())}</span>` : ""}</div>
            ${p.focus ? `<p class="cp-focus">Focus: ${esc(p.focus)}</p>` : ""}
            ${l.next && l.next.open ? `<p class="meta cp-next">Next on the launch path: <b>${esc(l.next.text)}</b></p>` : ""}
          </div>
          <div class="progress-wrapper cp-ring" role="img" aria-label="${esc(p.name)} is ${p.overall}% done" title="${p.overall}%">
            <div class="progress-circle" data-percent="${p.overall}"><div class="progress-inner" aria-hidden="true"></div><div class="progress-label" aria-hidden="true">0%</div></div>
          </div>
        </article>`;
      }).join("")}</div>`, "s8");
  }

  function attentionPanel() {
    const requests = S.network.incoming();
    const threads = S.chat.threads().filter((t) => t.unread > 0);
    const date = todayISO();
    const overdue = [];
    S.projects().forEach((p) => p.tasks.forEach((t) => { if (!t.done && t.due && t.due < date) overdue.push({ p, t }); }));
    const lateDuties = [];
    S.projects().forEach((p) => W.get(p.id).compliance.items.forEach((x) => { if (x && !x.done && x.due && x.due < date) lateDuties.push({ p, x }); }));
    const rows = [];
    if (requests.length) rows.push(`<a class="attn-row" href="network.html#requests"><span class="attn-ico">${icon("inbox")}</span><div><b>${plural(requests.length, "connection request", "connection requests")}</b><span class="meta">${esc(requests.slice(0, 2).map((r) => r.person.name).join(", "))}</span></div></a>`);
    threads.slice(0, 2).forEach((t) => rows.push(`<a class="attn-row" href="network.html#messages/${enc(t.id)}"><span class="attn-ico">${icon("message")}</span><div><b>${esc(t.person.name)}</b><span class="meta">${esc(t.last ? t.last.body : "")}</span></div></a>`));
    if (overdue.length) rows.push(`<a class="attn-row" href="project.html?id=${enc(overdue[0].p.id)}#tasks"><span class="attn-ico is-late">${icon("clock")}</span><div><b>${plural(overdue.length, "overdue task", "overdue tasks")}</b><span class="meta">${esc(overdue[0].p.name)} · ${esc(overdue[0].t.text)}</span></div></a>`);
    if (lateDuties.length) rows.push(`<a class="attn-row" href="project.html?id=${enc(lateDuties[0].p.id)}#compliance"><span class="attn-ico is-late">${icon("shield")}</span><div><b>${plural(lateDuties.length, "overdue obligation", "overdue obligations")}</b><span class="meta">${esc(lateDuties[0].p.name)} · ${esc(lateDuties[0].x.name || "")}</span></div></a>`);
    const body = rows.length
      ? `<div class="attn-list">${rows.slice(0, 4).join("")}</div>`
      : emptyState("check", "You’re all caught up", "No requests waiting, nothing unread and nothing overdue.");
    return panel("attentionPanel", "inbox", "Needs your attention", ["network.html#messages", "Open messages"], body, "s4");
  }

  function launchPanel(p) {
    if (!p) {
      return panel("launchPanel", "ladder", "Your launch path", null, `
        <p class="lp-title">Eight stages from an idea to a registered company</p>
        <p class="meta lp-sub">Declare the idea, choose a structure, register and get an NIB, a tax number, a bank account, team agreements, licences and first hires. It starts with your first project.</p>
        <a class="btn btn--sm" href="projects.html?new=1">${icon("plus")} Declare a project</a>`, "s4");
    }
    const l = launchNext(p);
    const href = `project.html?id=${enc(p.id)}#launch`;
    if (!l.next) {
      return panel("launchPanel", "ladder", "Launch path", [href, "Open it"],
        emptyState("check", "Launch path complete", `${esc(p.name)} has ticked every step. Keep its obligations up to date in the compliance tracker.`), "s4");
    }
    const st = l.L.stages[l.next.index];
    const items = st.items.slice(0, 3).map((x) => `<li class="lp-item${x.done ? " is-done" : ""}"><span class="lp-box" aria-hidden="true">${x.done ? icon("check") : ""}</span><span>${esc(x.text)}</span><span class="sr-only">${x.done ? "(done)" : "(to do)"}</span></li>`).join("");
    const stageDone = st.items.filter((x) => x.done).length;
    return panel("launchPanel", "ladder", "Launch path", [href, "Open it"], `
      <p class="meta lp-sub">${esc(p.name)} · stage ${l.next.index + 1} of ${l.L.stages.length}${st.legal ? ` · <span title="${esc(D.launchPath.disclaimer)}">guidance, not legal advice</span>` : ""}</p>
      <p class="lp-title">${esc(st.title)}</p>
      ${l.next.open ? `<ul class="lp-items">${items}</ul>` : `<p class="meta">${esc(D.launchPath.unlock.text)}</p>`}
      <div class="lp-progress"><div class="nudge-bar" role="img" aria-label="${stageDone} of ${st.items.length} steps done in this stage"><i style="width:${Math.round((stageDone / st.items.length) * 100)}%"></i></div><span class="meta">${stageDone} of ${st.items.length}</span></div>`, "s4");
  }

  function sprintsPanel() {
    const soon = D.sprints.filter((x) => x.startsIn >= 0).sort((a, b) => a.startsIn - b.startsIn);
    const saved = soon.filter((x) => S.sprints.has(x.id));
    const list = saved.concat(soon.filter((x) => !S.sprints.has(x.id))).slice(0, 3);
    const lobby = (id) => (D.sprintLobbies.find((l) => l.id === id) || {}).name || "";
    const body = list.length
      ? `<ul class="sprint-list">${list.map((x) => `<li><a class="sprint-link" href="sprints.html#sprint/${enc(x.id)}"><span class="sprint-when">${esc(dayLabel(inDays(x.startsIn)))}</span><div><b>${esc(x.title)}</b><span class="meta">${esc(lobby(x.lobby))}${S.sprints.has(x.id) ? " · spot saved" : ` · teams of ${esc(x.teamSize)}`}</span></div></a></li>`).join("")}</ul>`
      : emptyState("zap", "No sprints scheduled", "New sprints show here as soon as they’re announced.");
    return panel("sprintsPanel", "zap", saved.length ? "Your sprints" : "Upcoming sprints", ["sprints.html", "All sprints"], body, "s4");
  }

  function peoplePanel(cls) {
    const n = cls === "s12" ? 4 : 3;
    if (!S.network.available()) {
      return panel("peoplePanel", "userPlus", "People to meet", null, emptyState("network", "Members need a Google sign-in", "Demo accounts stay on this device, so there’s no one to meet here. The guest demo on the landing page has sample members.", "", "unbuilt"), cls);
    }
    const mine = new Set(S.network.connections().map((m) => m.id));
    const people = S.network.members().filter((m) => !mine.has(m.id) && !m.invisible && S.network.status(m.id) === "none").slice(0, n);
    if (!people.length) {
      return panel("peoplePanel", "userPlus", "People to meet", ["network.html#explore", "Discover"], emptyState("userPlus", "You’re one of the first members", "Founders and specialists appear here as they finish signing up.", `<a class="btn" href="network.html#explore">${icon("compass")} Open Discover</a>`), cls);
    }
    return panel("peoplePanel", "userPlus", "People to meet", ["network.html#explore", "Discover"], `
      <div class="people-row people-row--${n}">${people.map((m) => `
        <a class="card spotlight person-mini" href="network.html#member/${enc(m.id)}">
          ${avatar(m, 44)}
          <div><b>${esc(m.name)}${m.sample ? Mori.ui.sampleTag() : ""}</b><span class="meta">${esc(m.specialty || (D.roles[m.role] ? D.roles[m.role].label : ""))}${m.region ? ` · ${esc(m.region)}` : ""}</span>${m.headline ? `<span class="meta person-mini-line">${esc(m.headline)}</span>` : ""}</div>
        </a>`).join("")}</div>`, cls);
  }

  function profilePanel() {
    const c = S.profileCompleteness();
    if (c.pct >= 100) return "";
    return panel("profilePanel", "user", "Your profile", ["onboarding.html?edit=1", "Add details"], `
      <p class="pp-pct"><b>${c.pct}%</b> complete</p>
      <div class="nudge-bar" role="img" aria-label="Profile ${c.pct}% complete"><i style="width:${c.pct}%"></i></div>
      <p class="meta pp-next">Still to add: ${esc(c.missing.slice(0, 3).join(", "))}. Founders and specialists reply more to full profiles.</p>`, "s4");
  }

  /* ---------- Render ----------
     Row 1: your projects (or, for a new account, where to start) beside Today.
     Row 2: what needs your attention, the launch path, sprints.
     Row 3: people to meet, beside your profile while it's incomplete.
     On a phone it's one column, Today first. */
  const grid = $("#homeGrid");
  let lastKey = "";
  function render() {
    const active = hasActivity();
    const p = focusProject();
    const t = today();
    const c = S.profileCompleteness();
    const key = JSON.stringify([active, t.date, recentProjects().slice(0, 3).map((x) => [x.id, x.name, x.focus, x.overall, x.pinned, x.updatedAt, x.tags]), p && launchNext(p).ticked, c.pct, S.settings().situation,
      t.allDay, t.meetings.map((x) => [x.m, x.p && x.p.id]), t.tasks.map((x) => [x.t.id, x.t.done, x.t.text]),
      S.network.incoming().map((r) => r.link.id), S.chat.threads().map((x) => [x.id, x.unread, x.last && x.last.id]), S.network.members().length, S.network.connections().length,
      S.projects().map((x) => x.tasks.filter((k) => !k.done && k.due && k.due < t.date).length), S.projects().map((x) => W.get(x.id).compliance.items.filter((i) => i && !i.done && i.due && i.due < t.date).length), S.sprints.spots().map((x) => x.id)]);
    if (key === lastKey) return;
    lastKey = key;
    showSummary();
    const profile = profilePanel();
    grid.innerHTML = (active ? continuePanel() : startPanel()) + todayPanel()
      + attentionPanel() + launchPanel(p) + sprintsPanel()
      + peoplePanel(profile ? "s8" : "s12") + profile;
    Mori.motion.refresh(grid);
  }

  /** The clock moved: redraw Today (its now line, what's past) and the line under the welcome, nothing else. */
  function refreshToday() {
    const el = $("#todayPanel");
    if (!el) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = todayPanel().trim();
    el.replaceWith(tmp.firstElementChild);
    showSummary();
  }

  /* ---------- Meeting window: add, edit, delete ---------- */
  const nextHalfHour = () => { const d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  function openMeeting(id, opener) {
    const found = id ? findMeeting(id) : null;
    if (id && !found) { Mori.ui.problem("That meeting was deleted."); return; }
    const m = found ? found.m : { id: "", title: "", date: todayISO(), start: nextHalfHour(), end: "" };
    const fp = focusProject();
    const pid0 = found ? (found.p ? found.p.id : "") : fp ? fp.id : "";
    const root = createModal("meetingModal", { label: found ? "Edit meeting" : "Add a meeting", panelCls: "modal--new" });
    const box = $(".modal", root);
    box.setAttribute("aria-labelledby", "mtTitle");
    box.innerHTML = `
      <div class="modal-head">
        <div><h2 id="mtTitle">${found ? "Edit meeting" : "Add a meeting"}</h2><p class="meta">A project’s meetings show for its whole team. “Just me” keeps it to you.</p></div>
        <button class="icon-btn modal-x" type="button" data-close aria-label="Close">${icon("x")}</button>
      </div>
      <form class="modal-body np-form" id="mtForm" novalidate>
        <label class="field"><span>What</span><input class="input" name="title" maxlength="80" value="${esc(m.title)}" placeholder="e.g. Team stand-up" autocomplete="off" autofocus></label>
        <div class="mt-when">
          <label class="field"><span>Day</span><input class="input" type="date" name="date" value="${esc(m.date)}"></label>
          <label class="field"><span>From</span><input class="input" type="time" name="start" value="${esc(m.start)}"></label>
          <label class="field"><span>To <em class="hint">optional</em></span><input class="input" type="time" name="end" value="${esc(m.end || "")}"></label>
        </div>
        <label class="field"><span>For</span><select class="select" name="project">
          <option value="">Just me</option>
          ${S.projects().map((p) => `<option value="${esc(p.id)}" ${p.id === pid0 ? "selected" : ""}>${esc(p.name)} (its team sees it)</option>`).join("")}
        </select></label>
      </form>
      <div class="modal-foot">
        ${found ? `<button class="btn btn--danger mt-delete" type="button" id="mtDelete">${icon("trash")} Delete</button>` : ""}
        <button class="btn" type="button" data-close>Cancel</button>
        <button class="btn btn--ink" type="submit" form="mtForm" id="mtSave">${icon("check")} Save</button>
      </div>`;
    const form = $("#mtForm", box);
    const f = form.elements;
    const problemOf = {
      title: () => (String(f.title.value).trim() ? "" : "Say what the meeting is."),
      date: () => (DAY.test(f.date.value) ? "" : "Pick a day."),
      start: () => (HM.test(f.start.value) ? "" : "Pick when it starts."),
      end: () => (!f.end.value || (HM.test(f.end.value) && f.end.value > f.start.value) ? "" : "It has to end after it starts."),
    };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      for (const k of ["title", "date", "start", "end"]) {
        const msg = problemOf[k]();
        if (msg) { Mori.ui.fieldError(f[k], msg, problemOf[k]); f[k].focus(); return; }
      }
      const rec = { id: m.id || W.uid("mt"), title: String(f.title.value).trim().slice(0, 80), date: f.date.value, start: f.start.value, end: f.end.value || "" };
      const pid = f.project.value || null;
      const save = $("#mtSave", box);
      save.disabled = true;
      try {
        await saveMeeting(rec, pid, found ? { pid: found.p ? found.p.id : null } : undefined);
        Mori.modal.close();
        toast(found ? "Meeting saved" : "Meeting added", { icon: "calendar" });
      } catch (err) {
        save.disabled = false;
        Mori.ui.problem("Couldn’t save the meeting. " + (err && err.message ? err.message : "Check your connection and try again."));
      }
    });
    const del = $("#mtDelete", box);
    if (del) del.addEventListener("click", async () => {
      if (!Mori.people.confirmTap(del, "Tap again to delete")) return;
      del.disabled = true;
      try {
        await removeMeeting(found.m.id, found.p ? found.p.id : null);
        Mori.modal.close();
        toast("Meeting deleted", { icon: "trash" });
      } catch (err) {
        del.disabled = false;
        Mori.ui.problem("Couldn’t delete the meeting. Check your connection and try again.");
      }
    });
    Mori.modal.open("meetingModal", { opener });
  }

  /* ---------- Opening (auth.js adds html.boot before the first paint) ----------
     Only right after signing in, about 2.5 s in all:
       1. the welcome fades in, word by word, alone at the centre of the screen;
       2. a short hold;
       3. it glides up to its place under the nav while the links, panels and
          footer rise from the bottom of the screen into place below it.
     Data that arrives before the glide is drawn while everything below the
     welcome is still hidden; data that arrives during it waits until it ends,
     so nothing pops in or jumps. Nothing is locked: a click, tap, key or
     scroll skips to the end. */
  const BOOT = {
    wordsAt: 80,   // the first word starts fading in
    wordMs: 620,   // each word's fade
    wordSpan: 300, // the last word starts at most this long after the first
    glideAt: 1050, // every word has arrived: the glide starts
    glideMs: 1350, // the welcome's glide
    riseMs: 1250,  // each panel's rise
    riseGap: 60,   // panels set off one after another
  };
  let gliding = false;
  let heldRender = false;
  /** Redraw, unless the opening is mid-glide: then once it has finished. */
  function requestRender() {
    if (gliding) { heldRender = true; return; }
    render();
  }

  function openingRitual() {
    const root = document.documentElement;
    if (!root.classList.contains("boot")) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    splitWords(hello);
    const words = $$(".word", hello);
    const gap = words.length > 1 ? Math.min(90, BOOT.wordSpan / (words.length - 1)) : 0;
    words.forEach((w, i) => {
      w.style.animationDuration = BOOT.wordMs + "ms";
      w.style.animationDelay = Math.round(BOOT.wordsAt + i * gap) + "ms";
    });
    // Alone at the centre of the screen, and kept there until the glide: the nav is
    // measured again once the font has loaded, which moves the page under it.
    let dy = 0;
    const centre = () => {
      const b = hello.getBoundingClientRect();
      dy = Math.round(window.innerHeight / 2 - (b.top - dy + b.height / 2));
      hello.style.translate = `0 ${dy}px`;
    };
    centre();
    hello.classList.add("is-placed");
    let pin = 0;
    const keepCentred = () => { centre(); pin = requestAnimationFrame(keepCentred); };
    pin = requestAnimationFrame(keepCentred);

    const anims = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cancelAnimationFrame(pin);
      anims.forEach((a) => { try { a.finish(); } catch (e) { /* already done */ } });
      hello.style.translate = "";
      hello.classList.add("is-shown"); // skipped early: every word at once
      anims.forEach((a) => a.cancel());
      root.classList.remove("boot");
      hello.classList.remove("is-placed");
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => window.removeEventListener(t, finish, true));
      gliding = false;
      if (heldRender) { heldRender = false; render(); }
    };
    const glide = () => {
      if (done) return;
      cancelAnimationFrame(pin);
      gliding = true;
      const ease = "cubic-bezier(.65,0,.35,1)";
      const vh = window.innerHeight;
      // Where the welcome is now, to its place under the nav.
      anims.push(hello.animate([{ translate: `0 ${dy}px` }, { translate: "0 0" }], { duration: BOOT.glideMs, easing: ease, fill: "forwards" }));
      // Everything below it, from just under the bottom of the screen (or a little lower, if it starts out of sight).
      const rising = [$("#prompt"), $("#homeLinks")].concat($$("#homeGrid > section"), [$(".footer")]).filter(Boolean);
      rising.forEach((el, i) => {
        const top = el.getBoundingClientRect().top;
        const from = top < vh ? Math.round(vh - top + 24) : 140;
        const delay = 40 + Math.min(i, 5) * BOOT.riseGap;
        anims.push(el.animate([{ translate: `0 ${from}px` }, { translate: "0 0" }], { duration: BOOT.riseMs, delay, easing: ease, fill: "both" }));
        anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.round(BOOT.riseMs * 0.35), delay, easing: "ease-out", fill: "both" }));
      });
      Promise.all(anims.map((a) => a.finished)).then(finish, finish);
    };
    const timer = setTimeout(glide, BOOT.glideAt);
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => window.addEventListener(t, finish, { capture: true, passive: true }));
  }

  render();
  openingRitual();
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (["network", "links", "messages", "projectsRemote", "projectsCreated", "projectOverrides", "workspace", "settings", "profile", "sprintSpots"].includes(key)) requestRender();
  });
  // Today and the launch path read each project's workspace (meetings, obligations, ticks): bring in the latest.
  if (W) S.projects().slice(0, 12).forEach((p) => W.load(p.id).catch(() => {}));
  S.sprints.refresh().catch(() => {});
  // The "now" line moves with the clock, and a new day redraws everything.
  setInterval(() => {
    const t = $("#todayPanel");
    if (gliding || (t && t.contains(document.activeElement)) || Mori.modal.isOpen()) return;
    render(); // a new day: everything
    refreshToday();
  }, 60000);

  /* Click + keyboard */
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add-meeting]");
    if (add) { openMeeting(null, add); return; }
    const meet = e.target.closest("[data-meeting]");
    if (meet) { openMeeting(meet.dataset.meeting, meet); return; }
    if (e.target.closest("a, button, input, label")) return; // a link inside a row goes where it says
    const row = e.target.closest(".cp-row[data-project]");
    if (row) { location.href = "project.html?id=" + encodeURIComponent(row.dataset.project); return; }
  });
  document.addEventListener("change", (e) => {
    const box = e.target.closest("[data-today-task]");
    if (!box) return;
    const r = S.toggleTask(box.dataset.todayTask, box.dataset.task);
    if (r && r.saved) r.saved.catch(() => Mori.ui.problem("Couldn’t save that tick. Check your connection and try again."));
  });
})();
