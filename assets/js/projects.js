/* ==========================================================================
   Mori: Sandbox — Projects page
   --------------------------------------------------------------------------
   Search / tag filters / sort / pagination from the draft, plus:
   • a project preview (its board at a glance, milestone ladder, team);
     the preview opens the full project planner (project.html?id=<id>)
   • "New Project" → declare a project; founders can add people from their
     connections, and everyone on the team sees the project
   • deep links: projects.html?open=<id> and projects.html?new=1
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
  const { first, teamOf } = K;
  const PAGE_SIZE = 6;

  const grid = $("#grid");
  const empty = $("#empty");
  const pager = $("#pager");
  const pagesEl = $("#pages");
  const countMeta = $("#countMeta");
  const q = $("#q");
  const sortBy = $("#sortBy");
  const filterChips = $("#filterChips");

  const activeTags = new Set();
  let currentPage = 1;
  // Google members' projects come from Supabase: wait for the first load before saying "none yet".
  let loaded = !N.available() || S.projects().length > 0;

  /* ---------- Filters ---------- */
  function buildChips() {
    filterChips.innerHTML = S.allTags()
      .map((t) => `<button class="fchip" type="button" data-tag="${esc(t)}" data-active="${activeTags.has(t)}">${esc(t)}</button>`)
      .join("");
  }
  filterChips.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-tag]");
    if (!chip) return;
    const tag = chip.dataset.tag;
    if (activeTags.has(tag)) activeTags.delete(tag); else activeTags.add(tag);
    chip.dataset.active = String(activeTags.has(tag));
    currentPage = 1;
    render();
  });
  $("#clearFilters").addEventListener("click", () => {
    q.value = "";
    activeTags.clear();
    $$(".fchip", filterChips).forEach((c) => { c.dataset.active = "false"; });
    sortBy.value = "updated_desc";
    currentPage = 1;
    render();
  });
  q.addEventListener("input", () => { currentPage = 1; render(); });
  sortBy.addEventListener("change", () => { currentPage = 1; render(); });

  function applyFilters(data) {
    const term = q.value.trim().toLowerCase();
    const out = data.filter((p) => {
      const matchesTerm = !term || [p.name, p.focus, ...(p.tags || [])].join(" ").toLowerCase().includes(term);
      const matchesTags = activeTags.size === 0 || (p.tags || []).some((t) => activeTags.has(t));
      return matchesTerm && matchesTags;
    });
    switch (sortBy.value) {
      case "updated_desc": out.sort((a, b) => a.updated_days - b.updated_days); break; // most recent first
      case "updated_asc":  out.sort((a, b) => b.updated_days - a.updated_days); break; // least recent first
      case "name_asc":     out.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name_desc":    out.sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return out;
  }

  /* ---------- Grid ---------- */
  function cardHTML(p) {
    const chips = K.tagChips(p.tags, "badge");
    const others = teamOf(p).filter((t) => !t.you);
    const owner = others.find((t) => t.role === "Owner");
    const teamLine = !p.owner && owner
      ? `Co-founder · ${esc(owner.person.name)}’s project`
      : others.length ? `With ${esc(others.slice(0, 2).map((t) => first(t.person.name)).join(" and "))}${others.length > 2 ? ` +${others.length - 2}` : ""}` : "";
    return `
      <article class="pcard spotlight" data-open="${esc(p.id)}">
        <h4><button class="pcard-open" type="button" data-open="${esc(p.id)}">${esc(p.name)}</button></h4>
        <div class="meta">Last update: ${humanizeDays(p.updated_days)} • ${esc(p.focus)}</div>
        <div class="tags" style="margin-top:12px">${chips}</div>
        <div class="rung-row">${Mori.shell.ladderBar(p.rung)}<span class="meta">Rung ${p.rung} · ${esc(D.ladder[p.rung].stage)}</span></div>
        ${teamLine ? `<div class="pcard-team">${avatarStack(others.map((t) => t.person), 24)}<span class="meta">${teamLine}</span></div>` : ""}
      </article>`;
  }

  function render() {
    const all = S.projects();
    const filtered = applyFilters(all);
    if (!all.length && !loaded) {
      countMeta.textContent = "Loading your projects…";
      grid.innerHTML = "";
      empty.hidden = true;
      pager.hidden = true;
      return;
    }
    countMeta.textContent = all.length
      ? `${filtered.length} project${filtered.length === 1 ? "" : "s"} • viewing ${PAGE_SIZE} per page`
      : "No projects yet";
    $("#emptyTitle").textContent = all.length ? "No projects match your filters." : "Declare your first project";
    $("#emptySub").textContent = all.length
      ? "Try clearing filters or creating a new project."
      : "Put your idea in a form a specialist can judge in two minutes, then plan it here with your team.";

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    grid.innerHTML = pageItems.map(cardHTML).join("");
    Mori.motion.enter(grid);
    empty.hidden = pageItems.length > 0;

    pager.hidden = filtered.length <= PAGE_SIZE;
    pagesEl.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pagebtn";
      b.textContent = i;
      if (i === currentPage) b.setAttribute("aria-current", "page");
      b.addEventListener("click", () => { currentPage = i; render(); });
      pagesEl.appendChild(b);
    }
    $("#prevPage").disabled = currentPage === 1;
    $("#nextPage").disabled = currentPage === totalPages;
  }
  $("#prevPage").addEventListener("click", () => { currentPage = Math.max(1, currentPage - 1); render(); });
  $("#nextPage").addEventListener("click", () => { currentPage += 1; render(); });

  // The whole card opens the preview; keyboard users reach it through the title button.
  grid.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) openProject(open.dataset.open, open.querySelector("button[data-open]") || open.closest("button") || open);
  });

  /* ---------- Project preview ---------- */
  function setOpenParam(id) {
    const u = new URL(location.href);
    if (id) u.searchParams.set("open", id); else u.searchParams.delete("open");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }

  /** The board at a glance: each column's count and first few tasks. */
  function boardPeek(p) {
    const c = K.counts(p);
    return ["todo", "doing", "done"].map((st) => {
      const ts = p.tasks.filter((t) => t.status === st);
      const lines = ts.slice(0, 3).map((t) => `<span class="pd-line">${esc(t.text)}</span>`).join("") + (ts.length > 3 ? `<span class="pd-more">+${ts.length - 3} more</span>` : "");
      return `<div class="pd-col pd-col--${st}"><span class="pd-col-h">${K.STATUS[st]}<b>${c[st]}</b></span>${lines || '<span class="pd-line is-empty">Nothing yet</span>'}</div>`;
    }).join("");
  }

  function drawerHTML(p) {
    const now = D.ladder[p.rung];
    const next = D.ladder[Math.min(p.rung + 1, 5)];
    const url = K.plannerUrl(p.id);
    return `
      <button class="icon-btn modal-x" data-close aria-label="Close project">${icon("x")}</button>
      <a class="pd-sheet spotlight" href="${url}" aria-label="Open the project planner for ${esc(p.name)}">
        <div class="pd-head">
          <div class="chips">${K.tagChips(p.tags)}</div>
          <h2 id="pdTitle">${esc(p.name)}</h2>
          <p class="meta">Last update: ${humanizeDays(p.updated_days)} • ${esc(p.focus)}</p>
        </div>
        <div class="pd-board" id="pdBoard" aria-hidden="true">${boardPeek(p)}</div>
        <div class="pd-open-row">
          <span class="pd-bar" aria-hidden="true"><i id="pdBar" style="width:${p.progress}%"></i></span>
          <span class="meta" id="pdDone">${p.doneCount} of ${p.tasks.length} tasks done</span>
          <span class="pd-go">Open planner ${icon("arrowRight")}</span>
        </div>
      </a>

      <section class="pd-sec pd-ladder">
        <h3>Milestone ladder <span>Rung ${p.rung} of 5</span></h3>
        ${Mori.shell.ladderBar(p.rung)}
        <div class="ladder-labels" aria-hidden="true">${D.ladder.map((r) => `<span class="${r.rung === p.rung ? "is-now" : ""}">${r.rung}</span>`).join("")}</div>
        <p class="pd-now"><b>Now:</b> ${esc(now.stage)}</p>
        ${p.rung < 5
          ? `<div class="pd-next"><b>Next: Rung ${next.rung} · ${esc(next.stage)}</b><br>${esc(next.proof)}</div>`
          : `<div class="pd-next"><b>Top rung reached.</b> Sessions with vetted mentors and investors open here once they’re available.</div>`}
      </section>

      <section class="pd-sec" id="pdTeam">${K.teamHTML(p)}</section>

      <div class="pd-actions">
        <a class="btn btn--ink" href="${url}">${icon("layers")} Open project planner</a>
        <a class="btn" href="network.html#explore">${icon("userPlus")} Find specialists</a>
        <button class="btn" type="button" data-pd-pin aria-pressed="${p.pinned}">${icon("pin")} <span>${p.pinned ? "Unpin from home" : "Pin to home"}</span></button>
      </div>`;
  }

  let openId = null;
  function openProject(id, opener) {
    const p = S.project(id);
    if (!p) { toast("That project couldn’t be found", { icon: "x" }); setOpenParam(null); return; }
    const root = createModal("projectDrawer", { label: "Project details", cls: "modal-root--drawer", panelCls: "modal--drawer" });
    const panel = $(".modal", root);
    if (!panel.dataset.bound) {
      panel.dataset.bound = "1";
      K.bindTeam(panel, () => S.project(openId), {
        onAdded: (ids, added) => openProject(added.id), // the Add window replaced the preview: bring it back
        onLeft: (left) => { Mori.modal.close(); toast(`You left “${left.name}”`, { icon: "x" }); },
      });
      panel.addEventListener("click", (e) => {
        const pin = e.target.closest("[data-pd-pin]");
        if (!pin) return;
        const u = S.togglePin(openId);
        if (!u) return;
        pin.setAttribute("aria-pressed", String(u.pinned));
        pin.querySelector("span").textContent = u.pinned ? "Unpin from home" : "Pin to home";
        toast(u.pinned ? `“${u.name}” is pinned to your homepage` : `“${u.name}” unpinned`, { icon: "pin" });
      });
    }
    panel.setAttribute("aria-labelledby", "pdTitle");
    panel.innerHTML = drawerHTML(p);
    panel.scrollTop = 0;
    openId = id;
    Mori.motion.refresh(panel);

    Mori.modal.open("projectDrawer", {
      opener,
      onClose: () => { openId = null; setOpenParam(null); render(); },
    });
    setOpenParam(id);
  }
  /** Keep the open preview's board, progress and team in step with new data. */
  function refreshDrawer() {
    if (!openId || !Mori.modal.isOpen("projectDrawer")) return;
    const p = S.project(openId);
    const panel = $("#projectDrawer .modal");
    if (!p) { Mori.modal.close(); toast("You’re no longer on that project", { icon: "x" }); return; }
    $("#pdBoard", panel).innerHTML = boardPeek(p);
    $("#pdBar", panel).style.width = p.progress + "%";
    $("#pdDone", panel).textContent = `${p.doneCount} of ${p.tasks.length} tasks done`;
    $("#pdTeam", panel).innerHTML = K.teamHTML(p);
  }

  /* ---------- Declare a new project ---------- */

  function openNewProject(opener) {
    const root = createModal("newProjectModal", { label: "Declare a new project", panelCls: "modal--new" });
    const panel = $(".modal", root);
    const chosen = new Set();
    const cofounders = new Set();
    const offerPicker = N.available() && S.profile().role === "founder" && N.connections().length > 0;
    let rung = 0;
    panel.setAttribute("aria-labelledby", "npTitle");
    panel.innerHTML = `
      <div class="modal-head">
        <div><h2 id="npTitle">Declare a new project</h2><p class="meta">Put your idea in a form a specialist can judge in two minutes.</p></div>
        <button class="icon-btn modal-x" data-close aria-label="Close">${icon("x")}</button>
      </div>
      <form class="modal-body np-form" id="npForm" novalidate>
        <label class="field"><span>Project name</span><input class="input" name="name" maxlength="60" placeholder="e.g. Warung Pay" required autofocus></label>
        <label class="field"><span>Current focus <em class="hint">optional</em></span><input class="input" name="focus" maxlength="80" placeholder="e.g. Interview 10 warung owners"></label>
        ${K.tagFieldHTML(chosen)}
        <div class="field np-cofounders">
          <span>Team <em class="hint">optional · from your connections</em></span>
          ${offerPicker ? K.pickerHTML() : `<p class="meta np-co-note">${K.noPickerNote()}</p>`}
        </div>
        <div class="field">
          <span>Where are you on the milestone ladder?</span>
          <div class="np-rungs" role="radiogroup" aria-label="Starting rung">
            ${D.ladder.map((r) => `<button type="button" class="np-rung" role="radio" data-np-rung="${r.rung}" aria-checked="${r.rung === 0}" title="${esc(r.stage)}">${r.rung}</button>`).join("")}
          </div>
          <p class="np-rung-desc" id="npRungDesc"></p>
        </div>
      </form>
      <div class="modal-foot">
        <button class="btn" type="button" data-close>Cancel</button>
        <button class="btn btn--ink" type="button" id="npCreate">${icon("plus")} Create project</button>
      </div>`;

    const form = $("#npForm", panel);
    if (offerPicker) K.bindPicker($(".np-cofounders", panel), cofounders);
    const describe = () => {
      const r = D.ladder[rung];
      $("#npRungDesc", panel).innerHTML = `<b>Rung ${r.rung} · ${esc(r.stage)}.</b> ${esc(r.proof)}`;
    };
    describe();
    $$("[data-np-rung]", panel).forEach((b) =>
      b.addEventListener("click", () => {
        rung = Number(b.dataset.npRung);
        $$("[data-np-rung]", panel).forEach((x) => x.setAttribute("aria-checked", String(x === b)));
        describe();
      })
    );
    K.bindTagField(form, chosen);

    // A new project opens straight on its Mainframe; the planner shows the note once it's there.
    const created = (id, name, note, first) => {
      try { sessionStorage.setItem("mori.created", JSON.stringify({ id, note, first: !!first })); } catch (e) {}
      Mori.modal.close({ restoreFocus: false });
      Mori.ui.go("project.html?id=" + encodeURIComponent(id) + "#mainframe", name, "Opening the Mainframe");
    };
    const create = async () => {
      const nameInput = form.elements.name;
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.classList.remove("is-invalid");
        void nameInput.offsetWidth;
        nameInput.classList.add("is-invalid");
        nameInput.focus();
        toast("Give your project a name", { icon: "edit" });
        return;
      }
      const btn = $("#npCreate", panel);
      if (btn.disabled) return;
      btn.disabled = true;
      const first = !S.projects().some((p) => p.owner); // your first project gets a short tour of the planner
      try {
        const id = await S.createProject({ name, focus: form.elements.focus.value, tags: Array.from(chosen), rung, cofounders: Array.from(cofounders) });
        created(id, name, { text: cofounders.size ? `“${name}” declared with ${cofounders.size} ${cofounders.size === 1 ? "person" : "people"} on the team` : `“${name}” declared`, icon: "check" }, first);
      } catch (err) {
        btn.disabled = false;
        if (err.projectId) { created(err.projectId, name, { text: err.message, icon: "x", duration: 5000 }, first); return; }
        Mori.people.fail(err);
      }
    };

    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.name) { e.preventDefault(); create(); }
      if (e.key === "Enter" && e.target.matches("[data-co-q]")) e.preventDefault();
    });
    form.addEventListener("submit", (e) => { e.preventDefault(); create(); });
    $("#npCreate", panel).addEventListener("click", create);
    form.elements.name.addEventListener("input", () => form.elements.name.classList.remove("is-invalid"));

    Mori.modal.open("newProjectModal", { opener, onClose: () => setNewParam(false) });
  }
  function setNewParam(on) {
    const u = new URL(location.href);
    if (on) u.searchParams.set("new", "1"); else u.searchParams.delete("new");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }

  $("#newProjectBtn").addEventListener("click", (e) => openNewProject(e.currentTarget));
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-new-project]"); if (b) openNewProject(b); });

  // Projects shared with you, co-founders' changes and team names arrive in the background.
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (!["projectsRemote", "projectsCreated", "projectOverrides", "network"].includes(key)) return;
    if (key !== "projectOverrides" && !Mori.modal.isOpen("newProjectModal")) { buildChips(); render(); }
    refreshDrawer();
  });

  /* ---------- Boot ---------- */
  buildChips();
  render();
  const params = new URLSearchParams(location.search);
  const ready = N.available() ? S.refreshProjects().catch((err) => { if (err && err.code === "signed-out") Mori.people.signInAgain(err.message); else toast("Couldn’t load your projects: " + err.message, { icon: "x" }); }) : Promise.resolve();
  ready.then(() => {
    loaded = true;
    render();
    if (params.get("open")) openProject(params.get("open"));
    else if (params.get("new")) openNewProject($("#newProjectBtn"));
  });
})();
