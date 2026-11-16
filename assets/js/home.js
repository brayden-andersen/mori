/* ==========================================================================
   Mori: Sandbox — homepage
   --------------------------------------------------------------------------
   Two homepages, picked by what the member has done:
   • New or empty account: the first step for their situation (from
     sign-up), "Complete your profile", the next step on their launch path,
     upcoming sprints and people to meet.
   • An account with activity: continue where you left off (the pinned or
     latest project and its launch-path step), what needs attention
     (requests, unread messages, overdue tasks), upcoming sprints, and the
     profile nudge while it's incomplete.
   Projects and the MORI Network are small links under the greeting. Every
   panel that has nothing to show says how to start.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, ago, splitWords, avatar } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const W = Mori.workspace;

  const emptyState = (ic, title, sub, action, kind = "none") =>
    `<div class="empty home-empty empty--${kind}"><span class="empty-ico">${icon(ic)}</span><div>${title}</div><div class="meta">${sub}</div>${action || ""}</div>`;
  const panel = (id, title, link, body, extra = "") =>
    `<section class="panel ${extra}" id="${id}" aria-labelledby="${id}Title" data-reveal>
      <div class="panel-head"><h3 id="${id}Title">${title}</h3>${link ? `<a class="panel-link" href="${link[0]}">${link[1]} <span class="go">${icon("arrowRight")}</span></a>` : ""}</div>
      ${body}
    </section>`;
  const dayLabel = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
  const inDays = (n) => { const d = new Date(Date.now() + n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const todayISO = () => inDays(0);

  /* ---------- Greeting ---------- */
  const s = S.session();
  const hello = $("#hello");
  const birthday = S.isBirthday(); // from the date of birth given at sign-up, if any
  hello.innerHTML = `${birthday ? "Happy birthday" : s.isNew ? "Welcome" : "Welcome back"}, <span id="username">${esc(s.givenName || s.name)}</span>`;
  if (birthday) document.body.classList.add("is-birthday");
  if (s.isNew) Mori.auth.updateSession({ isNew: false });

  /* ---------- What the member has done ---------- */
  const hasActivity = () => S.projects().length > 0 || S.network.connections().length > 0 || S.chat.threads().length > 0;
  /** The project to continue: pinned first, else the most recently touched one you're on. */
  const focusProject = () => S.pinnedProjects()[0] || S.projects().slice().sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0] || null;

  /* ---------- The launch path: the next unticked step of a project ---------- */
  function launchNext(p) {
    const done = (p && W ? W.get(p.id).launch.done : {}) || {};
    let total = 0, ticked = 0, next = null;
    D.launchPath.stages.forEach((st) => st.items.forEach((text, i) => {
      total++;
      if (done[`${st.id}.${i}`]) ticked++;
      else if (!next) next = { stage: st, text, index: i };
    }));
    return { total, ticked, next, pct: total ? Math.round((ticked / total) * 100) : 0 };
  }

  /* ---------- Panels ---------- */
  function linksHTML() {
    const n = S.network.incoming().length + S.chat.unreadCount();
    return `
      <a class="home-link" href="projects.html">${icon("projects")} Projects</a>
      <a class="home-link" href="network.html">${icon("network")} MORI Network${n ? `<span class="home-link-badge">${n}</span>` : ""}</a>
      <a class="home-link" href="subscription.html">${icon("card")} Plans</a>`;
  }

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
    return panel("startPanel", "Start here", null, `
      <div class="start-grid">
        <a class="card spotlight start-main" href="${first.href}">
          <span class="start-ico">${icon(first.icon)}</span>
          <h4>${esc(first.title)}</h4>
          <p class="meta">${esc(first.body)}</p>
          <span class="btn btn--ink btn--sm">${esc(first.cta)} ${icon("arrowRight")}</span>
        </a>
        <div class="start-rest">${rest.map((o) => `<a class="card spotlight start-alt" href="${o.href}"><span class="start-ico start-ico--sm">${icon(o.icon)}</span><div><b>${esc(o.title)}</b><span class="meta">${esc(o.cta)}</span></div></a>`).join("")}</div>
      </div>`);
  }

  function profilePanel(compact) {
    const c = S.profileCompleteness();
    if (c.pct >= 100) return "";
    const next = c.missing.slice(0, compact ? 2 : 3).join(", ");
    return panel("profilePanel", "Complete your profile", ["onboarding.html?edit=1", "Add details"], `
      <div class="nudge">
        <div class="nudge-bar" role="img" aria-label="Profile ${c.pct}% complete"><i style="width:${c.pct}%"></i></div>
        <p class="meta">${c.pct}% complete. Founders and specialists reply more to full profiles. Next: ${esc(next)}.</p>
      </div>`, compact ? "panel--compact" : "");
  }

  function launchPanel(p) {
    if (!p) {
      return panel("launchPanel", "Your launch path", null,
        emptyState("ladder", "Declare a project to get its launch path", "What Indonesia asks of your business, stage by stage: team agreements, a legal structure, the NIB, licences and tax, with templates and vetted partners for each.", `<a class="btn" href="projects.html?new=1">${icon("plus")} Declare a project</a>`));
    }
    const l = launchNext(p);
    const body = l.next
      ? `<a class="pin spotlight launch-next" href="project.html?id=${encodeURIComponent(p.id)}#launch">
          <div class="pin-left">
            <span class="meta">${esc(p.name)} · ${esc(l.next.stage.title)}${l.next.stage.legal ? ` · <span class="launch-guide" title="${esc(D.launchPath.disclaimer)}">guidance, not legal advice</span>` : ""}</span>
            <h4>${esc(l.next.text)}</h4>
            <div class="caption">${l.ticked} of ${l.total} steps done · rung ${l.next.stage.rung} of the ladder</div>
          </div>
          <div class="nudge-bar nudge-bar--tall" role="img" aria-label="Launch path ${l.pct}% done"><i style="width:${l.pct}%"></i></div>
        </a>`
      : emptyState("check", "Launch path complete", `${esc(p.name)} has ticked every step. Keep the obligations up to date in the compliance tracker.`, `<a class="btn" href="project.html?id=${encodeURIComponent(p.id)}#launch">Open the launch path</a>`);
    return panel("launchPanel", "Next step on your launch path", [`project.html?id=${encodeURIComponent(p.id)}#launch`, "Open the launch path"], body);
  }

  function sprintsPanel() {
    const list = D.sprints.slice().sort((a, b) => a.startsIn - b.startsIn).filter((x) => x.startsIn >= 0).slice(0, 3);
    const lobby = (id) => (D.sprintLobbies.find((l) => l.id === id) || {}).name || "";
    return panel("sprintsPanel", "Upcoming sprints", null, `
      <p class="meta sprints-note">Two-week online sprints by niche. The first ones haven’t run yet; sprints your teammates confirm go on your work record.</p>
      <ul class="sprint-list">${list.map((x) => `<li><span class="sprint-when">${esc(dayLabel(inDays(x.startsIn)))}</span><div><b>${esc(x.title)}</b><span class="meta">${esc(lobby(x.lobby))} · teams of ${esc(x.teamSize)}</span></div></li>`).join("")}</ul>`);
  }

  function peoplePanel() {
    if (!S.network.available()) {
      return panel("peoplePanel", "People to meet", null, emptyState("network", "Members need a Google sign-in", "Demo accounts stay on this device, so there’s no one to meet here. The guest demo on the landing page has sample members.", "", "unbuilt"));
    }
    const mine = new Set(S.network.connections().map((m) => m.id));
    const people = S.network.members().filter((m) => !mine.has(m.id) && !m.invisible && S.network.status(m.id) === "none").slice(0, 3);
    if (!people.length) {
      return panel("peoplePanel", "People to meet", ["network.html#explore", "Discover"], emptyState("userPlus", "You’re one of the first members", "Founders and specialists appear here as they finish signing up.", `<a class="btn" href="network.html#explore">${icon("compass")} Open Discover</a>`));
    }
    return panel("peoplePanel", "People to meet", ["network.html#explore", "Discover"], `
      <div class="people-row">${people.map((m) => `
        <a class="card spotlight person-mini" href="network.html#explore/${encodeURIComponent(m.id)}">
          ${avatar(m, 44)}
          <div><b>${esc(m.name)}${m.sample ? Mori.ui.sampleTag() : ""}</b><span class="meta">${esc(m.specialty || (D.roles[m.role] ? D.roles[m.role].label : ""))}${m.region ? ` · ${esc(m.region)}` : ""}</span>${m.headline ? `<span class="meta person-mini-line">${esc(m.headline)}</span>` : ""}</div>
        </a>`).join("")}</div>`);
  }

  function continuePanel(p) {
    if (!p) {
      return panel("continuePanel", "Continue where you left off", ["projects.html", "All projects"],
        emptyState("projects", "No projects yet", "Declare your first project to track its launch path and milestones here.", `<a class="btn btn--ink" href="projects.html?new=1">${icon("plus")} Declare a project</a>`));
    }
    const l = launchNext(p);
    const tag = p.tags && p.tags.length ? p.tags[0] : "Idea";
    return panel("continuePanel", "Continue where you left off", ["projects.html", "All projects"], `
      <article class="pin spotlight continue-pin" tabindex="0" role="button" data-project="${esc(p.id)}" aria-label="Open ${esc(p.name)}">
        <div class="pin-left">
          <h4>${esc(p.name)}${p.sample ? Mori.ui.sampleTag("A sample project for the demo") : ""}</h4>
          <div class="chips"><span class="chip">${esc(tag)}</span>${p.pinned ? `<span class="chip chip--gray">${icon("pin")} Pinned</span>` : ""}</div>
          <div class="caption">${esc(p.focus)}</div>
          ${l.next ? `<p class="meta continue-next">${icon("ladder")} Next on the launch path: <b>${esc(l.next.text)}</b> <span class="meta">(${esc(l.next.stage.title)})</span></p>` : ""}
        </div>
        <div class="pin-separator" aria-hidden="true"></div>
        <div class="progress-wrapper" role="img" aria-label="Project progress ${p.overall}%" title="${p.overall}%">
          <div class="progress-circle" data-percent="${p.overall}"><div class="progress-inner" aria-hidden="true"></div><div class="progress-label">0%</div></div>
        </div>
      </article>`);
  }

  function attentionPanel(onlyIfAny) {
    const requests = S.network.incoming();
    const threads = S.chat.threads().filter((t) => t.unread > 0);
    const today = todayISO();
    const overdue = [];
    S.projects().forEach((p) => p.tasks.forEach((t) => { if (!t.done && t.due && t.due < today) overdue.push({ p, t }); }));
    const rows = [];
    if (requests.length) rows.push(`<a class="attn-row" href="network.html#requests"><span class="attn-ico">${icon("inbox")}</span><div><b>${requests.length} connection request${requests.length === 1 ? "" : "s"}</b><span class="meta">${esc(requests.slice(0, 2).map((r) => r.person.name).join(", "))}${requests.length > 2 ? ` and ${requests.length - 2} more` : ""}</span></div><span class="go">${icon("arrowRight")}</span></a>`);
    threads.slice(0, 3).forEach((t) => rows.push(`<a class="attn-row" href="network.html#messages/${encodeURIComponent(t.id)}"><span class="attn-ico">${icon("message")}</span><div><b>${esc(t.person.name)}</b><span class="meta">${esc(t.last.body.length > 80 ? t.last.body.slice(0, 79) + "…" : t.last.body)} · ${esc(ago(t.at))}</span></div><span class="go">${icon("arrowRight")}</span></a>`));
    if (overdue.length) rows.push(`<a class="attn-row" href="project.html?id=${encodeURIComponent(overdue[0].p.id)}#tasks"><span class="attn-ico is-late">${icon("clock")}</span><div><b>${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}</b><span class="meta">${esc(overdue[0].t.text)}${overdue.length > 1 ? ` and ${overdue.length - 1} more` : ""} · ${esc(overdue[0].p.name)}</span></div><span class="go">${icon("arrowRight")}</span></a>`);
    if (onlyIfAny && !rows.length) return ""; // a new account gets it only when something is waiting
    const body = rows.length ? `<div class="attn-list">${rows.join("")}</div>` : emptyState("check", "You’re all caught up", "No requests waiting, nothing unread and nothing overdue.", `<a class="btn" href="network.html#explore">${icon("compass")} Meet more members</a>`);
    return panel("attentionPanel", "Needs your attention", ["network.html#messages", "Open messages"], body);
  }

  /* ---------- Render ---------- */
  const grid = $("#homeGrid");
  let lastKey = "";
  function render() {
    const active = hasActivity();
    const p = focusProject();
    const l = p ? launchNext(p) : null;
    const c = S.profileCompleteness();
    const key = JSON.stringify([active, p && [p.id, p.name, p.focus, p.overall, p.pinned, p.updatedAt], l && [l.ticked, l.next && l.next.text], c.pct, S.settings().situation,
      S.network.incoming().map((r) => r.link.id), S.chat.threads().map((t) => [t.id, t.unread, t.last && t.last.id]), S.network.members().length, S.network.connections().length,
      S.projects().map((x) => x.tasks.filter((t) => !t.done && t.due && t.due < todayISO()).length)]);
    if (key === lastKey) return;
    lastKey = key;
    $("#prompt").textContent = active ? "Pick up where you left off." : "Let’s get you started.";
    $("#homeLinks").innerHTML = linksHTML();
    grid.innerHTML = active
      ? continuePanel(p) + attentionPanel() + sprintsPanel() + profilePanel(true)
      : attentionPanel(true) + startPanel() + profilePanel(false) + launchPanel(p) + sprintsPanel() + peoplePanel();
    grid.classList.toggle("is-active", active);
    Mori.motion.refresh(grid);
  }

  /* ---------- Opening (auth.js adds html.boot before the first paint) ----------
     Only right after signing in: the welcome fades in, centred, then glides up
     under the nav while the links and panels rise into place, about 0.6 s in
     all. Nothing is locked: a click, key or scroll skips to the end. */
  function openingRitual() {
    const root = document.documentElement;
    if (!root.classList.contains("boot")) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    splitWords(hello);
    const vh = window.innerHeight;
    const box = hello.getBoundingClientRect();
    const dy = Math.round(vh / 2 - (box.top + box.height / 2));
    hello.style.translate = `0 ${dy}px`;
    hello.classList.add("is-placed");
    const rising = [$("#prompt"), $("#homeLinks")].concat($$("#homeGrid > section")).filter(Boolean);
    const anims = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      anims.forEach((a) => { try { a.finish(); } catch (e) { /* already done */ } });
      hello.style.translate = "";
      anims.forEach((a) => a.cancel());
      root.classList.remove("boot");
      hello.classList.remove("is-placed");
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => window.removeEventListener(t, finish, true));
    };
    const glide = () => {
      const ease = "cubic-bezier(.65,0,.35,1)";
      anims.push(hello.animate([{ translate: `0 ${dy}px` }, { translate: "0 0" }], { duration: 300, easing: ease, fill: "forwards" }));
      rising.forEach((el, i) => {
        const top = el.getBoundingClientRect().top;
        const from = Math.min(Math.max(60, vh - top + 20), 320);
        const k = Math.min(i, 4);
        anims.push(el.animate([{ translate: `0 ${from}px` }, { translate: "0 0" }], { duration: 280 + k * 10, delay: 20 + k * 15, easing: ease, fill: "both" }));
        anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 20 + k * 15, easing: "ease-out", fill: "both" }));
      });
      Promise.all(anims.map((a) => a.finished)).then(finish, finish);
    };
    const timer = setTimeout(glide, 120); // after the welcome has faded in
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => window.addEventListener(t, finish, { capture: true, passive: true }));
  }

  render();
  openingRitual();
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (["network", "links", "messages", "projectsRemote", "projectsCreated", "projectOverrides", "workspace", "settings", "profile"].includes(key)) render();
  });
  // The ring and the launch path read the project's workspace: bring in the latest.
  const now = focusProject();
  if (now && W) W.load(now.id).catch(() => {});

  /* Click + keyboard */
  document.addEventListener("click", (e) => {
    const pin = e.target.closest(".pin[data-project]");
    if (pin) { location.href = "project.html?id=" + encodeURIComponent(pin.dataset.project); return; }
  });
})();
