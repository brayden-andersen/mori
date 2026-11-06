/* ==========================================================================
   Mori: Sandbox — Projects page
   --------------------------------------------------------------------------
   Search / tag filters / sort / pagination from the draft, plus:
   • a project drawer (sprint milestones, milestone ladder, team)
   • "New Project" → declare a project, saved for this member
   • deep links: projects.html?open=p1 and projects.html?new=1
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, humanizeDays, toast, soon, createModal } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const HUES = ["orange", "blue", "emerald", "teal", "purple", "gray"];
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
  let highlightId = null;

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
    const chips = (p.tags || []).map((t, i) => `<span class="badge badge--${HUES[i % HUES.length]}">${esc(t)}</span>`).join("");
    return `
      <article class="pcard spotlight ${p.id === highlightId ? "is-new" : ""}" data-open="${esc(p.id)}">
        <h4>${esc(p.name)}</h4>
        <div class="meta">Last update: ${humanizeDays(p.updated_days)} • ${esc(p.focus)}</div>
        <div class="tags" style="margin-top:12px">${chips}</div>
        <div class="rung-row">${Mori.shell.ladderBar(p.rung)}<span class="meta">Rung ${p.rung} · ${esc(D.ladder[p.rung].stage)}</span></div>
        <div class="pcard-actions">
          <button class="btn" type="button" data-settings="${esc(p.id)}">Settings</button>
          <button class="btn" type="button" data-open="${esc(p.id)}">Open</button>
        </div>
      </article>`;
  }

  function render() {
    const filtered = applyFilters(S.projects());
    countMeta.textContent = `${filtered.length} project${filtered.length === 1 ? "" : "s"} • viewing ${PAGE_SIZE} per page`;

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

  // The whole card is clickable for pointer users; keyboard users get the "Open" button.
  grid.addEventListener("click", (e) => {
    if (e.target.closest("[data-settings]")) { soon("Project settings"); return; }
    const open = e.target.closest("[data-open]");
    if (open) openProject(open.dataset.open, open.closest("button") || open.querySelector("button[data-open]") || open);
  });

  /* ---------- Project drawer ---------- */
  const hint = (p) => (p.progress === 100 ? "Ready to post proof for the next rung." : `${p.milestones.length - p.doneCount} to go this sprint.`);

  function setOpenParam(id) {
    const u = new URL(location.href);
    if (id) u.searchParams.set("open", id); else u.searchParams.delete("open");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }

  function burst(el) {
    if (!el || !el.animate || Mori.motion.reduced()) return;
    const r = el.getBoundingClientRect();
    const colors = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f472b6", "#facc15"];
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span");
      s.className = "confetti";
      s.style.left = r.left + r.width / 2 + "px";
      s.style.top = r.top + r.height / 2 + "px";
      s.style.background = colors[i % colors.length];
      document.body.appendChild(s);
      const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
      const d = 60 + Math.random() * 70;
      s.animate(
        [
          { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.4) rotate(${Math.round(Math.random() * 360)}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.16,1,.3,1)" }
      ).onfinish = () => s.remove();
    }
  }

  function drawerHTML(p) {
    const now = D.ladder[p.rung];
    const next = D.ladder[Math.min(p.rung + 1, 5)];
    const team = (p.team || []).map(S.person).filter(Boolean);
    const chips = p.tags.map((t, i) => `<span class="chip chip--${HUES[i % HUES.length]}">${esc(t)}</span>`).join("");
    return `
      <button class="icon-btn modal-x" data-close aria-label="Close project">${icon("x")}</button>
      <div class="pd-head">
        <div class="chips">${chips}</div>
        <h2 id="pdTitle">${esc(p.name)}</h2>
        <p class="meta">Last update: ${humanizeDays(p.updated_days)} • ${esc(p.focus)}</p>
      </div>

      <section class="pd-sec">
        <div class="pd-progress">
          <div class="progress-wrapper"><div class="progress-circle" id="pdRing" data-percent="${p.progress}"><div class="progress-inner"></div><div class="progress-label">0%</div></div></div>
          <div>
            <b class="pd-big" id="pdDone">${p.doneCount} of ${p.milestones.length}</b>
            <div class="meta">sprint milestones done</div>
            <div class="pd-hint" id="pdHint">${esc(hint(p))}</div>
          </div>
        </div>
      </section>

      <section class="pd-sec pd-ladder">
        <h3>Milestone ladder <span>Rung ${p.rung} of 5</span></h3>
        ${Mori.shell.ladderBar(p.rung)}
        <div class="ladder-labels" aria-hidden="true">${D.ladder.map((r) => `<span class="${r.rung === p.rung ? "is-now" : ""}">${r.rung}</span>`).join("")}</div>
        <p class="pd-now"><b>Now:</b> ${esc(now.stage)}</p>
        ${p.rung < 5
          ? `<div class="pd-next"><b>Next: Rung ${next.rung} · ${esc(next.stage)}</b><br>${esc(next.proof)} <span class="meta">(${esc(next.time)})</span></div>`
          : `<div class="pd-next"><b>Top rung reached.</b> Eligible for leaderboards and showcases.</div>`}
      </section>

      <section class="pd-sec">
        <h3>This sprint <span id="pdCount">${p.doneCount}/${p.milestones.length}</span></h3>
        <ul class="ms-list">
          ${p.milestones.map((m, i) => `<li><label class="ms"><input type="checkbox" data-ms="${i}" ${m.done ? "checked" : ""}><span class="ms-box">${icon("check")}</span><span class="ms-text">${esc(m.text)}</span></label></li>`).join("")}
        </ul>
      </section>

      <section class="pd-sec">
        <h3>Team <span>${team.length ? `${team.length} member${team.length === 1 ? "" : "s"}` : "Just you"}</span></h3>
        ${team.length
          ? `<div class="team">${team.map((t) => `<div class="team-row">${avatar(t, 36)}<div><b>${esc(t.name)}</b><span class="meta">${esc(t.title)}</span></div><a class="btn btn--sm btn--ghost" href="network.html#messages/${esc(t.id)}">${icon("message")} Message</a></div>`).join("")}</div>`
          : `<p class="meta">Invite specialists from the Network to join this project.</p>`}
      </section>

      <div class="pd-actions">
        <a class="btn btn--ink" href="network.html#explore">${icon("userPlus")} Find specialists</a>
        <button class="btn" type="button" data-pd-settings>${icon("sliders")} Project settings</button>
      </div>`;
  }

  function openProject(id, opener) {
    const p = S.project(id);
    if (!p) { toast("That project couldn’t be found", { icon: "x" }); setOpenParam(null); return; }
    const root = createModal("projectDrawer", { label: "Project details", cls: "modal-root--drawer", panelCls: "modal--drawer" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "pdTitle");
    panel.innerHTML = drawerHTML(p);
    panel.scrollTop = 0;

    $$("[data-ms]", panel).forEach((cb) =>
      cb.addEventListener("change", () => {
        const u = S.toggleMilestone(p.id, Number(cb.dataset.ms));
        if (!u) return;
        Mori.motion.setRing($("#pdRing", panel), u.progress);
        $("#pdDone", panel).textContent = `${u.doneCount} of ${u.milestones.length}`;
        $("#pdCount", panel).textContent = `${u.doneCount}/${u.milestones.length}`;
        $("#pdHint", panel).textContent = hint(u);
        if (u.progress === 100 && cb.checked) {
          burst($("#pdRing", panel));
          toast("Sprint milestones complete. Time to post your proof!", { icon: "award" });
        }
      })
    );
    $("[data-pd-settings]", panel).addEventListener("click", () => soon("Project settings"));
    Mori.motion.refresh(panel);

    Mori.modal.open("projectDrawer", {
      opener,
      onClose: () => { setOpenParam(null); render(); },
    });
    setOpenParam(id);
  }

  /* ---------- Declare a new project ---------- */
  function openNewProject(opener) {
    const root = createModal("newProjectModal", { label: "Declare a new project", panelCls: "modal--new" });
    const panel = $(".modal", root);
    const chosen = new Set();
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
        <div class="field">
          <span>Tags</span>
          <div class="filters" id="npTags">${S.allTags().map((t) => `<button type="button" class="fchip" data-np-tag="${esc(t)}" data-active="false">${esc(t)}</button>`).join("")}</div>
          <div class="np-addtag"><input class="input" id="npNewTag" maxlength="20" placeholder="Add your own tag and press Enter" aria-label="Add a tag"></div>
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
    $("#npTags", panel).addEventListener("click", (e) => {
      const b = e.target.closest("[data-np-tag]");
      if (!b) return;
      const t = b.dataset.npTag;
      if (chosen.has(t)) chosen.delete(t); else chosen.add(t);
      b.dataset.active = String(chosen.has(t));
    });

    const create = () => {
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
      const id = S.createProject({ name, focus: form.elements.focus.value, tags: Array.from(chosen), rung });
      Mori.modal.close({ restoreFocus: false });
      q.value = "";
      activeTags.clear();
      sortBy.value = "updated_desc";
      currentPage = 1;
      highlightId = id;
      buildChips();
      render();
      highlightId = null;
      toast(`“${name}” declared`, { icon: "check" });
      setTimeout(() => {
        const card = grid.querySelector(`.pcard[data-open="${CSS.escape(id)}"]`);
        if (card) card.scrollIntoView({ behavior: Mori.motion.reduced() ? "auto" : "smooth", block: "center" });
      }, 120);
    };

    $("#npNewTag", panel).addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const t = e.target.value.trim().replace(/\s+/g, " ").slice(0, 20);
      if (!t) return;
      chosen.add(t);
      const existing = panel.querySelector(`[data-np-tag="${CSS.escape(t)}"]`);
      if (existing) existing.dataset.active = "true";
      else $("#npTags", panel).insertAdjacentHTML("beforeend", `<button type="button" class="fchip enter" data-np-tag="${esc(t)}" data-active="true">${esc(t)}</button>`);
      e.target.value = "";
    });
    form.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.name && e.target.id !== "npNewTag") { e.preventDefault(); create(); } });
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

  /* ---------- Boot ---------- */
  buildChips();
  render();
  const params = new URLSearchParams(location.search);
  if (params.get("open")) setTimeout(() => openProject(params.get("open")), 250);
  else if (params.get("new")) setTimeout(() => openNewProject($("#newProjectBtn")), 250);
})();
