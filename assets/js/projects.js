/* ==========================================================================
   Mori: Sandbox — Projects page
   --------------------------------------------------------------------------
   Search / tag filters / sort / pagination from the draft, plus:
   • a project drawer (sprint milestones, milestone ladder, team)
   • "New Project" → declare a project; founders can add co-founders from
     their connections, and co-founders see the project too
   • deep links: projects.html?open=<id> and projects.html?new=1
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, avatarStack, humanizeDays, toast, soon, createModal } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const N = S.network;
  const HUES = ["orange", "blue", "emerald", "teal", "purple", "gray"];
  const PAGE_SIZE = 6;
  const first = (name) => String(name || "").split(/\s+/)[0];

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
  // Google members' projects come from Supabase: wait for the first load before saying "none yet".
  let loaded = !N.available() || S.projects().length > 0;

  /** People on a project (owner first), each with a label. You appear as "You". */
  function teamOf(p) {
    const meId = S.session().id;
    return [p.ownerId].concat(p.cofounders || []).map((id) => {
      const person = id === meId ? S.me() : N.member(id);
      return person ? { id, person, you: id === meId, role: id === p.ownerId ? "Owner" : "Co-founder" } : null;
    }).filter(Boolean);
  }
  const canAddCofounders = (p) => p.owner && N.available() && S.profile().role === "founder";

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
    const others = teamOf(p).filter((t) => !t.you);
    const owner = others.find((t) => t.role === "Owner");
    const teamLine = !p.owner && owner
      ? `Co-founder · ${esc(owner.person.name)}’s project`
      : others.length ? `With ${esc(others.slice(0, 2).map((t) => first(t.person.name)).join(" and "))}${others.length > 2 ? ` +${others.length - 2}` : ""}` : "";
    return `
      <article class="pcard spotlight ${p.id === highlightId ? "is-new" : ""}" data-open="${esc(p.id)}">
        <h4>${esc(p.name)}</h4>
        <div class="meta">Last update: ${humanizeDays(p.updated_days)} • ${esc(p.focus)}</div>
        <div class="tags" style="margin-top:12px">${chips}</div>
        <div class="rung-row">${Mori.shell.ladderBar(p.rung)}<span class="meta">Rung ${p.rung} · ${esc(D.ladder[p.rung].stage)}</span></div>
        ${teamLine ? `<div class="pcard-team">${avatarStack(others.map((t) => t.person), 24)}<span class="meta">${teamLine}</span></div>` : ""}
        <div class="pcard-actions">
          <button class="btn" type="button" data-settings="${esc(p.id)}">Settings</button>
          <button class="btn" type="button" data-open="${esc(p.id)}">Open</button>
        </div>
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
      : "Put your idea in a form a specialist can judge in two minutes, then track its sprint milestones here.";

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

  /* ---------- Co-founder picker (your connections, as a searchable checklist) ---------- */
  function pickerHTML() {
    return `
      <div class="np-picked" data-co-picked></div>
      <label class="search search--sm" aria-label="Search your connections">${icon("search")}<input type="search" data-co-q placeholder="Search your connections" autocomplete="off"></label>
      <ul class="np-colist" data-co-list></ul>`;
  }
  /** Wire a picker inside `box`; `chosen` is a Set of member ids. */
  function bindPicker(box, chosen, exclude = []) {
    const qEl = $("[data-co-q]", box);
    const listEl = $("[data-co-list]", box);
    const pickedEl = $("[data-co-picked]", box);
    const pool = () => N.connections().filter((p) => !exclude.includes(p.id));
    const draw = () => {
      const term = qEl.value.trim().toLowerCase();
      const people = pool().filter((p) => !term || p.name.toLowerCase().includes(term));
      listEl.innerHTML = people.length
        ? people.map((p) => `<li><label class="co-opt"><input type="checkbox" value="${esc(p.id)}" ${chosen.has(p.id) ? "checked" : ""}><span class="ind-box">${icon("check")}</span>${avatar(p, 30)}<span class="co-copy"><b>${esc(p.name)}</b><span class="meta">${esc(p.headline || (D.roles[p.role] ? D.roles[p.role].label : ""))}</span></span></label></li>`).join("")
        : `<li class="ind-none">${pool().length ? `No connections match “${esc(qEl.value.trim())}”.` : "Everyone you’re connected with is already on this project."}</li>`;
      pickedEl.innerHTML = Array.from(chosen).map((id) => N.member(id)).filter(Boolean)
        .map((p) => `<span class="fpill">${avatar(p, 20)}${esc(first(p.name))}<button type="button" data-co-drop="${esc(p.id)}" aria-label="Remove ${esc(p.name)}">${icon("x")}</button></span>`).join("");
      pickedEl.hidden = !chosen.size;
    };
    qEl.addEventListener("input", draw);
    listEl.addEventListener("change", (e) => {
      const b = e.target.closest('input[type="checkbox"]');
      if (!b) return;
      if (b.checked) chosen.add(b.value); else chosen.delete(b.value);
      draw();
    });
    pickedEl.addEventListener("click", (e) => { const b = e.target.closest("[data-co-drop]"); if (b) { chosen.delete(b.dataset.coDrop); draw(); } });
    draw();
    return { draw };
  }
  /** What the co-founder field says when the picker can't be offered. */
  function noPickerNote() {
    if (!N.available()) return "Co-founders need a Google sign-in: demo projects stay on this device.";
    if (S.profile().role !== "founder") return "Only founders can add co-founders to their projects.";
    return `Connect with people in the <a class="link-btn" href="network.html#explore">Network</a> to add them as co-founders.`;
  }

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

  function teamHTML(p) {
    const team = teamOf(p);
    const rows = team.map((t) => {
      const actions = t.you
        ? (!p.owner ? `<button class="btn btn--sm btn--ghost" type="button" data-pd-leave>Leave project</button>` : "")
        : `${N.status(t.id) === "connected" ? `<button class="btn btn--sm btn--ghost" type="button" data-message="${esc(t.id)}">${icon("message")} Message</button>` : ""}<button class="btn btn--sm btn--ghost" type="button" data-view="${esc(t.id)}">${icon("user")} Profile</button>${p.owner && t.role === "Co-founder" ? `<button class="btn btn--sm btn--ghost" type="button" data-pd-drop="${esc(t.id)}">Remove</button>` : ""}`;
      return `<div class="team-row">${avatar(t.person, 36)}<div><b>${esc(t.you ? "You" : t.person.name)}</b><span class="meta">${t.role}${t.person.headline && !t.you ? " · " + esc(t.person.headline) : ""}</span></div><div class="team-actions">${actions}</div></div>`;
    }).join("");
    const add = canAddCofounders(p) && N.connections().some((c) => !team.some((t) => t.id === c.id))
      ? `<button class="btn btn--sm" type="button" data-pd-add>${icon("userPlus")} Add co-founders</button>`
      : "";
    return `
      <h3>Team <span>${team.length > 1 ? `${team.length} people` : "Just you"}</span></h3>
      <div class="team">${rows}</div>
      ${add ? `<div class="pd-team-add">${add}</div>` : team.length === 1 && p.owner ? `<p class="meta">${canAddCofounders(p) ? "Add co-founders from your connections." : noPickerNote()}</p>` : ""}`;
  }

  function drawerHTML(p) {
    const now = D.ladder[p.rung];
    const next = D.ladder[Math.min(p.rung + 1, 5)];
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

      <section class="pd-sec" id="pdTeam">${teamHTML(p)}</section>

      <div class="pd-actions">
        <a class="btn btn--ink" href="network.html#explore">${icon("userPlus")} Find specialists</a>
        <button class="btn" type="button" data-pd-pin aria-pressed="${p.pinned}">${icon("pin")} <span>${p.pinned ? "Unpin from home" : "Pin to home"}</span></button>
        <button class="btn" type="button" data-pd-settings>${icon("sliders")} Project settings</button>
      </div>`;
  }

  let openId = null;
  function paintProgress(panel, u) {
    Mori.motion.setRing($("#pdRing", panel), u.progress);
    $("#pdDone", panel).textContent = `${u.doneCount} of ${u.milestones.length}`;
    $("#pdCount", panel).textContent = `${u.doneCount}/${u.milestones.length}`;
    $("#pdHint", panel).textContent = hint(u);
    $$("[data-ms]", panel).forEach((cb, i) => { cb.checked = !!(u.milestones[i] && u.milestones[i].done); });
  }

  function openProject(id, opener) {
    const p = S.project(id);
    if (!p) { toast("That project couldn’t be found", { icon: "x" }); setOpenParam(null); return; }
    const root = createModal("projectDrawer", { label: "Project details", cls: "modal-root--drawer", panelCls: "modal--drawer" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "pdTitle");
    panel.innerHTML = drawerHTML(p);
    panel.scrollTop = 0;
    openId = id;

    $$("[data-ms]", panel).forEach((cb) =>
      cb.addEventListener("change", () => {
        const { project: u, saved } = S.toggleMilestone(p.id, Number(cb.dataset.ms));
        if (!u) return;
        paintProgress(panel, u);
        if (u.progress === 100 && cb.checked) {
          burst($("#pdRing", panel));
          toast("Sprint milestones complete. Time to post your proof!", { icon: "award" });
        }
        saved.catch((err) => {
          const back = S.project(p.id);
          if (back && openId === p.id) paintProgress(panel, back);
          Mori.people.fail(err.code === "signed-out" ? err : new Error("That change wasn’t saved: " + err.message));
        });
      })
    );
    panel.addEventListener("click", (e) => {
      if (e.target.closest("[data-pd-add]")) { openAddCofounders(S.project(p.id), e.target.closest("[data-pd-add]")); return; }
      const drop = e.target.closest("[data-pd-drop]");
      if (drop && Mori.people.confirmTap(drop, "Tap again")) {
        const who = N.member(drop.dataset.pdDrop);
        Mori.people.busy(drop, () => S.removeCofounder(p.id, drop.dataset.pdDrop), () => toast(`${who ? who.name : "They"} ${who ? "is" : "are"} no longer on this project`, { icon: "x" }));
        return;
      }
      const leave = e.target.closest("[data-pd-leave]");
      if (leave && Mori.people.confirmTap(leave, "Tap again to leave")) {
        Mori.people.busy(leave, () => S.removeCofounder(p.id, S.session().id), () => { Mori.modal.close(); toast(`You left “${p.name}”`, { icon: "x" }); });
      }
    });
    $("[data-pd-settings]", panel).addEventListener("click", () => soon("Project settings"));
    $("[data-pd-pin]", panel).addEventListener("click", (e) => {
      const u = S.togglePin(p.id);
      if (!u) return;
      const btn = e.currentTarget;
      btn.setAttribute("aria-pressed", String(u.pinned));
      btn.querySelector("span").textContent = u.pinned ? "Unpin from home" : "Pin to home";
      toast(u.pinned ? `“${u.name}” is pinned to your homepage` : `“${u.name}” unpinned`, { icon: "pin" });
    });
    Mori.motion.refresh(panel);

    Mori.modal.open("projectDrawer", {
      opener,
      onClose: () => { openId = null; setOpenParam(null); render(); },
    });
    setOpenParam(id);
  }
  /** Keep the open drawer's team and progress in step with new data. */
  function refreshDrawer() {
    if (!openId || !Mori.modal.isOpen("projectDrawer")) return;
    const p = S.project(openId);
    const panel = $("#projectDrawer .modal");
    if (!p) { Mori.modal.close(); toast("You’re no longer on that project", { icon: "x" }); return; }
    paintProgress(panel, p);
    $("#pdTeam", panel).innerHTML = teamHTML(p);
  }

  /* ---------- Add co-founders to an existing project ---------- */
  function openAddCofounders(p, opener) {
    if (!p) return;
    const chosen = new Set();
    const root = createModal("addCofoundersModal", { label: "Add co-founders", panelCls: "modal--new" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "acTitle");
    panel.innerHTML = `
      <div class="modal-head">
        <div><h2 id="acTitle">Add co-founders</h2><p class="meta">They’ll see “${esc(p.name)}” in their projects and can tick off milestones.</p></div>
        <button class="icon-btn modal-x" data-close aria-label="Close">${icon("x")}</button>
      </div>
      <div class="modal-body np-cofounders">${pickerHTML()}</div>
      <div class="modal-foot">
        <button class="btn" type="button" data-close>Cancel</button>
        <button class="btn btn--ink" type="button" id="acSave">${icon("userPlus")} Add to project</button>
      </div>`;
    bindPicker(panel, chosen, [p.ownerId].concat(p.cofounders));
    $("#acSave", panel).addEventListener("click", (e) => {
      if (!chosen.size) { toast("Pick at least one connection", { icon: "userPlus" }); return; }
      Mori.people.busy(e.currentTarget, () => S.addCofounders(p.id, Array.from(chosen)), (added) => {
        Mori.modal.close({ restoreFocus: false });
        toast(`Added ${added.length} co-founder${added.length === 1 ? "" : "s"}`, { icon: "check" });
        openProject(p.id);
      });
    });
    Mori.modal.open("addCofoundersModal", { opener });
  }

  /* ---------- Declare a new project ---------- */
  // Tags already in use, plus the member's own industries as suggestions.
  const tagChoices = () => Array.from(new Set(S.allTags().concat(S.profile().industries || []))).sort((a, b) => a.localeCompare(b));

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
        <div class="field">
          <span>Tags</span>
          <div class="filters" id="npTags">${tagChoices().map((t) => `<button type="button" class="fchip" data-np-tag="${esc(t)}" data-active="false">${esc(t)}</button>`).join("")}</div>
          <div class="np-addtag"><input class="input" id="npNewTag" maxlength="20" placeholder="Add your own tag and press Enter" aria-label="Add a tag"></div>
        </div>
        <div class="field np-cofounders">
          <span>Co-founders <em class="hint">optional · from your connections</em></span>
          ${offerPicker ? pickerHTML() : `<p class="meta np-co-note">${noPickerNote()}</p>`}
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
    if (offerPicker) bindPicker($(".np-cofounders", panel), cofounders);
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

    const created = (id, name) => {
      Mori.modal.close({ restoreFocus: false });
      q.value = "";
      activeTags.clear();
      sortBy.value = "updated_desc";
      currentPage = 1;
      highlightId = id;
      buildChips();
      render();
      highlightId = null;
      setTimeout(() => {
        const card = grid.querySelector(`.pcard[data-open="${CSS.escape(id)}"]`);
        if (card) card.scrollIntoView({ behavior: Mori.motion.reduced() ? "auto" : "smooth", block: "center" });
      }, 120);
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
      try {
        const id = await S.createProject({ name, focus: form.elements.focus.value, tags: Array.from(chosen), rung, cofounders: Array.from(cofounders) });
        created(id, name);
        toast(cofounders.size ? `“${name}” declared with ${cofounders.size} co-founder${cofounders.size === 1 ? "" : "s"}` : `“${name}” declared`, { icon: "check" });
      } catch (err) {
        btn.disabled = false;
        if (err.projectId) { created(err.projectId, name); toast(err.message, { icon: "x", duration: 5000 }); return; }
        Mori.people.fail(err);
      }
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
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.name && e.target.id !== "npNewTag" && !e.target.matches("[data-co-q]")) { e.preventDefault(); create(); }
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
  const ready = N.available() ? S.refreshProjects({ force: true }).catch((err) => { if (err && err.code === "signed-out") Mori.people.signInAgain(err.message); else toast("Couldn’t load your projects: " + err.message, { icon: "x" }); }) : Promise.resolve();
  ready.then(() => {
    loaded = true;
    render();
    if (params.get("open")) openProject(params.get("open"));
    else if (params.get("new")) openNewProject($("#newProjectBtn"));
  });
})();
