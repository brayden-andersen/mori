/* ==========================================================================
   Mori: Sandbox — app shell
   --------------------------------------------------------------------------
   Renders the shared nav and footer into [data-shell="nav"] / [data-shell="footer"],
   keeps nav badges in sync, prerenders linked pages for instant navigation,
   owns the account modals (Profile with photo and links, Settings,
   Notifications) and starts live updates for signed-in Google members.
     data-modal="profile|settings|notifications"  opens a modal
     data-soon="Label"                           "coming soon" toast
     data-action="signout"                       signs out
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, brandMark, googleG, avatar, ago, toast, soon, createModal, seg, placeGlider, roleChip, empty, loader } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const page = document.body.dataset.page || "";
  const section = page === "project" ? "projects" : page; // the planner lives under Projects

  /* ---------- Nav ---------- */
  function navHTML() {
    const s = S.session();
    const you = S.me();
    const sub = s.email || (s.provider === "demo" ? "Demo account" : "");
    const link = (href, label, ic) => `<a class="drop-link" role="menuitem" href="${href}">${ic ? icon(ic) + " " : ""}${label}</a>`;
    return `
    <nav class="nav app-nav" id="topNav" aria-label="Main">
      <div class="nav-inner">
        <a href="home.html" class="brand" aria-label="SandBox — go to your homepage">${brandMark()}<div class="brand-name">SandBox</div></a>
        <div class="menu" id="mainMenu">
          <span class="menu-glider" aria-hidden="true"></span>
          <div class="item"><a class="nav-btn" href="home.html" data-nav="home">${icon("home", "ico nav-ico")}<span class="nav-label">Home</span></a></div>
          <div class="item">
            <a class="nav-btn" href="projects.html" data-nav="projects" aria-haspopup="true">${icon("projects", "ico nav-ico")}<span class="nav-label">Projects</span></a>
            <div class="dropdown" role="menu" aria-label="Projects">
              <div class="drop-label">Pinned</div>
              ${S.pinnedProjects().map((p) => link(`project.html?id=${esc(p.id)}`, esc(p.name))).join("") || '<span class="drop-empty">Nothing pinned yet</span>'}
              <div class="drop-sep" role="separator"></div>
              ${link("projects.html", "All projects")}
              <a class="drop-link" role="menuitem" href="#" data-modal="settings" data-tab="projects">Project settings</a>
            </div>
          </div>
          <div class="item">
            <a class="nav-btn" href="network.html" data-nav="network" aria-haspopup="true">${icon("network", "ico nav-ico")}<span class="nav-label">Network</span><span class="nav-dot" data-nav-dot hidden></span></a>
            <div class="dropdown" role="menu" aria-label="Network">
              ${link("network.html#explore", "Discover", "compass")}
              <a class="drop-link" role="menuitem" href="network.html#requests">${icon("inbox")} Requests <span class="drop-badge" data-badge="requests" hidden></span></a>
              <a class="drop-link" role="menuitem" href="network.html#messages">${icon("message")} Messages <span class="drop-badge" data-badge="messages" hidden></span></a>
              <a class="drop-link" role="menuitem" href="#" data-connections>${icon("network")} Connections</a>
            </div>
          </div>
          <div class="item account">
            <button class="nav-btn account-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
              <span class="nav-label acct-label">Account</span>
              <span class="pfp-wrap">${avatar(you, 24)}<span class="pfp-dot" hidden></span></span>
            </button>
            <div class="dropdown" role="menu" aria-label="Account">
              <div class="drop-head">${avatar(you, 36)}<div><b>${esc(you.name)}</b><span>${esc(sub)}</span></div></div>
              <div class="drop-sep" role="separator"></div>
              <a class="drop-link" role="menuitem" href="#" data-modal="profile">${icon("user")} Profile</a>
              <a class="drop-link" role="menuitem" href="#" data-modal="settings">${icon("sliders")} Settings</a>
              <a class="drop-link" role="menuitem" href="#" data-modal="notifications">${icon("bell")} Notifications <span class="drop-badge" data-badge="notifications" hidden></span></a>
              <a class="drop-link" role="menuitem" href="subscription.html"${page === "subscription" ? ' aria-current="page"' : ""}>${icon("card")} Subscription</a>
              <div class="drop-sep" role="separator"></div>
              <a class="drop-link" role="menuitem" href="#" data-action="signout">${icon("logout")} Sign out</a>
            </div>
          </div>
          <div class="item item--theme">${Mori.ui.themeToggle()}</div>
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

  function mountNav() {
    const slot = $('[data-shell="nav"]') || $("#topNav.app-nav");
    if (!slot) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = navHTML().trim();
    const nav = tpl.content.firstElementChild;
    slot.replaceWith(nav);
    nav.classList.toggle("is-scrolled", window.scrollY > 8);

    const active = $(`[data-nav="${section}"]`, nav);
    if (active) { active.classList.add("is-active"); active.setAttribute("aria-current", "page"); }
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

    // Glass pill follows the hovered nav item and rests on the current page.
    const menu = $("#mainMenu", nav);
    const glider = $(".menu-glider", menu);
    const rest = (snap) => placeGlider(glider, active, { snap, height: true });
    $$(".nav-btn", menu).forEach((b) => {
      const move = () => placeGlider(glider, b, { height: true });
      b.addEventListener("mouseenter", move);
      b.addEventListener("focus", move);
    });
    menu.addEventListener("mouseleave", () => rest());
    menu.addEventListener("focusout", (e) => { if (!menu.contains(e.relatedTarget)) rest(); });
    rest(true);

    updateBadges();
    Mori.ui.measureNav();
  }
  window.addEventListener("resize", () => { const g = $(".menu-glider"); if (g) placeGlider(g, $(".nav-btn.is-active"), { snap: true, height: true }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { const g = $(".menu-glider"); if (g) placeGlider(g, $(".nav-btn.is-active"), { snap: true, height: true }); });

  function updateBadges() {
    if (!$("#topNav.app-nav")) return;
    const counts = { notifications: S.unreadNotifications(), requests: S.network.incoming().length, messages: S.chat.unreadCount() };
    Object.entries(counts).forEach(([key, n]) => $$(`[data-badge="${key}"]`).forEach((b) => { b.textContent = n > 9 ? "9+" : String(n); b.hidden = !n; }));
    const dot = $(".pfp-dot");
    if (dot) dot.hidden = counts.notifications === 0;
    // New messages or requests: a dot on Network, so they're noticed without opening the menu.
    const waiting = counts.requests + counts.messages;
    const net = $('.nav-btn[data-nav="network"]');
    const netDot = $("[data-nav-dot]");
    if (netDot) netDot.hidden = !waiting;
    if (net) {
      const parts = [];
      if (counts.messages) parts.push(`${counts.messages} unread conversation${counts.messages === 1 ? "" : "s"}`);
      if (counts.requests) parts.push(`${counts.requests} request${counts.requests === 1 ? "" : "s"}`);
      if (parts.length) net.setAttribute("aria-label", `Network, ${parts.join(" and ")}`);
      else net.removeAttribute("aria-label");
    }
  }

  /* ---------- Instant page changes: prerender linked app pages on hover (Chrome / Edge) ---------- */
  function speculate() {
    if (!(HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) return;
    const s = document.createElement("script");
    s.type = "speculationrules";
    s.textContent = JSON.stringify({
      prefetch: [{ source: "document", where: { selector_matches: 'a[href^="home.html"], a[href^="projects.html"], a[href^="project.html"], a[href^="network.html"], a[href^="subscription.html"]' }, eagerness: "eager" }],
      prerender: [{ source: "document", where: { selector_matches: 'a[href^="home.html"], a[href^="projects.html"], a[href^="project.html"], a[href^="network.html"], a[href^="subscription.html"]' }, eagerness: "moderate" }],
    });
    document.head.appendChild(s);
  }

  /* ---------- Footer (same columns as the drafts) ---------- */
  function mountFooter() {
    const slot = $('[data-shell="footer"]');
    if (!slot) return;
    const col = (id, title, items) =>
      `<nav class="footer-col" aria-labelledby="${id}"><h4 id="${id}">${title}</h4><ul>${items.map((t) => (Array.isArray(t) ? `<li><a href="${t[1]}"${t[2] ? " " + t[2] : ""}>${t[0]}</a></li>` : `<li><a href="#" data-soon="${t}">${t}</a></li>`)).join("")}</ul></nav>`;
    const tpl = document.createElement("template");
    tpl.innerHTML = `
    <footer class="footer" role="contentinfo">
      <div class="footer-inner">
        <div class="footer-columns" aria-label="Footer navigation">
          ${col("assistTitle", "Assistance", [["Sandbox Guide", "#", 'data-tour-start="site"'], "About Sandbox", ["Partners", "partners.html"], "Contact Us", ["Terms &amp; Policy", "legal.html"]])}
          ${col("productsTitle", "Products", ["Toolkits", ["Subscription Pricing", "subscription.html"], "Cancellation"])}
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
  const fullName = (p, s) => S.fullName(p, s);
  const LINK_TYPES = D.linkTypes;

  /** Rung 0–5 bar used in the profile and project views */
  function ladderBar(rung) {
    return `<div class="ladder-bar" role="img" aria-label="Rung ${rung} of 5: ${esc(D.ladder[rung].stage)}">${D.ladder
      .map((r) => `<i class="${r.rung < rung ? "on" : r.rung === rung ? "on now" : ""}" title="Rung ${r.rung} · ${esc(r.stage)}"></i>`)
      .join("")}</div>`;
  }

  /* ---------- Profile modal ---------- */
  // Details a member chooses to show. Years of experience is never shown: it's for sorting.
  const SHOW_LABELS = { age: "Age", region: "Region", employment: "Employment", languages: "Languages" };
  const hasDetail = (p, k) => (k === "languages" ? (p.languages || []).length > 0 : !!p[k]);
  /** Your profile as other members see it. */
  const shownAs = (p) => Object.assign({}, p, {
    age: p.show.age ? p.age : null,
    region: p.show.region ? p.region : "",
    employment: p.show.employment ? p.employment : "",
  });
  function profileViewHTML() {
    const s = S.session();
    const p = S.profile();
    const owned = S.projects().filter((x) => x.owner);
    const lead = owned[0];
    const record = !S.settings().showRecord
      ? `<p class="meta">Your work record is hidden. Turn it back on in Settings → Privacy.</p>`
      : lead
        ? `<div class="pf-record"><div class="pf-record-head"><b>${esc(lead.name)}</b><span class="meta">Rung ${lead.rung} · ${esc(D.ladder[lead.rung].stage)}</span></div>${ladderBar(lead.rung)}</div>`
        : `<p class="meta">Declare a project to start your record.</p>`;
    const seen = shownAs(p);
    const where = Mori.people.whereLine(seen).concat(s.email || []).map(esc).join(" · ");
    const hidden = Object.keys(SHOW_LABELS).filter((k) => !p.show[k] && hasDetail(p, k)).map((k) => SHOW_LABELS[k].toLowerCase());
    const docs = Mori.people.linkButtons(p) + (p.cvName ? `<button class="btn btn--sm" type="button" data-pf-cv>${icon("file")} ${esc(p.cvName)}</button>` : "");
    const google = s.provider === "google" && /^https:/.test(s.picture || "") && s.picture !== p.photo ? s.picture : "";
    const photoMenu = [
      `<button class="drop-link" type="button" role="menuitem" data-photo="upload">${icon("upload")} ${p.photo ? "Upload a new photo" : "Upload a photo"}</button>`,
      google ? `<button class="drop-link" type="button" role="menuitem" data-photo="google">${googleG()} Use my Google photo</button>` : "",
      p.photo ? `<button class="drop-link" type="button" role="menuitem" data-photo="adjust">${icon("search")} Adjust or resize</button>` : "",
      p.photo ? `<button class="drop-link" type="button" role="menuitem" data-photo="remove">${icon("user")} Use the default icon</button>` : "",
    ].join("");
    const coverMenu = [
      `<button class="drop-link" type="button" role="menuitem" data-cover="upload">${icon("upload")} ${p.cover ? "Upload a new image" : "Upload an image"}</button>`,
      p.cover ? `<button class="drop-link" type="button" role="menuitem" data-cover="adjust">${icon("search")} Adjust or resize</button>` : "",
      p.cover ? `<button class="drop-link" type="button" role="menuitem" data-cover="remove">${icon("x")} Use the default banner</button>` : "",
    ].join("");
    const coverControls = `
      <button class="pf-cover-btn" type="button" data-pf-cover aria-haspopup="menu" aria-expanded="false">${icon("camera")} ${p.cover ? "Edit banner" : "Add a banner"}</button>
      <div class="pf-photo-menu pf-cover-menu" role="menu" aria-label="Profile banner" hidden>${coverMenu}</div>
      <input type="file" accept="image/jpeg,image/png,image/webp" data-pf-cover-file hidden>`;

    return `
      ${Mori.ui.coverHTML(p.cover, coverControls)}
      ${closeBtn("Close profile")}
      <div class="pf-head">
        <div class="pf-photo">
          ${avatar(S.me(), 88, { ring: p.open })}
          <button class="icon-btn pf-photo-btn" type="button" data-pf-photo aria-haspopup="menu" aria-expanded="false" aria-label="Change profile photo">${icon("camera")}</button>
          <div class="pf-photo-menu" role="menu" aria-label="Profile photo" hidden>${photoMenu}</div>
          <input type="file" accept="image/jpeg,image/png,image/webp" data-pf-photo-file hidden>
        </div>
        <button class="btn btn--sm" data-pf-edit>${icon("edit")} Edit profile</button>
      </div>
      <div class="pf-body">
        <h2 class="pf-name" id="pfTitle">${esc(fullName(p, s))}</h2>
        <p class="pf-headline">${esc(p.headline || "Add a headline")}</p>
        <p class="meta pf-meta">${icon("pin")} ${where || "Your region is hidden"}</p>
        <div class="chips">${roleChip(p.role, p.specialty)}${p.open ? `<span class="chip chip--emerald"><i class="live-dot"></i>${esc(D.openTypes[p.openType] || "Open to build")}</span>` : ""}</div>
        ${Mori.people.factPills(seen)}
        ${hidden.length ? `<p class="meta pf-hidden">${icon("shield")} Hidden from your profile: ${esc(hidden.join(", "))}. <button class="link-btn" type="button" data-pf-edit>Change</button></p>` : ""}
        ${p.invisible ? `<p class="meta pf-hidden pf-invisible-on">${icon("shield")} You’re invisible on the MORI Network: only people who search your full name can find you, and they see just your name and join date. <button class="link-btn" type="button" data-pf-edit>Change</button></p>` : ""}
        <div class="pf-stats pf-stats--2">
          <button class="pf-stat pf-stat--link" type="button" data-connections aria-label="See your connections"><b data-count="${S.network.connections().length}">0</b><span>Connections ${icon("arrowRight")}</span></button>
          <div class="pf-stat"><b data-count="${owned.length}">0</b><span>Projects</span></div>
        </div>
        <section class="pf-sec"><h3>About</h3><p>${p.bio ? esc(p.bio) : '<span class="meta">Add a short intro so founders and specialists know what you’re working on.</span>'}</p></section>
        <section class="pf-sec"><h3>Industry</h3><div class="tags">${(p.industries || []).length ? p.industries.map((x, i) => `<span class="badge badge--${["orange", "blue", "purple"][i % 3]}">${esc(x)}</span>`).join("") : '<span class="meta">Pick up to three industries.</span>'}</div></section>
        ${p.show.languages ? `<section class="pf-sec"><h3>Languages</h3><div class="tags">${(p.languages || []).length ? p.languages.map((l) => `<span class="badge badge--gray">${esc(l.name)} · ${esc(l.level)}</span>`).join("") : '<span class="meta">Add the languages you work in.</span>'}</div></section>` : ""}
        <section class="pf-sec"><h3>CV &amp; links</h3><div class="tags">${docs || '<span class="meta">Add your LinkedIn page, a CV, or links like GitHub and a portfolio.</span>'}<button class="btn btn--sm btn--ghost pf-add-link" type="button" data-pf-links>${icon("plus")} Add a link</button></div></section>
        <section class="pf-sec"><h3>Skills</h3><div class="tags">${(p.skills || []).length ? p.skills.map((k) => `<span class="badge badge--gray">${esc(k)}</span>`).join("") : '<span class="meta">Add skills so founders and specialists can find you.</span>'}</div></section>
        <section class="pf-sec"><h3>Work record</h3>${record}</section>
        <a class="link-btn pf-update" href="onboarding.html?edit=1&next=${encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash)}">${icon("refresh")} Update your sign-up answers</a>
      </div>`;
  }

  function profileEditHTML() {
    const p = S.profile();
    const openOpts = Object.entries(D.openTypes).map(([k, v]) => `<option value="${k}" ${p.openType === k ? "selected" : ""}>${esc(v)}</option>`).join("");
    return `
      <div class="modal-head"><h2 id="pfTitle">Edit profile</h2>${closeBtn()}</div>
      <form class="modal-body form-grid" id="pfForm" novalidate>
        <label class="field field--full"><span>Headline</span><input class="input" name="headline" value="${esc(p.headline)}" maxlength="100" autofocus></label>
        <label class="field field--full"><span>About</span><textarea class="textarea" name="bio" maxlength="400">${esc(p.bio)}</textarea></label>
        <label class="field field--full"><span>Skills <em class="hint">comma separated</em></span><input class="input" name="skills" value="${esc((p.skills || []).join(", "))}"></label>
        <div class="field field--full field--inline">
          ${switchHTML('name="open"', p.open, "Show that I’m open to build")}
          <select class="select" name="openType" aria-label="What are you open to?">${openOpts}</select>
        </div>
        <fieldset class="field field--full pf-show" id="pfShow">
          <legend>Show on your profile</legend>
          <div class="pf-show-grid">${Object.entries(SHOW_LABELS).map(([k, label]) => switchHTML(`name="show_${k}"`, p.show[k], label)).join("")}</div>
        </fieldset>
        <div class="field field--full pf-invisible">
          ${switchHTML('name="invisible"', !!p.invisible, "Invisible")}
          <p class="meta">Hide me from the MORI Network. People who search your full name can still find you, but they’ll only see your name and when you joined, with the default photo, and they can’t send you a request. Your connections still see your full profile.</p>
        </div>
        <fieldset class="field field--full pf-links" id="pfLinks">
          <legend>Links <em class="hint">GitHub, portfolio, socials · up to 8</em></legend>
          <div class="pf-link-rows">${(p.links || []).map(linkRowHTML).join("")}</div>
          <button class="btn btn--sm" type="button" data-pf-addlink>${icon("plus")} Add a link</button>
        </fieldset>
        <p class="field--full meta pf-edit-note">Name, date of birth, region, role, industries, LinkedIn, CV and languages come from your sign-up answers. <a class="link-btn" href="onboarding.html?edit=1&next=${encodeURIComponent(location.pathname.split("/").pop())}">Update them</a></p>
      </form>
      <div class="modal-foot"><button class="btn" type="button" data-pf-cancel>Cancel</button><button class="btn btn--ink" type="button" data-pf-save>${icon("check")} Save profile</button></div>`;
  }

  function linkRowHTML(l = { type: "github", url: "" }) {
    const opts = LINK_TYPES.map((t) => `<option value="${t.id}" ${t.id === l.type ? "selected" : ""}>${esc(t.label)}</option>`).join("");
    const t = LINK_TYPES.find((x) => x.id === l.type) || LINK_TYPES[0];
    return `<div class="pf-link-row">
      <select class="select" data-link-type aria-label="Kind of link">${opts}</select>
      <input class="input" data-link-url type="url" inputmode="url" value="${esc(l.url)}" placeholder="${esc(t.hint)}" aria-label="Link address" maxlength="300">
      <button class="icon-btn" type="button" data-pf-droplink aria-label="Remove this link">${icon("x")}</button>
    </div>`;
  }
  /** Read the links editor: https only, "github.com/x" becomes "https://github.com/x". */
  function readLinks(form) {
    const out = [];
    for (const row of $$(".pf-link-row", form)) {
      const raw = $("[data-link-url]", row).value.trim();
      if (!raw) continue;
      let url;
      try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : "https://" + raw); } catch (e) { url = null; }
      if (!url || !/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) {
        const err = new Error(`“${raw}” doesn’t look like a web address.`);
        err.field = $("[data-link-url]", row);
        throw err;
      }
      url.protocol = "https:";
      out.push({ type: $("[data-link-type]", row).value, url: url.href });
    }
    return out.slice(0, 8);
  }

  /* Profile photo: upload or adjust (in the cropper), your Google photo, or the default icon */
  const CROP = {
    photo: { title: "Adjust your photo", save: "Save photo", aspect: 1, round: true, outW: 512, done: "Profile photo updated", apply: (blob) => S.setPhoto(blob) },
    cover: { title: "Adjust your banner", save: "Save banner", aspect: 3, round: false, outW: 1500, done: "Banner updated", apply: (blob) => S.setCover(blob) },
  };
  function checkImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPG, PNG or WebP image.");
    if (file.size > 15 * 1024 * 1024) throw new Error("That image is over 15 MB. Choose a smaller one.");
  }
  async function openCropper(kind, src) {
    const c = CROP[kind];
    const el = createModal("modal-profile", { label: "Profile", panelCls: "modal--profile" });
    const panel = $(".modal", el);
    panel.innerHTML = `
      <div class="modal-head"><h2 id="pfTitle">${c.title}</h2>${closeBtn()}</div>
      <div class="modal-body"><div id="pfCrop" class="pf-crop pf-crop--${kind}"></div></div>
      <div class="modal-foot"><button class="btn" type="button" data-crop-cancel>Cancel</button><button class="btn btn--ink" type="button" data-crop-save disabled>${icon("check")} ${c.save}</button></div>`;
    const back = () => renderProfile("view");
    $("[data-crop-cancel]", panel).addEventListener("click", back);
    let crop;
    try {
      crop = await Mori.ui.cropper($("#pfCrop", panel), src, { aspect: c.aspect, round: c.round, outW: c.outW });
    } catch (err) {
      toast(err.message, { icon: "x", duration: 4200 });
      back();
      return;
    }
    const save = $("[data-crop-save]", panel);
    save.disabled = false;
    $(".crop-stage", panel).focus({ preventScroll: true });
    save.addEventListener("click", async () => {
      save.disabled = true;
      save.innerHTML = `${icon("clock")} Saving…`;
      try {
        await c.apply(await crop.toBlob());
        toast(c.done, { icon: "check" });
      } catch (err) {
        toast(err.code === "signed-out" ? err.message : "Couldn’t save it: " + (err.message || "please try again."), { icon: "x", duration: 4200 });
      }
      crop.destroy();
      if (Mori.modal.isOpen("modal-profile")) back();
    });
  }
  async function changeCover(choice, file) {
    try {
      if (choice === "upload") { checkImage(file); openCropper("cover", file); return; }
      if (choice === "adjust") { openCropper("cover", S.profile().cover); return; }
      await S.setCover(null);
      toast("Back to the default banner", { icon: "check" });
    } catch (err) {
      toast(err.code === "signed-out" ? err.message : "Couldn’t change your banner: " + (err.message || "please try again."), { icon: "x", duration: 4200 });
    }
    if (Mori.modal.isOpen("modal-profile")) renderProfile("view");
  }
  async function changePhoto(choice, panel, file) {
    if (choice === "upload") {
      try { checkImage(file); } catch (err) { toast(err.message, { icon: "x", duration: 4200 }); return; }
      openCropper("photo", file);
      return;
    }
    if (choice === "adjust") { openCropper("photo", S.profile().photo); return; }
    const wrap = $(".pf-photo", panel);
    if (wrap) wrap.classList.add("is-busy");
    try {
      if (choice === "google") {
        await S.setPhoto(S.session().picture);
        toast("Using your Google photo", { icon: "check" });
      } else {
        await S.setPhoto(null);
        toast("Back to the default icon", { icon: "check" });
      }
    } catch (err) {
      toast(err.code === "signed-out" ? err.message : "Couldn’t change your photo: " + (err.message || "please try again."), { icon: "x", duration: 4200 });
    }
    if (Mori.modal.isOpen("modal-profile")) renderProfile("view");
  }

  async function openCv() {
    const p = S.profile();
    if (!p.cvPath || !Mori.db || !Mori.db.enabled) { toast("In demo mode the CV stays on your device, so there’s nothing to open here."); return; }
    const win = window.open("", "_blank"); // opened now so the browser doesn't block it
    try {
      const url = await Mori.db.cvLink(p.cvPath);
      if (win) win.location = url; else location.href = url;
    } catch (err) {
      if (win) win.close();
      toast(err.message || "Couldn’t open your CV.", { icon: "x" });
    }
  }

  function renderProfile(mode = "view", opts = {}) {
    const el = createModal("modal-profile", { label: "Profile", panelCls: "modal--profile" });
    const panel = $(".modal", el);
    panel.setAttribute("aria-labelledby", "pfTitle");
    panel.innerHTML = mode === "edit" ? profileEditHTML() : profileViewHTML();
    panel.scrollTop = 0;
    if (mode === "view") {
      $$("[data-pf-edit]", panel).forEach((b) => b.addEventListener("click", () => renderProfile("edit")));
      $("[data-pf-links]", panel).addEventListener("click", () => renderProfile("edit", { links: true }));
      const cv = $("[data-pf-cv]", panel);
      if (cv) cv.addEventListener("click", openCv);
      const photoBtn = $("[data-pf-photo]", panel);
      const menu = $(".pf-photo > .pf-photo-menu", panel);
      const fileInput = $("[data-pf-photo-file]", panel);
      const showMenu = (open) => { menu.hidden = !open; photoBtn.setAttribute("aria-expanded", String(open)); };
      photoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (menu.children.length === 1) fileInput.click(); // nothing to choose between: go straight to the picker
        else showMenu(menu.hidden);
      });
      menu.addEventListener("click", (e) => {
        const b = e.target.closest("[data-photo]");
        if (!b) return;
        showMenu(false);
        if (b.dataset.photo === "upload") fileInput.click();
        else changePhoto(b.dataset.photo, panel);
      });
      panel.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest(".pf-photo")) showMenu(false); });
      fileInput.addEventListener("change", () => { const f = fileInput.files && fileInput.files[0]; if (f) changePhoto("upload", panel, f); });
      const coverBtn = $("[data-pf-cover]", panel);
      const coverMenu = $(".pf-cover-menu", panel);
      const coverFile = $("[data-pf-cover-file]", panel);
      const showCoverMenu = (open) => { coverMenu.hidden = !open; coverBtn.setAttribute("aria-expanded", String(open)); };
      coverBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (coverMenu.children.length === 1) coverFile.click();
        else showCoverMenu(coverMenu.hidden);
      });
      coverMenu.addEventListener("click", (e) => {
        const b = e.target.closest("[data-cover]");
        if (!b) return;
        showCoverMenu(false);
        if (b.dataset.cover === "upload") coverFile.click();
        else changeCover(b.dataset.cover);
      });
      panel.addEventListener("click", (e) => { if (!coverMenu.hidden && !e.target.closest(".pf-cover")) showCoverMenu(false); });
      coverFile.addEventListener("change", () => { const f = coverFile.files && coverFile.files[0]; if (f) changeCover("upload", f); });
      Mori.motion.refresh(panel);
      return el;
    }
    const form = $("#pfForm", panel);
    const rows = $(".pf-link-rows", form);
    const addBtn = $("[data-pf-addlink]", form);
    const syncAdd = () => { addBtn.hidden = $$(".pf-link-row", rows).length >= 8; };
    const addRow = () => {
      rows.insertAdjacentHTML("beforeend", linkRowHTML());
      syncAdd();
      const input = $$("[data-link-url]", rows).pop();
      input.focus();
      return input;
    };
    addBtn.addEventListener("click", addRow);
    rows.addEventListener("click", (e) => { const b = e.target.closest("[data-pf-droplink]"); if (b) { b.closest(".pf-link-row").remove(); syncAdd(); } });
    rows.addEventListener("change", (e) => {
      if (!e.target.matches("[data-link-type]")) return;
      const t = LINK_TYPES.find((x) => x.id === e.target.value);
      if (t) e.target.closest(".pf-link-row").querySelector("[data-link-url]").placeholder = t.hint;
    });
    syncAdd();
    const wasInvisible = !!S.profile().invisible;
    const save = async () => {
      const f = new FormData(form);
      const btn = $("[data-pf-save]", panel);
      let links;
      try { links = readLinks(form); } catch (err) {
        toast(err.message, { icon: "x", duration: 3600 });
        if (err.field) err.field.focus();
        return;
      }
      btn.disabled = true;
      try {
        await S.saveProfile({
          headline: String(f.get("headline") || "").trim(),
          bio: String(f.get("bio") || "").trim(),
          skills: String(f.get("skills") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12),
          open: !!form.elements.open.checked,
          openType: String(f.get("openType") || "cofound"),
          links,
          show: Object.fromEntries(Object.keys(SHOW_LABELS).map((k) => [k, !!form.elements["show_" + k].checked])),
          invisible: !!form.elements.invisible.checked,
        });
        const nowInvisible = !!form.elements.invisible.checked;
        toast(nowInvisible !== wasInvisible ? (nowInvisible ? "You’re invisible on the MORI Network" : "You’re visible on the MORI Network again") : "Profile updated", { icon: "check" });
      } catch (err) {
        toast("Saved on this device, but not to your account: " + err.message, { icon: "x", duration: 4200 });
      }
      renderProfile("view");
    };
    $("[data-pf-cancel]", panel).addEventListener("click", () => renderProfile("view"));
    $("[data-pf-save]", panel).addEventListener("click", save);
    form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
    if (opts.links) {
      setTimeout(() => {
        $("#pfLinks", panel).scrollIntoView({ block: "center", behavior: Mori.motion.reduced() ? "auto" : "smooth" });
        if (!$$(".pf-link-row", rows).length) addRow(); else $$("[data-link-url]", rows).pop().focus();
      }, 80);
    } else {
      setTimeout(() => form.elements.headline.focus(), 80);
    }
    return el;
  }

  /* ---------- Settings modal ---------- */
  const SETTINGS_TABS = [
    { id: "account", label: "Account", icon: "user" },
    { id: "preferences", label: "Preferences", icon: "sliders" },
    { id: "privacy", label: "Privacy", icon: "shield" },
    { id: "projects", label: "Projects", icon: "projects" },
    { id: "notifications", label: "Notifications", icon: "bell" },
  ];

  function settingsHTML(tab) {
    const s = S.session();
    const st = S.settings();
    const p = S.profile();
    const row = (title, desc, control, cls = "") =>
      `<div class="st-row ${cls}"><div class="st-copy"><h4>${title}</h4><p>${desc}</p></div><div class="st-control">${control}</div></div>`;
    const notifyRow = (key, title, desc) => row(title, desc, switchHTML(`data-notify="${key}" aria-label="${esc(title)}"`, st.notify[key]));
    const pane = (id, html) => `<section class="st-pane" data-pane="${id}" role="tabpanel" aria-label="${id}" ${id === tab ? "" : "hidden"}>${html}</section>`;
    const segHTML = (key, value, options) => `<div class="seg" data-setting="${key}" data-value="${value}">${options.map(([v, l]) => `<button data-value="${v}">${l}</button>`).join("")}</div>`;

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
              ${avatar(S.me(), 48)}
              <div class="st-card-copy"><b>${esc(S.me().name)}</b><span class="meta">${esc(s.email || "No email on this demo account")}</span></div>
              <span class="provider">${s.provider === "google" ? googleG() + "Google" : icon("sparkle") + "Demo"}</span>
            </div>
            ${row("Sign-in method", s.provider === "google" ? "You sign in with your Google account. Your profile, CV, projects and messages are stored in your Sandbox account." : "Demo mode: everything stays in this browser. Open the site over http(s) to sign in with Google.", "")}
            ${row("Sign out", "Sign out of Sandbox on this browser.", `<button class="btn btn--sm" data-action="signout">${icon("logout")} Sign out</button>`)}
            ${row("Reset this browser", s.provider === "google" ? "Clears the settings and copies saved in this browser. Everything in your account stays." : "Clears the projects and settings saved in this browser. Your sign-up answers stay.", `<button class="btn btn--sm btn--danger" data-reset>${icon("refresh")} Reset</button>`, "st-row--danger")}
          `)}
          ${pane("preferences", `
            ${row("Motion effects", "Animations, tilt and parallax across Sandbox. System follows your device setting.", segHTML("motion", st.motion, [["system", "System"], ["full", "Full"], ["reduced", "Reduced"]]))}
            ${row("Start page", "Where Sandbox opens after you sign in.",
              `<select class="select" data-setting="startPage" aria-label="Start page">${[["home.html", "Home"], ["projects.html", "Projects"], ["network.html", "Network"]]
                .map(([v, l]) => `<option value="${v}" ${st.startPage === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
            ${row("Site tour", "A short tour of the MORI Network, your projects and the subscription ladder.", `<button class="btn btn--sm" type="button" data-tour-start="site">${icon("compass")} Take the tour</button>`)}
          `)}
          ${pane("projects", `
            ${row("Open projects on", "The page a project opens on from Home, Projects and the Projects menu.", segHTML("projectStart", st.projectStart, [["mainframe", "Mainframe"], ["tasks", "Daily tasks"]]))}
            ${row("Tools sidebar", "Show the sidebar of tools in the project planner. The button at its top left hides and shows it too.", switchHTML('data-setting="projectSidebar" aria-label="Show the tools sidebar"', st.projectSidebar !== false))}
            ${row("Project tour", S.projects().length ? "A walk through the planner: its tools, your team and the Mainframe’s widgets." : "A walk through the planner. It starts when you declare your first project.", `<button class="btn btn--sm" type="button" data-tour-start="project" ${S.projects().length ? "" : "disabled"}>${icon("compass")} Take the tour</button>`)}
            <div class="st-row st-row--list"><div class="st-copy"><h4>Pinned to your homepage</h4><p>Pinned projects show on your homepage and in the Projects menu.${s.provider === "google" ? " Your pins, like these settings, follow you to every device you sign in on." : ""}</p></div></div>
            <div class="st-pins">${S.projects().map((p) => `<div class="st-pin"><span class="st-pin-name">${esc(p.name)}</span>${switchHTML(`data-pin="${esc(p.id)}" aria-label="Pin ${esc(p.name)} to your homepage"`, p.pinned)}</div>`).join("") || `<p class="meta">No projects yet. <a href="projects.html?new=1">Declare one</a>.</p>`}</div>
          `)}
          ${pane("notifications", `
            ${notifyRow("messages", "Messages", "A pop-up when a connection messages you. The Messages badge always shows unread conversations.")}
            ${notifyRow("requests", "Connection requests", "When founders or specialists want to connect, or accept your request.")}
            ${notifyRow("projects", "Projects and milestones", "Sprint progress and rungs reached on your projects.")}
            ${notifyRow("announcements", "Sprints, rooms and insights", "Sprint lobbies, verified sprints and new insights.")}
            ${notifyRow("digest", "Weekly email digest", "A Sunday summary by email. Arrives with the Sandbox backend.")}
          `)}
          ${pane("privacy", `
            ${row("Profile visibility", "Who sees your full profile in the Network. Everyone else sees your name, role and headline.", segHTML("visibility", p.visibility, [["everyone", "Everyone"], ["connections", "Connections"]]))}
            ${row("Show my work record", "Founders and specialists see the rungs you’ve reached and your verified sprints. You can hide the whole record, but not single parts of it.", switchHTML('data-setting="showRecord" aria-label="Show my work record"', st.showRecord))}
            ${row("Show “Open to build”", "Adds the open-to-build ring and tag to your profile.", switchHTML('data-profile="open" aria-label="Show open to build"', p.open))}
          `)}
        </div>
      </div>`;
  }

  function renderSettings(tab = "account") {
    const el = createModal("modal-settings", { label: "Settings", panelCls: "modal--settings" });
    const panel = $(".modal", el);
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
    const segs = $$(".seg[data-setting]", panel).map((s) => seg(s, (v) => {
      if (s.dataset.setting === "visibility") {
        // Stored on the profile so the Network can respect it.
        S.saveProfile({ visibility: v }).then(saved, (err) => toast("Saved on this device, but not to your account: " + err.message, { icon: "x", duration: 4200 }));
        return;
      }
      S.saveSettings({ [s.dataset.setting]: v });
      saved();
    }));
    const showTab = (id) => {
      $$(".st-tab", panel).forEach((t) => { const on = t.dataset.tab === id; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", String(on)); });
      $$(".st-pane", panel).forEach((p) => { p.hidden = p.dataset.pane !== id; if (!p.hidden) Mori.motion.enter(p, ".st-row, .st-card"); });
      segs.forEach((sg) => sg.refresh());
    };
    $$(".st-tab", panel).forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
    $$("input[data-setting], select[data-setting]", panel).forEach((input) =>
      input.addEventListener("change", () => { S.saveSettings({ [input.dataset.setting]: input.type === "checkbox" ? input.checked : input.value }); saved(); }));
    $$("input[data-notify]", panel).forEach((input) => input.addEventListener("change", () => { S.saveSettings({ notify: { [input.dataset.notify]: input.checked } }); saved(); updateBadges(); }));
    $$("input[data-profile]", panel).forEach((input) => input.addEventListener("change", () => { S.saveProfile({ [input.dataset.profile]: input.checked }).catch(() => {}); saved(); }));
    $$("input[data-pin]", panel).forEach((input) => input.addEventListener("change", () => {
      const p = S.project(input.dataset.pin);
      if (p && p.pinned !== input.checked) S.togglePin(p.id);
      saved();
    }));

    const reset = $("[data-reset]", panel);
    let armed = false;
    reset.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        reset.innerHTML = `${icon("refresh")} Tap again to confirm`;
        setTimeout(() => { armed = false; reset.innerHTML = `${icon("refresh")} Reset`; }, 3500);
        return;
      }
      const keep = S.profile(); // sign-up answers survive a reset
      S.reset();
      S.saveProfile(keep, { remote: false });
      toast("This browser was reset", { icon: "refresh" });
      setTimeout(() => location.reload(), 700);
    });
    showTab(tab);
    return el;
  }

  /* ---------- Notifications modal ---------- */
  const NT_STYLE = {
    request: ["userPlus", "#3e5c98", "#3d5b96"],
    accepted: ["check", "#34d399", "#10b981"],
    message: ["message", "#34d399", "#265451"],
    mention: ["at", "#a04174", "#8b2e45"],
    project: ["target", "#896938", "#775b31"],
    ladder:  ["ladder", "#71562e", "#775b31"],
    sprint:  ["zap", "#375186", "#375186"],
    insight: ["bulb", "#775b31", "#71562e"],
    badge:   ["award", "#a13651", "#775b31"],
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
        ${items.length ? items.map(item).join("") : empty("check", "You’re all caught up.", "Connection requests, and members accepting yours, will show up here.", "nt-empty")}
      </div>
      <div class="modal-foot modal-foot--start"><button class="btn btn--sm btn--ghost" data-nt-settings>${icon("sliders")} Notification settings</button></div>`;
  }

  function renderNotifications() {
    const el = createModal("modal-notifications", { label: "Notifications", panelCls: "modal--notifications" });
    const panel = $(".modal", el);
    panel.setAttribute("aria-labelledby", "ntTitle");
    panel.innerHTML = notificationsHTML();
    Mori.motion.enter($(".nt-list", panel), ".nt");

    seg($(".seg", panel), (v) => { ntFilter = v; renderNotifications(); });
    $("[data-nt-readall]", panel).addEventListener("click", () => { S.markAllNotificationsRead(); renderNotifications(); toast("All caught up", { icon: "check" }); });
    $("[data-nt-settings]", panel).addEventListener("click", () => openAccountModal("settings", null, "notifications"));
    $$("[data-nt]", panel).forEach((b) =>
      b.addEventListener("click", () => {
        const n = S.notifications().find((x) => x.id === b.dataset.nt);
        if (!n) return;
        S.markNotificationRead(n.id);
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
    return el;
  }

  /* ---------- Opening modals ---------- */
  const RENDER = { profile: () => renderProfile("view"), settings: (tab) => renderSettings(tab), notifications: () => renderNotifications() };
  function openAccountModal(which, opener, tab) {
    if (!RENDER[which]) return;
    closeMenus();
    RENDER[which](tab || "account");
    Mori.modal.open("modal-" + which, { opener: opener || undefined });
  }

  async function signOut() {
    Mori.modal.close({ restoreFocus: false });
    loader.show("Signing out", "See you soon…");
    await Promise.race([Mori.db ? Mori.db.signOut() : null, new Promise((r) => setTimeout(r, 1500))]);
    S.forgetPrivate(); // other members' details and messages don't stay on this device
    Mori.auth.clearSession();
    location.replace("index.html?signedout=1");
  }

  /* ---------- Global delegation ---------- */
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".item.is-open")) closeMenus();

    const m = e.target.closest("[data-modal]");
    if (m) { e.preventDefault(); openAccountModal(m.dataset.modal, m, m.dataset.tab); return; }

    const later = e.target.closest("[data-soon]");
    if (later) { e.preventDefault(); closeMenus(); soon(later.dataset.soon); return; }

    if (e.target.closest('[data-action="signout"]')) { e.preventDefault(); signOut(); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });
  // The nav shows your photo, name and pinned projects: rebuild it when any of those change.
  const navKey = () => JSON.stringify([S.me(), S.pinnedProjects().map((p) => [p.id, p.name])]);
  let lastNav = "";
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (["profile", "projectsRemote", "projectsCreated", "projectOverrides"].includes(key) && $("#topNav.app-nav") && navKey() !== lastNav) {
      lastNav = navKey();
      mountNav();
    } else {
      updateBadges();
    }
    if ((key === "network" || key === "links" || key === "notifRead") && Mori.modal.isOpen("modal-notifications")) renderNotifications();
  });

  // Live updates: a short pop-up for requests, acceptances and messages.
  document.addEventListener("mori:live", (e) => {
    const d = e.detail || {};
    const name = d.person ? d.person.name : "Someone";
    const st = S.settings().notify;
    if (d.kind === "request" && st.requests !== false) toast(`${name} wants to connect`, { icon: "userPlus", duration: 3600 });
    else if (d.kind === "accepted" && st.requests !== false) toast(`${name} accepted your request`, { icon: "check", duration: 3600 });
    else if (d.kind === "message" && st.messages !== false && !(d.person && S.chat.viewing === d.person.id && !document.hidden)) {
      const text = d.message.body.length > 60 ? d.message.body.slice(0, 57) + "…" : d.message.body;
      toast(`${name.split(/\s+/)[0]}: ${text}`, { icon: "message", duration: 4200 });
    }
  });
  document.addEventListener("mori:modal", (e) => { if (e.detail.open) closeMenus(); });

  mountNav();
  mountFooter();
  if ($("#topNav.app-nav")) {
    speculate();
    // Keep the local profile in step with the database (signed-in Google members).
    S.syncProfile().then((changed) => {
      if (!changed) return;
      if (S.session().provider === "google" && !S.profileComplete()) {
        // New sign-up questions (date of birth, a specialist's role): ask once, answers filled in.
        Mori.auth.updateSession({ onboarded: false });
        const here = location.pathname.split("/").pop() || "home.html";
        location.replace("onboarding.html?next=" + encodeURIComponent(here + location.search + location.hash));
        return;
      }
      const name = fullName(S.profile(), S.session());
      if (name && name !== S.session().name) { Mori.auth.updateSession({ name, givenName: name.split(/\s+/)[0] }); mountNav(); }
      if (Mori.modal.isOpen("modal-profile")) renderProfile("view");
    }).catch(() => { /* offline: keep the local copy */ });
    // Requests, messages and projects: load the latest, then stay live.
    const refreshAll = () => {
      S.syncPrefs().catch(() => { /* keep this device's copy */ });
      S.network.refresh().catch(() => { /* keep the local copy */ });
      S.chat.refresh().catch(() => {});
      S.refreshProjects().catch(() => {});
    };
    const goLive = () => { refreshAll(); S.live.start(); };
    // A page prerendered on hover waits until it's actually opened.
    if (document.prerendering) document.addEventListener("prerenderingchange", goLive, { once: true });
    else goLive();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshAll(); });
    // Switching windows (another browser beside this one) doesn't hide the page: bring in synced settings and pins on focus too.
    window.addEventListener("focus", () => S.syncPrefs().catch(() => {}));
    // Safety net in case the live connection drops without telling us.
    setInterval(() => { if (!document.hidden && S.live.state !== "SUBSCRIBED") refreshAll(); }, 45000);
    lastNav = navKey();
  }

  Mori.shell = { openModal: openAccountModal, updateBadges, mountNav, ladderBar, switchHTML, closeMenus, signOut };
})();
