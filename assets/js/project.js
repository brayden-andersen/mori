/* ==========================================================================
   Mori: Sandbox — project planner (project.html?id=<project id>#<section>)
   --------------------------------------------------------------------------
   The project's full-screen workspace:
   • the header: tags, name, the section you're in ("Mainframe" in red on the
     project's home), when it was updated and created, the team, Edit details
     and Pin
   • overall progress: the rung on the milestone ladder plus the share of the
     next rung's proof that's done, with overdue and due-this-week tasks
   • a sidebar of the project's pages on the left (the button at the top
     left hides it): the Mainframe, the project's home, and a page for each
     tool. Each page has its own address (…#tasks, #finance, #docs/<id>), so
     it can be bookmarked or shared and the back button works; switching is
     instant because the pages share one app shell and the project's data.
   • below a thin rule: the page's main action on the right (Edit
     Mainframe, New document) and the page itself: the Mainframe
     (mainframe.js), documents (planner-docs.js) or a tool (planner-tools.js)
   Teammates' changes arrive when the page comes back into view and every 20 s.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatarStack, humanizeDays, toast, createModal } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const N = S.network;
  const K = Mori.projectKit;
  const W = Mori.workspace;
  const T = Mori.plannerTools;
  const DOCS = Mori.plannerDocs;
  const MF = Mori.mainframe;

  const main = $("#planner");
  const pid = new URLSearchParams(location.search).get("id") || "";
  const project = () => S.project(pid);
  let loaded = !N.available() || !!project();
  let built = false;
  let leaving = false;
  let pendingView = false;

  const DRAWER = "(max-width: 1240px)"; // the sidebar is a drawer over the page up to this width
  const isNarrow = () => window.matchMedia(DRAWER).matches;

  const failed = (err) => Mori.people.fail(err && err.code === "signed-out" ? err : new Error("That change wasn’t saved: " + ((err && err.message) || "please try again.")));
  const isoIn = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return W.isoDay(d); };

  /* ---------- Where we are: #mainframe, #tasks, #docs/<id>… ---------- */
  const SECTION_IDS = T.SECTIONS.filter((s) => s.id).map((s) => s.id);
  const route = () => {
    const h = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (SECTION_IDS.includes(h.split("/")[0])) return h;
    return S.settings().projectStart === "tasks" ? "tasks" : "mainframe"; // Settings → Projects → Open projects on
  };
  const section = () => route().split("/")[0];
  function go(to) {
    if (route() === to) { renderAll(); return; }
    location.hash = to;
  }
  const whoById = (id) => {
    if (!id) return "";
    if (id === S.session().id) return "you";
    const p = project();
    const m = p && K.teamOf(p).find((x) => x.id === id);
    return m ? m.person.name : "";
  };
  const ctx = () => {
    const p = project();
    return { pid, p, ws: W.get(pid), docs: W.docs.list(pid), who: whoById, go, route };
  };

  /* ---------- Frame (built once) ---------- */
  const crumbs = (name) => `<nav class="crumbs" aria-label="Breadcrumb"><a href="home.html">Home</a> <span class="sep">/</span> <a href="projects.html">Projects</a>${name != null ? ` <span class="sep">/</span> <span id="crumbName">${esc(name)}</span>` : ""}</nav>`;
  function navHTML() {
    return T.SECTIONS.map((s) => (s.group
      ? `<p class="pl-nav-group">${esc(s.group)}</p>`
      : `<a class="pl-nav-link" href="#${s.id}" data-section="${s.id}">${icon(s.icon)}<span>${esc(s.label)}</span></a>`)).join("");
  }
  function build() {
    built = true;
    main.removeAttribute("aria-busy");
    const hidden = S.settings().projectSidebar === false;
    main.innerHTML = `
      <div class="pl-shell ${hidden ? "is-collapsed" : ""}" id="plShell">
        <nav class="pl-nav" id="plNav" aria-label="Project tools">
          <div class="pl-nav-inner">
            <div class="pl-nav-head"><span class="pl-nav-title" id="plNavName"></span><button class="icon-btn pl-nav-close" type="button" data-nav-toggle aria-label="Close tools">${icon("x")}</button></div>
            ${navHTML()}
          </div>
        </nav>
        <div class="pl-scrim" data-nav-toggle hidden></div>
        <div class="pl-main">
          <div class="pl-topline">
            <button class="icon-btn pl-burger" type="button" data-nav-toggle aria-controls="plNav" aria-expanded="${!hidden}" aria-label="Show or hide the tools">${icon("menu")}</button>
            ${crumbs("")}
          </div>
          <header class="pl-head" id="plHead"></header>
          <section class="pl-summary" id="plSummary" aria-label="Overall progress"></section>
          <hr class="pl-sep">
          <div class="pl-toolbar" id="plToolbar"></div>
          <div class="pl-view" id="plView"></div>
          <p class="sr-only" id="plAnnounce" aria-live="polite"></p>
        </div>
      </div>`;
    if (!main.dataset.bound) { main.dataset.bound = "1"; bind(); }
  }

  function showMissing(wasOpen) {
    main.removeAttribute("aria-busy");
    main.innerHTML = `<div class="wrap wrap--planner">${crumbs(null)}
      <div class="panel pl-missing">
        <div class="empty"><span class="empty-ico">${icon("projects")}</span>
          <div>This project isn’t available</div>
          <div class="meta">It may have been deleted, or you’re no longer on its team.</div>
          <div><a class="btn btn--ink" href="projects.html">Back to your projects</a></div>
        </div>
      </div></div>`;
    document.title = "SandBox • Project planner";
    if (wasOpen) toast("You’re no longer on that project", { icon: "x" });
  }

  /* ---------- Drawing ---------- */
  /** The browser tab names the page: "SandBox • Warung Pay · Finance" (or the document's title). */
  function setTitle(p) {
    const sec = section();
    const docId = sec === "docs" ? route().split("/")[1] : "";
    const doc = docId ? W.docs.get(pid, docId) : null;
    document.title = `SandBox • ${p.name}${sec === "mainframe" ? "" : " · " + (doc ? doc.title : T.label(sec))}`;
  }
  function renderAll() {
    if (leaving) return;
    const p = project();
    if (!p) {
      if (loaded) { const wasOpen = built; built = false; showMissing(wasOpen); }
      return;
    }
    if (!built) build();
    setTitle(p);
    $("#crumbName").textContent = p.name;
    $("#plNavName").textContent = p.name;
    renderHead(p);
    renderSummary(p);
    renderNav();
    renderToolbar();
    renderView();
  }

  function renderHead(p) {
    const team = K.teamOf(p);
    const created = new Date(p.createdAt || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    $("#plHead").innerHTML = `
      <div class="pl-head-main">
        <div class="chips">${K.tagChips(p.tags)}</div>
        <h1 class="title pl-title" id="plTitle">${esc(p.name)}</h1>
        <p class="pl-section-label" id="plSection">${esc(T.label(section()))}</p>
        <p class="meta">Updated ${esc(humanizeDays(p.updated_days).toLowerCase())} · Created on ${esc(created)}</p>
      </div>
      <div class="pl-head-side">
        <a class="pl-team-peek" href="#people" aria-label="Team: ${team.length === 1 ? "just you" : team.length + " people"}">${avatarStack(team.map((m) => m.person), 30)}<span>${team.length === 1 ? "Just you" : team.length + " people"}</span></a>
        <div class="pl-head-actions">
          <button class="btn" type="button" data-pl-edit>${icon("edit")} Edit details</button>
          <button class="btn" type="button" data-pl-pin aria-pressed="${p.pinned}">${icon("pin")} <span>${p.pinned ? "Pinned to home" : "Pin to home"}</span></button>
          ${K.canAddPeople(p) && K.addablePeople(p).length ? `<button class="btn btn--ink" type="button" data-pd-add>${icon("userPlus")} Add to team</button>` : ""}
        </div>
      </div>`;
  }

  /* Overall progress (updated in place, so the number and the bar glide). */
  let shownPct = null;
  function renderSummary(p) {
    const box = $("#plSummary");
    if (!box.firstElementChild) {
      shownPct = null;
      box.innerHTML = `
        <div class="pl-sum-main">
          <span class="pl-pct" id="plPct" data-suffix="%"></span>
          <a class="pl-sum-copy" href="#ladder"><b id="plDoneLine"></b><span class="meta" id="plSub"></span></a>
        </div>
        <div class="pl-ladderbar" id="plStack" role="img">${[1, 2, 3, 4, 5].map((r) => `<i data-seg="${r}"><b></b></i>`).join("")}</div>
        <div class="pl-sum-stats"><span class="pl-stat" id="plLate"><b></b> overdue</span><span class="pl-stat" id="plSoon"><b></b> due this week</span></div>`;
    }
    const g = W.progress(p);
    const today = K.todayISO();
    const week = isoIn(7);
    const late = p.tasks.filter((t) => !t.done && t.due && t.due < today).length;
    const soon = p.tasks.filter((t) => !t.done && t.due && t.due >= today && t.due <= week).length;
    $("#plDoneLine", box).textContent = `Rung ${p.rung} of 5 · ${D.ladder[p.rung].stage}`;
    $("#plSub", box).textContent = g.next ? `Next: ${D.ladder[g.next].stage} · ${g.done} of ${g.total} proof steps done` : "Top of the ladder: early traction.";
    const stack = $("#plStack", box);
    stack.setAttribute("aria-label", `${g.pct}% of the way from idea to early traction`);
    $$("[data-seg]", stack).forEach((seg) => {
      const r = Number(seg.dataset.seg);
      const fill = r <= p.rung ? 1 : r === g.next && g.total ? g.done / g.total : 0;
      seg.firstElementChild.style.width = Math.round(fill * 100) + "%";
      seg.title = `Rung ${r} · ${D.ladder[r].stage}`;
    });
    $("#plLate b", box).textContent = late;
    $("#plLate", box).classList.toggle("is-late", late > 0);
    $("#plSoon b", box).textContent = soon;
    const pct = $("#plPct", box);
    if (shownPct == null) pct.textContent = g.pct + "%";
    else if (shownPct !== g.pct) { pct.dataset.from = shownPct; Mori.motion.animateCount(pct, g.pct); }
    shownPct = g.pct;
  }

  function renderNav() {
    const sec = section();
    $$(".pl-nav-link", main).forEach((a) => {
      const on = a.dataset.section === sec;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const label = $("#plSection");
    if (label) label.textContent = T.label(sec);
  }

  function renderToolbar() {
    const sec = route();
    const bar = $("#plToolbar");
    let html = "";
    if (sec === "mainframe") {
      // Edit Mainframe turns editing on (moving and resizing); Add widget opens the list of widgets.
      const has = W.get(pid).layout.length > 0;
      const ed = has && MF.isEditing();
      const hint = ed ? `<span class="pl-hint-wide">Drag a widget by its top bar to move it, or by its corner to resize it.</span><span class="pl-hint-narrow">Move and resize widgets on a larger screen.</span>` : "";
      html = `<span class="meta pl-toolbar-hint">${hint}</span><span class="pl-toolbar-actions">${has ? `<button class="btn${ed ? " btn--ink" : ""}" type="button" data-mf-edit aria-pressed="${ed}">${icon(ed ? "check" : "sliders")} ${ed ? "Done" : "Edit Mainframe"}</button>` : ""}<button class="btn" type="button" data-mf-add>${icon("plus")} Add widget</button></span>`;
    }
    else if (sec === "docs") html = `<span></span><button class="btn btn--ink" type="button" data-doc-new>${icon("plus")} New document</button>`;
    if (bar.innerHTML !== html) bar.innerHTML = html;
    bar.hidden = !html;
  }

  /* Keep focus (and what someone is typing) when the section is re-drawn
     underneath them: a ticked checkbox, a status menu or a half-typed field. */
  function focusState(view) {
    const a = document.activeElement;
    if (!a || !view.contains(a) || !a.matches("input, textarea, select, button")) return null;
    const own = Array.from(a.attributes).find((x) => x.name.startsWith("data-"));
    let key = null;
    if (a.id) key = "#" + CSS.escape(a.id);
    else if (own) key = `${a.tagName.toLowerCase()}[${own.name}="${CSS.escape(own.value)}"]`;
    else if (a.form && a.name) {
      const attr = Array.from(a.form.attributes).find((x) => x.name.startsWith("data-"));
      if (attr) key = `form[${attr.name}="${CSS.escape(attr.value)}"] [name="${CSS.escape(a.name)}"]`;
    }
    const typed = a.matches("input:not([type=checkbox]):not([type=radio]), textarea");
    return key ? { key, typed, value: typed ? a.value : null, start: typed ? a.selectionStart : null, end: typed ? a.selectionEnd : null } : null;
  }
  function restoreFocus(view, f) {
    if (!f) return;
    const el = $(f.key, view);
    if (!el || el === document.activeElement) return;
    if (f.typed && el.value !== f.value) el.value = f.value;
    el.focus({ preventScroll: true });
    try { if (f.start != null) el.setSelectionRange(f.start, f.end); } catch (e) { /* not a text field */ }
  }

  /* Data changes re-draw the page once per frame, after the event that
     caused them is over (so Tab from a field that saved lands where it should). */
  let viewFrame = 0;
  const viewSoon = () => { if (!viewFrame) viewFrame = requestAnimationFrame(() => { viewFrame = 0; renderView(); }); };
  function renderView() {
    if (viewFrame) { cancelAnimationFrame(viewFrame); viewFrame = 0; }
    const view = $("#plView");
    if (!view) return;
    if (T.isDragging() || DOCS.busy()) { pendingView = true; return; }
    pendingView = false;
    const sec = section();
    const c = ctx();
    if (sec === "mainframe") {
      let grid = $(".mf-grid", view);
      if (view.dataset.section !== "mainframe" || !grid) {
        view.dataset.section = "mainframe";
        view.innerHTML = `<div class="mf-grid" id="mfGrid"></div>`;
        grid = $(".mf-grid", view);
      }
      MF.render(grid, c);
      return;
    }
    if (sec === "docs") { DOCS.render(view, c, route().split("/")[1]); return; }
    const f = view.dataset.section === sec ? focusState(view) : null;
    if (view.dataset.section !== sec) view.innerHTML = "";
    T.render(sec, view, c);
    restoreFocus(view, f);
  }

  /* ---------- Sidebar ---------- */
  function setNav(open) {
    const shell = $("#plShell");
    if (!shell) return;
    if (isNarrow()) {
      shell.classList.toggle("is-open", open);
      $(".pl-scrim", shell).hidden = !open;
      document.body.classList.toggle("is-locked", open);
      if (open) { const a = $(".pl-nav-link.is-active", shell) || $(".pl-nav-link", shell); if (a) a.focus({ preventScroll: true }); }
    } else {
      shell.classList.toggle("is-collapsed", !open);
      if (S.settings().projectSidebar !== open) S.saveSettings({ projectSidebar: open }); // the same as Settings → Projects → Tools sidebar
    }
    $(".pl-burger", shell).setAttribute("aria-expanded", String(open));
  }
  const navOpen = () => { const shell = $("#plShell"); return isNarrow() ? shell.classList.contains("is-open") : !shell.classList.contains("is-collapsed"); };

  /* ---------- Events ---------- */
  function bind() {
    let shown = section();
    window.addEventListener("hashchange", () => {
      if (isNarrow() && navOpen()) setNav(false);
      const from = shown;
      if (MF.isEditing() && section() !== "mainframe") MF.setEditing(false); // editing ends with the page
      renderAll();
      shown = section();
      const view = $("#plView");
      if (!view || shown === from) return;
      // A new page: start at the top (as a page load would), fade it in, say where we are.
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--navH")) || 64;
      if (view.getBoundingClientRect().top < navH) window.scrollTo({ top: 0, behavior: "instant" });
      if (!Mori.motion.reduced()) {
        view.animate([{ opacity: 0, translate: "0 10px" }, { opacity: 1, translate: "0 0" }], { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" });
        const label = $("#plSection");
        if (label) label.animate([{ opacity: 0, translate: "0 3px" }, { opacity: 1, translate: "0 0" }], { duration: 220, easing: "cubic-bezier(.16,1,.3,1)" });
      }
      const say = $("#plAnnounce");
      if (say) say.textContent = `${T.label(shown)} page`;
      refreshAll(); // the page shows what's here at once, then anything teammates changed since
    });
    main.addEventListener("click", (e) => {
      if (e.target.closest("[data-nav-toggle]")) { setNav(!navOpen()); return; }
      const edit = e.target.closest("[data-pl-edit]");
      if (edit) { openDetails(edit); return; }
      if (e.target.closest("#plToolbar [data-mf-edit]")) { MF.setEditing(!MF.isEditing()); renderToolbar(); const b = $("#plToolbar [data-mf-edit]"); if (b) b.focus({ preventScroll: true }); return; }
      if (e.target.closest("#plToolbar [data-mf-add]")) { MF.openGallery(e.target.closest("[data-mf-add]")); return; }
      if (e.target.closest("#plToolbar [data-doc-new]")) { DOCS.create(ctx(), e.target.closest("[data-doc-new]")); return; }
      const pin = e.target.closest("[data-pl-pin]");
      if (pin) {
        const u = S.togglePin(pid);
        if (u) toast(u.pinned ? `“${u.name}” is pinned to your homepage` : `“${u.name}” unpinned`, { icon: "pin" });
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || Mori.modal.isOpen() || !$("#plShell")) return;
      if (isNarrow() && navOpen()) { setNav(false); return; }
      if (MF.isEditing() && !document.querySelector(".wg-pop")) { MF.setEditing(false); renderToolbar(); } // Escape finishes editing
    });
    window.matchMedia(DRAWER).addEventListener("change", () => {
      const shell = $("#plShell");
      if (!shell) return;
      shell.classList.remove("is-open");
      $(".pl-scrim", shell).hidden = true;
      document.body.classList.remove("is-locked");
      const hidden = S.settings().projectSidebar === false;
      shell.classList.toggle("is-collapsed", !!hidden);
      $(".pl-burger", shell).setAttribute("aria-expanded", String(!isNarrow() && !hidden));
    });
    const view = $("#plView");
    T.bind(view, ctx);
    DOCS.bind(view, ctx);
    view._afterDrag = () => { if (pendingView) renderView(); };
    view.addEventListener("focusout", () => setTimeout(() => { if (pendingView && !view.contains(document.activeElement)) renderView(); }, 0));
    K.bindTeam(main, project, {
      onAdded: () => renderAll(),
      beforeLeave: (p) => { leaving = !!p; },
      onLeft: (p) => Mori.ui.go("projects.html", "You left the project", `You’re no longer on “${p.name}”.`),
    });
  }

  /* ---------- Project details ---------- */
  function openDetails(opener) {
    const p = project();
    if (!p) return;
    const chosen = new Set(p.tags);
    const root = createModal("detailsModal", { label: "Project details", panelCls: "modal--new" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "pdtTitle");
    panel.innerHTML = `
      <div class="modal-head">
        <div><h2 id="pdtTitle">Project details</h2><p class="meta">Everyone on the team sees these.</p></div>
        <button class="icon-btn modal-x" data-close aria-label="Close">${icon("x")}</button>
      </div>
      <form class="modal-body np-form" id="pdtForm" novalidate>
        <label class="field"><span>Project name</span><input class="input" name="name" maxlength="60" value="${esc(p.name)}" required autofocus></label>
        <label class="field"><span>Current focus <em class="hint">optional</em></span><input class="input" name="focus" maxlength="80" value="${esc(p.focus)}" placeholder="e.g. Interview 10 warung owners"></label>
        ${K.tagFieldHTML(chosen)}
        ${p.owner ? `
        <div class="field pl-danger">
          <span>Delete project</span>
          <p class="meta">Removes the project, its tasks, tools and documents for everyone on the team. This can’t be undone.</p>
          <div><button class="btn btn--danger btn--sm" type="button" id="pdtDelete">${icon("trash")} Delete project</button></div>
        </div>` : ""}
      </form>
      <div class="modal-foot">
        <button class="btn" type="button" data-close>Cancel</button>
        <button class="btn btn--ink" type="button" id="pdtSave">${icon("check")} Save</button>
      </div>`;
    const form = $("#pdtForm", panel);
    K.bindTagField(form, chosen);
    const save = () => {
      const name = form.elements.name.value.trim();
      if (!name) { form.elements.name.classList.remove("is-invalid"); void form.elements.name.offsetWidth; form.elements.name.classList.add("is-invalid"); form.elements.name.focus(); return; }
      const { saved } = S.updateProject(pid, { name, focus: form.elements.focus.value, tags: chosen.size ? Array.from(chosen) : ["Idea"] });
      Mori.modal.close();
      saved.then(() => toast("Project details saved", { icon: "check" }), failed);
    };
    form.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.name) { e.preventDefault(); save(); } });
    form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
    form.elements.name.addEventListener("input", () => form.elements.name.classList.remove("is-invalid"));
    $("#pdtSave", panel).addEventListener("click", save);
    const del = $("#pdtDelete", panel);
    if (del) del.addEventListener("click", () => {
      if (!Mori.people.confirmTap(del, "Tap again to delete for everyone")) return;
      Mori.people.busy(del, () => {
        leaving = true;
        return S.deleteProject(pid).catch((err) => { leaving = false; throw err; });
      }, () => { Mori.modal.close({ restoreFocus: false }); Mori.ui.go("projects.html", "Project deleted", `“${p.name}” and everything in it are gone.`); });
    });
    Mori.modal.open("detailsModal", { opener });
  }

  /* ---------- Data ---------- */
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (["projectsRemote", "projectsCreated", "projectOverrides", "network", "profile"].includes(key)) renderAll();
    else if (key === "settings" && built && !isNarrow()) {
      // Tools sidebar switched in Settings, or on another device
      const shell = $("#plShell");
      const show = S.settings().projectSidebar !== false;
      if (shell && shell.classList.contains("is-collapsed") === show) { shell.classList.toggle("is-collapsed", !show); $(".pl-burger", shell).setAttribute("aria-expanded", String(show)); }
    }
    else if (key === "workspace" && built) { const p = project(); if (p) { renderSummary(p); renderToolbar(); viewSoon(); } }
    else if (key === "docs" && built && (section() === "docs" || section() === "mainframe")) { const p = project(); if (p) setTitle(p); viewSoon(); }
  });
  // Teammates' changes: check again when the page comes back into view, and every 20 s.
  const refreshAll = () => {
    if (document.hidden || !N.available()) return;
    S.refreshProjects().catch(() => {});
    W.load(pid).catch(() => {});
    W.docs.refresh(pid).catch(() => {});
  };
  document.addEventListener("visibilitychange", refreshAll);
  window.addEventListener("focus", refreshAll);
  setInterval(refreshAll, 20000);

  renderAll();
  const ready = N.available()
    ? Promise.all([
        S.refreshProjects().catch((err) => { // shares the load the shell started
          if (err && err.code === "signed-out") Mori.people.signInAgain(err.message);
          else if (!project()) toast("Couldn’t load this project: " + err.message, { icon: "x" });
        }),
        W.load(pid).catch(() => {}),
        W.docs.refresh(pid).catch(() => {}),
      ])
    : Promise.resolve();
  ready.then(() => { loaded = true; renderAll(); });
})();
