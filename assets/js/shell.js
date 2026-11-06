/* ==========================================================================
   Mori: Sandbox — app shell
   --------------------------------------------------------------------------
   Renders the shared nav and footer into [data-shell="nav"] / [data-shell="footer"]
   placeholders, keeps the nav badges in sync, and owns the three account
   modals: Profile, Settings and Notifications.
   Any element with data-modal="profile|settings|notifications" opens a modal,
   data-soon="Label" shows a "coming soon" toast, data-action="signout" signs out.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, brandStar, googleG, avatar, ago, toast, soon, createModal, seg } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const page = document.body.dataset.page || "";

  /* ---------- Nav ---------- */
  function navHTML() {
    const s = S.session();
    const pinned = S.pinnedProjects();
    const sub = s.email || (s.provider === "demo" ? "Demo account" : "");
    return `
    <nav class="nav app-nav" id="topNav" aria-label="Main">
      <div class="nav-inner">
        <a href="home.html" class="brand" aria-label="Mori: Sandbox — go to your homepage">
          ${brandStar()}
          <div class="brand-name">Mori: Sandbox</div>
        </a>
        <div class="menu" id="mainMenu">
          <span class="menu-glider" aria-hidden="true"></span>
          <div class="item">
            <a class="nav-btn" href="home.html" data-nav="home">${icon("home", "ico nav-ico")}<span class="nav-label">Home</span></a>
          </div>
          <div class="item" id="projectsItem">
            <a class="nav-btn" href="projects.html" data-nav="projects" aria-haspopup="true">${icon("projects", "ico nav-ico")}<span class="nav-label">Projects</span></a>
            <div class="dropdown" role="menu" aria-label="Projects">
              <div class="drop-label">Pinned</div>
              ${pinned.map((p) => `<a class="drop-link" role="menuitem" href="projects.html?open=${esc(p.id)}">${esc(p.name)}</a>`).join("")}
              <div class="drop-sep" role="separator"></div>
              <a class="drop-link" role="menuitem" href="projects.html">All projects</a>
              <a class="drop-link" role="menuitem" href="#" data-soon="Project settings">Project Settings (new)</a>
            </div>
          </div>
          <div class="item">
            <a class="nav-btn" href="network.html" data-nav="network" aria-haspopup="true">${icon("network", "ico nav-ico")}<span class="nav-label">Network</span></a>
            <div class="dropdown" role="menu" aria-label="Network">
              <a class="drop-link" role="menuitem" href="network.html#explore">${icon("compass")} Explore</a>
              <a class="drop-link" role="menuitem" href="network.html#requests">${icon("inbox")} Requests <span class="drop-badge" data-badge="requests" hidden></span></a>
              <a class="drop-link" role="menuitem" href="network.html#messages">${icon("message")} Messages <span class="drop-badge" data-badge="messages" hidden></span></a>
            </div>
          </div>
          <div class="item account">
            <button class="nav-btn account-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
              <span class="nav-label acct-label">Account</span>
              <span class="pfp-wrap">${avatar(s, 24)}<span class="pfp-dot" hidden></span></span>
            </button>
            <div class="dropdown" role="menu" aria-label="Account">
              <div class="drop-head">${avatar(s, 36)}<div><b>${esc(s.name)}</b><span>${esc(sub)}</span></div></div>
              <div class="drop-sep" role="separator"></div>
              <a class="drop-link" role="menuitem" href="#" data-modal="profile">${icon("user")} Profile</a>
              <a class="drop-link" role="menuitem" href="#" data-modal="settings">${icon("sliders")} Settings</a>
              <a class="drop-link" role="menuitem" href="#" data-modal="notifications">${icon("bell")} Notifications <span class="drop-badge" data-badge="notifications" hidden></span></a>
              <a class="drop-link" role="menuitem" href="#" data-soon="Subscription">${icon("card")} Subscription</a>
              <div class="drop-sep" role="separator"></div>
              <a class="drop-link" role="menuitem" href="#" data-action="signout">${icon("logout")} Sign out</a>
            </div>
          </div>
        </div>
      </div>
    </nav>`;
  }

  function closeMenus() {
    $$(".item.is-open").forEach((it) => {
      it.classList.remove("is-open");
      const t = $(".account-toggle", it);
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }

  function wireGlider(nav) {
    const menu = $("#mainMenu", nav);
    const glider = $(".menu-glider", menu);
    const buttons = $$(".nav-btn", menu);
    const active = buttons.find((b) => b.classList.contains("is-active"));
    const move = (b) => {
      if (!b) { glider.style.opacity = "0"; return; }
      const mr = menu.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      glider.style.width = br.width + "px";
      glider.style.height = br.height + "px";
      glider.style.transform = `translate(${br.left - mr.left}px, ${br.top - mr.top}px)`;
      glider.style.opacity = "1";
    };
    const snap = () => {
      glider.style.transition = "none";
      move(active);
      void glider.offsetWidth;
      glider.style.transition = "";
    };
    buttons.forEach((b) => {
      b.addEventListener("mouseenter", () => move(b));
      b.addEventListener("focus", () => move(b));
    });
    menu.addEventListener("mouseleave", () => move(active));
    menu.addEventListener("focusout", (e) => { if (!menu.contains(e.relatedTarget)) move(active); });
    window.addEventListener("resize", snap);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(snap);
    snap();
  }

  function mountNav() {
    const slot = $('[data-shell="nav"]') || $("#topNav.app-nav");
    if (!slot) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = navHTML().trim();
    const nav = tpl.content.firstElementChild;
    slot.replaceWith(nav);

    const current = $(`[data-nav="${page}"]`, nav);
    if (current) { current.classList.add("is-active"); current.setAttribute("aria-current", "page"); }
    $$(".dropdown", nav).forEach((d) => Array.from(d.children).forEach((c, i) => c.style.setProperty("--i", i)));

    const acct = $(".item.account", nav);
    const toggle = $(".account-toggle", acct);
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !acct.classList.contains("is-open");
      closeMenus();
      acct.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });

    wireGlider(nav);
    updateBadges();
    Mori.ui.measureNav();
  }

  function setBadge(key, n) {
    $$(`[data-badge="${key}"]`).forEach((b) => {
      b.textContent = n > 9 ? "9+" : String(n);
      b.hidden = !n;
    });
  }
  function updateBadges() {
    if (!$("#topNav.app-nav")) return;
    const n = S.unreadNotifications();
    setBadge("notifications", n);
    setBadge("requests", S.network.incoming().length);
    setBadge("messages", S.threads.unreadCount());
    const dot = $(".pfp-dot");
    if (dot) dot.hidden = n === 0;
  }

  /* ---------- Footer (same columns as the drafts) ---------- */
  function mountFooter() {
    const slot = $('[data-shell="footer"]');
    if (!slot) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = `
    <footer class="footer" role="contentinfo">
      <div class="footer-inner">
        <div class="footer-columns" aria-label="Footer navigation">
          <nav class="footer-col" aria-labelledby="assistTitle">
            <h4 id="assistTitle">Assistance</h4>
            <ul>
              <li><a href="#" data-soon="Sandbox Guide">Sandbox Guide</a></li>
              <li><a href="#" data-soon="About Sandbox">About Sandbox</a></li>
              <li><a href="#" data-soon="Contact Us">Contact Us</a></li>
              <li><a href="#" data-soon="Terms &amp; Policy">Terms &amp; Policy</a></li>
            </ul>
          </nav>
          <nav class="footer-col" aria-labelledby="productsTitle">
            <h4 id="productsTitle">Products</h4>
            <ul>
              <li><a href="#" data-soon="Toolkits">Toolkits</a></li>
              <li><a href="#" data-soon="Subscription Pricing">Subscription Pricing</a></li>
              <li><a href="#" data-soon="Cancellation">Cancellation</a></li>
            </ul>
          </nav>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} Mori: Sandbox · SandBox by MORI Group <span class="footer-kanji" title="Mori — forest" aria-hidden="true">森</span></div>
      </div>
    </footer>`.trim();
    slot.replaceWith(tpl.content.firstElementChild);
  }

  /* ---------- Shared bits ---------- */
  const closeBtn = (label = "Close") => `<button class="icon-btn modal-x" data-close aria-label="${label}">${icon("x")}</button>`;
  const switchHTML = (attrs, on, label) =>
    `<label class="switch"><input type="checkbox" ${attrs} ${on ? "checked" : ""}><span class="switch-track"><span class="switch-knob"></span></span>${label ? `<span class="switch-label">${label}</span>` : ""}</label>`;

  /** Rung 0–5 bar used in the profile and project views */
  function ladderBar(rung) {
    return `<div class="ladder-bar" role="img" aria-label="Rung ${rung} of 5: ${esc(D.ladder[rung].stage)}">${D.ladder
      .map((r) => `<i class="${r.rung < rung ? "on" : r.rung === rung ? "on now" : ""}" title="Rung ${r.rung} · ${esc(r.stage)}"></i>`)
      .join("")}</div>`;
  }

  /* ---------- Profile modal ---------- */
  function profileViewHTML() {
    const s = S.session();
    const p = S.profile();
    const st = S.settings();
    const owned = S.projects().filter((x) => x.owner);
    const lead = owned[0];
    const roles = (p.roles || []).filter((r) => D.roles[r]).map((r) => `<span class="chip chip--${D.roles[r].hue}">${D.roles[r].label}</span>`).join("");
    const openChip = p.open ? `<span class="chip chip--emerald"><i class="live-dot"></i>${esc(D.openTypes[p.openType] || "Open to build")}</span>` : "";
    const skills = (p.skills || []).length
      ? p.skills.map((k) => `<span class="badge badge--gray">${esc(k)}</span>`).join("")
      : `<span class="meta">Add skills so builders and founders can find you.</span>`;
    const record = !st.showRecord
      ? `<p class="meta">Your milestone record is hidden. Turn it back on in Settings → Privacy.</p>`
      : lead
        ? `<div class="pf-record"><div class="pf-record-head"><b>${esc(lead.name)}</b><span class="meta">Rung ${lead.rung} · ${esc(D.ladder[lead.rung].stage)}</span></div>${ladderBar(lead.rung)}</div>`
        : `<p class="meta">Declare a project to start your record.</p>`;

    return `
      <div class="pf-cover" aria-hidden="true"><span></span><span></span><span></span></div>
      ${closeBtn("Close profile")}
      <div class="pf-head">
        ${avatar(s, 88, { ring: p.open })}
        <button class="btn btn--sm" data-pf-edit>${icon("edit")} Edit profile</button>
      </div>
      <div class="pf-body">
        <h2 class="pf-name" id="pfTitle">${esc(s.name)}</h2>
        <p class="pf-headline">${esc(p.headline || "Add a headline")}</p>
        <p class="meta pf-meta">${icon("pin")} ${esc(p.location || "Add your city")}${s.email ? ` · ${esc(s.email)}` : ""}</p>
        <div class="chips">${roles}${openChip}</div>
        <div class="pf-stats">
          <div class="pf-stat"><b data-count="${S.network.connections().length}">0</b><span>Connections</span></div>
          <div class="pf-stat"><b data-count="${owned.length}">0</b><span>Projects</span></div>
          <div class="pf-stat"><b data-count="${p.badges || 0}">0</b><span>Sprint badges</span></div>
        </div>
        <section class="pf-sec"><h3>About</h3><p>${p.bio ? esc(p.bio) : '<span class="meta">Add a short intro so builders know what you’re working on.</span>'}</p></section>
        <section class="pf-sec"><h3>Skills</h3><div class="tags">${skills}</div></section>
        <section class="pf-sec"><h3>Milestone record</h3>${record}
          ${p.badges ? `<div class="pf-badge">${icon("award")}<div><b>Sprint badge</b><span class="meta">3 sprints · 92% would work with you again</span></div></div>` : ""}
        </section>
      </div>`;
  }

  function profileEditHTML() {
    const s = S.session();
    const p = S.profile();
    const roleChips = Object.entries(D.roles)
      .map(([k, r]) => `<button type="button" class="fchip" data-role="${k}" data-active="${(p.roles || []).includes(k)}">${r.label}</button>`)
      .join("");
    const openOpts = Object.entries(D.openTypes).map(([k, v]) => `<option value="${k}" ${p.openType === k ? "selected" : ""}>${esc(v)}</option>`).join("");
    return `
      <div class="modal-head"><h2 id="pfTitle">Edit profile</h2>${closeBtn()}</div>
      <form class="modal-body form-grid" id="pfForm" novalidate>
        <label class="field"><span>Name</span><input class="input" name="name" value="${esc(s.name)}" maxlength="60" required autofocus></label>
        <label class="field"><span>Location</span><input class="input" name="location" value="${esc(p.location)}" maxlength="60"></label>
        <label class="field field--full"><span>Headline</span><input class="input" name="headline" value="${esc(p.headline)}" maxlength="100"></label>
        <label class="field field--full"><span>About</span><textarea class="textarea" name="bio" maxlength="400">${esc(p.bio)}</textarea></label>
        <div class="field field--full"><span>Roles</span><div class="filters" data-roles>${roleChips}</div></div>
        <label class="field field--full"><span>Skills <em class="hint">comma separated</em></span><input class="input" name="skills" value="${esc((p.skills || []).join(", "))}"></label>
        <div class="field field--full field--inline">
          ${switchHTML('name="open"', p.open, "Show that I’m open to build")}
          <select class="select" name="openType" aria-label="What are you open to?">${openOpts}</select>
        </div>
      </form>
      <div class="modal-foot"><button class="btn" type="button" data-pf-cancel>Cancel</button><button class="btn btn--ink" type="button" data-pf-save>${icon("check")} Save profile</button></div>`;
  }

  function renderProfile(mode = "view") {
    const root = createModal("modal-profile", { label: "Profile", panelCls: "modal--profile" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "pfTitle");
    panel.innerHTML = mode === "edit" ? profileEditHTML() : profileViewHTML();
    panel.scrollTop = 0;
    if (mode === "edit") {
      const form = $("#pfForm", panel);
      $$("[data-role]", form).forEach((b) => b.addEventListener("click", () => { b.dataset.active = b.dataset.active === "true" ? "false" : "true"; }));
      $("[data-pf-cancel]", panel).addEventListener("click", () => renderProfile("view"));
      const save = () => {
        const f = new FormData(form);
        const name = String(f.get("name") || "").trim();
        if (!name) { form.elements.name.focus(); toast("Please add your name", { icon: "edit" }); return; }
        const roles = $$('[data-role][data-active="true"]', form).map((b) => b.dataset.role);
        S.saveProfile({
          headline: String(f.get("headline") || "").trim(),
          location: String(f.get("location") || "").trim(),
          bio: String(f.get("bio") || "").trim(),
          roles: roles.length ? roles : ["founder"],
          skills: String(f.get("skills") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12),
          open: !!form.elements.open.checked,
          openType: String(f.get("openType") || "cofound"),
        });
        Mori.auth.updateSession({ name, givenName: name.split(/\s+/)[0] });
        mountNav();
        renderProfile("view");
        toast("Profile updated", { icon: "check" });
        document.dispatchEvent(new CustomEvent("mori:change", { detail: { key: "session" } }));
      };
      $("[data-pf-save]", panel).addEventListener("click", save);
      form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
      setTimeout(() => form.elements.name && form.elements.name.focus(), 80);
    } else {
      $("[data-pf-edit]", panel).addEventListener("click", () => renderProfile("edit"));
      Mori.motion.refresh(panel);
    }
    return root;
  }

  /* ---------- Settings modal ---------- */
  const SETTINGS_TABS = [
    { id: "account", label: "Account", icon: "user" },
    { id: "preferences", label: "Preferences", icon: "sliders" },
    { id: "notifications", label: "Notifications", icon: "bell" },
    { id: "privacy", label: "Privacy", icon: "shield" },
  ];

  function settingsHTML(tab) {
    const s = S.session();
    const st = S.settings();
    const p = S.profile();
    const row = (title, desc, control, cls = "") =>
      `<div class="st-row ${cls}"><div class="st-copy"><h4>${title}</h4><p>${desc}</p></div><div class="st-control">${control}</div></div>`;
    const notifyRow = (key, title, desc) => row(title, desc, switchHTML(`data-notify="${key}" aria-label="${esc(title)}"`, st.notify[key]));
    const pane = (id, html) => `<section class="st-pane" data-pane="${id}" role="tabpanel" aria-label="${id}" ${id === tab ? "" : "hidden"}>${html}</section>`;

    return `
      <div class="modal-head">
        <h2 id="stTitle">Settings</h2>
        <span class="saved-pill" aria-live="polite">${icon("check")} Saved</span>
        ${closeBtn("Close settings")}
      </div>
      <div class="st">
        <div class="st-nav" role="tablist" aria-label="Settings sections">
          ${SETTINGS_TABS.map((t) => `<button class="st-tab ${t.id === tab ? "is-on" : ""}" role="tab" aria-selected="${t.id === tab}" data-tab="${t.id}">${icon(t.icon)}<span>${t.label}</span></button>`).join("")}
        </div>
        <div class="st-panes">
          ${pane("account", `
            <div class="st-card">
              ${avatar(s, 48)}
              <div class="st-card-copy"><b>${esc(s.name)}</b><span class="meta">${esc(s.email || "No email on this demo account")}</span></div>
              <span class="provider">${s.provider === "google" ? googleG() + "Google" : icon("sparkle") + "Demo"}</span>
            </div>
            ${row("Sign-in method", s.provider === "google" ? "You sign in with your Google account." : "Demo mode. Add a Google Client ID in <code>assets/js/config.js</code> to turn on Google sign-in.", "")}
            ${row("Sign out", "Sign out of Sandbox on this browser.", `<button class="btn btn--sm" data-action="signout">${icon("logout")} Sign out</button>`)}
            ${row("Reset demo data", "Clears the projects, messages and settings you changed in this concept.", `<button class="btn btn--sm btn--danger" data-reset>${icon("refresh")} Reset</button>`, "st-row--danger")}
          `)}
          ${pane("preferences", `
            ${row("Motion effects", "Animations, tilt and parallax across Sandbox. System follows your device setting.",
              `<div class="seg" data-setting="motion" data-value="${st.motion}"><button data-value="system">System</button><button data-value="full">Full</button><button data-value="reduced">Reduced</button></div>`)}
            ${row("Animated background", "The drifting blue and orange aura behind every page.", switchHTML('data-setting="aura" aria-label="Animated background"', st.aura !== false))}
            ${row("Start page", "Where Sandbox opens after you sign in.",
              `<select class="select" data-setting="startPage" aria-label="Start page">${[["home.html", "Home"], ["projects.html", "Projects"], ["network.html", "Network"]]
                .map(([v, l]) => `<option value="${v}" ${st.startPage === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
          `)}
          ${pane("notifications", `
            ${notifyRow("messages", "Messages and mentions", "When someone messages you or mentions you in notes.")}
            ${notifyRow("requests", "Connection requests", "When founders, builders or mentors want to connect.")}
            ${notifyRow("projects", "Projects and milestones", "Sprint progress and rungs reached on your projects.")}
            ${notifyRow("announcements", "Sprints, rooms and insights", "Sprint lobbies, room events, badges and new insights.")}
            ${notifyRow("digest", "Weekly email digest", "A Sunday summary by email. Arrives with the Sandbox backend.")}
          `)}
          ${pane("privacy", `
            ${row("Profile visibility", "Who can see your full profile.",
              `<div class="seg" data-setting="visibility" data-value="${st.visibility}"><button data-value="everyone">Everyone</button><button data-value="connections">Connections</button></div>`)}
            ${row("Show my milestone record", "Builders and backers see the rungs you’ve reached. You can hide the whole record, but not single rungs.", switchHTML('data-setting="showRecord" aria-label="Show my milestone record"', st.showRecord))}
            ${row("Show “Open to build”", "Adds the open-to-build ring and tag to your profile.", switchHTML('data-profile="open" aria-label="Show open to build"', p.open))}
          `)}
        </div>
      </div>`;
  }

  function renderSettings(tab = "account") {
    const root = createModal("modal-settings", { label: "Settings", panelCls: "modal--settings" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "stTitle");
    panel.innerHTML = settingsHTML(tab);

    const pill = $(".saved-pill", panel);
    let pillTimer = 0;
    const saved = () => {
      pill.classList.remove("is-on");
      void pill.offsetWidth;
      pill.classList.add("is-on");
      clearTimeout(pillTimer);
      pillTimer = setTimeout(() => pill.classList.remove("is-on"), 1600);
    };
    const segs = [];
    const showTab = (id) => {
      $$(".st-tab", panel).forEach((t) => { const on = t.dataset.tab === id; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", String(on)); });
      $$(".st-pane", panel).forEach((p) => { p.hidden = p.dataset.pane !== id; if (!p.hidden) Mori.motion.enter(p, ".st-row, .st-card"); });
      segs.forEach((sg) => sg.refresh());
    };
    $$(".st-tab", panel).forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

    $$(".seg[data-setting]", panel).forEach((el) => segs.push(seg(el, (v) => { S.saveSettings({ [el.dataset.setting]: v }); saved(); })));
    $$('input[data-setting]', panel).forEach((el) => el.addEventListener("change", () => { S.saveSettings({ [el.dataset.setting]: el.checked }); saved(); }));
    $$('select[data-setting]', panel).forEach((el) => el.addEventListener("change", () => { S.saveSettings({ [el.dataset.setting]: el.value }); saved(); }));
    $$("input[data-notify]", panel).forEach((el) => el.addEventListener("change", () => { S.saveSettings({ notify: { [el.dataset.notify]: el.checked } }); saved(); updateBadges(); }));
    $$("input[data-profile]", panel).forEach((el) => el.addEventListener("change", () => { S.saveProfile({ [el.dataset.profile]: el.checked }); saved(); }));

    const reset = $("[data-reset]", panel);
    let armed = false;
    reset.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        reset.innerHTML = `${icon("refresh")} Tap again to confirm`;
        setTimeout(() => { armed = false; reset.innerHTML = `${icon("refresh")} Reset`; }, 3500);
        return;
      }
      S.reset();
      toast("Demo data reset", { icon: "refresh" });
      setTimeout(() => location.reload(), 700);
    });
    showTab(tab);
    return root;
  }

  /* ---------- Notifications modal ---------- */
  const NT_STYLE = {
    request: ["userPlus", "#60a5fa", "#6366f1"],
    message: ["message", "#34d399", "#14b8a6"],
    mention: ["at", "#a78bfa", "#ec4899"],
    project: ["target", "#fb923c", "#f97316"],
    ladder:  ["ladder", "#f59e0b", "#f97316"],
    sprint:  ["zap", "#38bdf8", "#3b82f6"],
    insight: ["bulb", "#facc15", "#f59e0b"],
    badge:   ["award", "#f472b6", "#f97316"],
  };
  let ntFilter = "all";

  function notificationsHTML() {
    const list = S.notifications();
    const unread = list.filter((n) => n.unread).length;
    const items = ntFilter === "unread" ? list.filter((n) => n.unread) : list;
    const item = (n, i) => {
      const [ic, c1, c2] = NT_STYLE[n.type] || NT_STYLE.insight;
      return `<button class="nt ${n.unread ? "is-unread" : ""}" role="listitem" data-nt="${n.id}" style="--i:${i}">
        <span class="nt-ico" style="--c1:${c1};--c2:${c2}">${icon(ic)}</span>
        <span class="nt-main"><span class="nt-text">${n.text}</span><span class="nt-time">${ago(n.at)}</span></span>
        ${n.unread ? '<span class="nt-dot" aria-label="Unread"></span>' : ""}
      </button>`;
    };
    return `
      <div class="modal-head">
        <div><h2 id="ntTitle">Notifications</h2><p class="meta">${unread ? `${unread} unread` : "You’re all caught up"}</p></div>
        <button class="btn btn--sm btn--ghost nt-readall" data-nt-readall ${unread ? "" : "disabled"}>${icon("check")} Mark all as read</button>
        ${closeBtn("Close notifications")}
      </div>
      <div class="nt-toolbar"><div class="seg seg--sm" data-value="${ntFilter}"><button data-value="all">All</button><button data-value="unread">Unread${unread ? ` (${unread})` : ""}</button></div></div>
      <div class="nt-list" role="list">
        ${items.length ? items.map(item).join("") : `<div class="empty nt-empty"><span class="empty-ico">${icon("check")}</span><div>You’re all caught up.</div><div class="meta">New requests, messages and milestones will show up here.</div></div>`}
      </div>
      <div class="modal-foot modal-foot--start"><button class="btn btn--sm btn--ghost" data-nt-settings>${icon("sliders")} Notification settings</button></div>`;
  }

  function renderNotifications() {
    const root = createModal("modal-notifications", { label: "Notifications", panelCls: "modal--notifications" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "ntTitle");
    panel.innerHTML = notificationsHTML();
    Mori.motion.enter($(".nt-list", panel), ".nt");

    seg($(".seg", panel), (v) => { ntFilter = v; renderNotifications(); });
    $("[data-nt-readall]", panel).addEventListener("click", () => { S.markAllNotificationsRead(); renderNotifications(); toast("All caught up", { icon: "check" }); });
    $("[data-nt-settings]", panel).addEventListener("click", () => openAccountModal("settings", null, "notifications"));
    $$("[data-nt]", panel).forEach((el) =>
      el.addEventListener("click", () => {
        const n = D.notifications.find((x) => x.id === el.dataset.nt);
        if (!n) return;
        S.markNotificationRead(n.id);
        if (n.action === "profile") { openAccountModal("profile"); return; }
        const url = new URL(n.link, location.href);
        if (url.pathname === location.pathname && url.search === location.search) {
          Mori.modal.close({ restoreFocus: false });
          if (location.hash !== url.hash) location.hash = url.hash;
          else window.dispatchEvent(new HashChangeEvent("hashchange"));
        } else {
          location.href = n.link;
        }
      })
    );
    return root;
  }

  /* ---------- Opening modals ---------- */
  function openAccountModal(which, opener, tab) {
    closeMenus();
    let id = "";
    if (which === "profile") { renderProfile("view"); id = "modal-profile"; }
    else if (which === "settings") { renderSettings(tab || "account"); id = "modal-settings"; }
    else if (which === "notifications") { renderNotifications(); id = "modal-notifications"; }
    if (!id) return;
    Mori.modal.open(id, { opener: opener || undefined });
    // Segmented-control gliders can only be measured once the panel is visible.
    requestAnimationFrame(() => $$(`#${id} .seg`).forEach((el) => {
      const on = el.querySelector("button.is-on");
      const g = el.querySelector(".seg-glider");
      if (on && g) { g.style.width = on.offsetWidth + "px"; g.style.transform = `translateX(${on.offsetLeft}px)`; }
    }));
  }

  function leave(url) {
    let veil = $(".page-veil");
    if (!veil) { veil = document.createElement("div"); veil.className = "page-veil"; document.body.appendChild(veil); }
    requestAnimationFrame(() => veil.classList.add("is-on"));
    setTimeout(() => { location.href = url; }, Mori.motion && Mori.motion.reduced() ? 0 : 320);
  }

  /* ---------- Global delegation ---------- */
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".item.is-open")) closeMenus();

    const m = e.target.closest("[data-modal]");
    if (m) { e.preventDefault(); openAccountModal(m.dataset.modal, m, m.dataset.tab); return; }

    const later = e.target.closest("[data-soon]");
    if (later) { e.preventDefault(); closeMenus(); soon(later.dataset.soon); return; }

    if (e.target.closest('[data-action="signout"]')) {
      e.preventDefault();
      Mori.modal.close({ restoreFocus: false });
      Mori.auth.signOut({ redirect: false });
      leave("index.html?signedout=1");
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });
  document.addEventListener("mori:change", updateBadges);
  document.addEventListener("mori:modal", (e) => { if (e.detail.open) closeMenus(); });

  mountNav();
  mountFooter();

  Mori.shell = { openModal: openAccountModal, updateBadges, mountNav, ladderBar, switchHTML, leave, closeMenus };
})();
