/* ==========================================================================
   Mori: Sandbox — project planner (project.html?id=<project id>)
   --------------------------------------------------------------------------
   A first draft of the full-screen planner that a project preview opens:
   • a board in three columns (To do, In progress, Done): add a task in any
     column, drag it to another, tick it off, or open it to change its text,
     who it's for, its due date and its column
   • progress, the project's rung on the milestone ladder, what's due next
     and the team (founders add people from their connections)
   • edit the name, focus and tags (the owner can delete the project)
   Everyone on the team can change tasks. Co-founders' changes arrive when
   the page comes back into view and every 20 seconds.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, avatarStack, humanizeDays, toast, createModal, seg } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const N = S.network;
  const K = Mori.projectKit;
  const COLS = ["todo", "doing", "done"];
  const HINTS = { todo: "Nothing to do yet. Add the first task below.", doing: "Drag a task here when someone starts on it.", done: "Finished tasks land here." };
  const EASE = "cubic-bezier(.16,1,.3,1)";

  const main = $("#planner");
  const pid = new URLSearchParams(location.search).get("id") || "";
  const project = () => S.project(pid);
  let loaded = !N.available() || !!project();
  let built = false;
  let dragId = null;      // the task being dragged
  let deferred = false;   // data changed mid-drag: render when it ends
  let leaving = false;    // deleting or leaving: the page is about to change

  const failed = (err) => Mori.people.fail(err && (err.code === "signed-out" || err.code === "too-many") ? err : new Error("That change wasn’t saved: " + ((err && err.message) || "please try again.")));
  const isoIn = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  /** Someone on the team, or null if they've left. */
  const memberOf = (p, id) => K.teamOf(p).find((m) => m.id === id) || null;

  /* ---------- Page frame (built once, then its parts are re-drawn) ---------- */
  const crumbs = (name) => `<nav class="crumbs" aria-label="Breadcrumb"><a href="home.html">Home</a> <span class="sep">/</span> <a href="projects.html">Projects</a>${name != null ? ` <span class="sep">/</span> <span id="crumbName">${esc(name)}</span>` : ""}</nav>`;
  function build() {
    built = true;
    main.removeAttribute("aria-busy");
    main.innerHTML = crumbs("") + `
      <header class="pl-head" id="plHead"></header>
      <section class="pl-summary" id="plSummary" aria-label="Progress"></section>
      <div class="pl-layout">
        <section class="pl-board" aria-label="Task board">
          ${COLS.map((st) => `
          <div class="pl-col pl-col--${st}" data-col="${st}">
            <header class="pl-col-head"><span class="pl-dot" aria-hidden="true"></span><h2>${K.STATUS[st]}</h2><span class="pl-count" data-count-of="${st}">0</span></header>
            <ol class="pl-list" data-list="${st}" aria-label="${K.STATUS[st]}"></ol>
            <form class="pl-add" data-add="${st}" autocomplete="off">
              <label class="sr-only" for="add-${st}">Add a task to ${K.STATUS[st]}</label>
              ${icon("plus", "ico pl-add-ico")}
              <input class="pl-add-input" id="add-${st}" name="text" maxlength="200" placeholder="Add a task" enterkeyhint="done">
            </form>
          </div>`).join("")}
        </section>
        <aside class="pl-side">
          <section class="pl-card" id="plStage" aria-label="Milestone ladder"></section>
          <section class="pl-card" id="plUpcoming" aria-label="Coming up"></section>
          <section class="pl-card" id="plTeam" aria-label="Team"></section>
        </aside>
      </div>`;
    if (!main.dataset.bound) { main.dataset.bound = "1"; bind(); }
  }

  function showMissing(wasOpen) {
    main.removeAttribute("aria-busy");
    main.innerHTML = crumbs(null) + `
      <div class="panel pl-missing">
        <div class="empty"><span class="empty-ico">${icon("projects")}</span>
          <div>This project isn’t available</div>
          <div class="meta">It may have been deleted, or you’re no longer on its team.</div>
          <div><a class="btn btn--ink" href="projects.html">Back to your projects</a></div>
        </div>
      </div>`;
    document.title = "SandBox • Project planner";
    if (wasOpen) toast("You’re no longer on that project", { icon: "x" });
  }

  function render() {
    if (leaving) return;
    const p = project();
    if (!p) {
      if (loaded) { const wasOpen = built; built = false; showMissing(wasOpen); }
      return;
    }
    if (dragId) { deferred = true; return; }
    if (!built) build();
    document.title = `SandBox • ${p.name}`;
    $("#crumbName").textContent = p.name;
    renderHead(p);
    renderSummary(p);
    renderBoard(p);
    renderStage(p);
    renderUpcoming(p);
    const open = {};
    p.tasks.forEach((t) => { if (t.assignee && !t.done) open[t.assignee] = (open[t.assignee] || 0) + 1; });
    $("#plTeam").innerHTML = K.teamHTML(p, { openTasks: open });
  }

  /* ---------- Header ---------- */
  function renderHead(p) {
    const team = K.teamOf(p);
    const owner = team.find((m) => m.role === "Owner");
    $("#plHead").innerHTML = `
      <div class="pl-head-main">
        <div class="chips">${K.tagChips(p.tags)}</div>
        <h1 class="title pl-title" id="plTitle">${esc(p.name)}</h1>
        <p class="pl-focus">${icon("target")}<span>${esc(p.focus || "No current focus yet")}</span></p>
        <p class="meta">Updated ${esc(humanizeDays(p.updated_days).toLowerCase())} · ${p.owner ? "You own this project" : owner ? `${esc(owner.person.name)}’s project` : "Shared with you"}</p>
      </div>
      <div class="pl-head-side">
        <button class="pl-team-peek" type="button" data-jump="plTeam" aria-label="Team: ${team.length === 1 ? "just you" : team.length + " people"}">${avatarStack(team.map((m) => m.person), 30)}<span>${team.length === 1 ? "Just you" : team.length + " people"}</span></button>
        <div class="pl-head-actions">
          <button class="btn" type="button" data-pl-edit>${icon("edit")} Edit details</button>
          <button class="btn" type="button" data-pl-pin aria-pressed="${p.pinned}">${icon("pin")} <span>${p.pinned ? "Pinned to home" : "Pin to home"}</span></button>
          ${K.canAddPeople(p) && K.addablePeople(p).length ? `<button class="btn btn--ink" type="button" data-pd-add>${icon("userPlus")} Add to team</button>` : ""}
        </div>
      </div>`;
  }

  /* ---------- Progress (updated in place, so the bar and the number glide) ---------- */
  let shownPct = null;
  function renderSummary(p) {
    const box = $("#plSummary");
    if (!box.firstElementChild) {
      shownPct = null;
      box.innerHTML = `
        <div class="pl-sum-main">
          <span class="pl-pct" id="plPct" data-suffix="%"></span>
          <div class="pl-sum-copy"><b id="plDoneLine"></b><span class="meta" id="plSub"></span></div>
        </div>
        <div class="pl-stack" id="plStack" role="img"><i class="is-done"></i><i class="is-doing"></i><i class="is-todo"></i></div>
        <div class="pl-sum-stats"><span class="pl-stat" id="plLate"><b></b> overdue</span><span class="pl-stat" id="plSoon"><b></b> due this week</span></div>`;
    }
    const c = K.counts(p);
    const today = K.todayISO();
    const week = isoIn(7);
    const late = p.tasks.filter((t) => !t.done && t.due && t.due < today).length;
    const soon = p.tasks.filter((t) => !t.done && t.due && t.due >= today && t.due <= week).length;
    $("#plDoneLine", box).textContent = `${p.doneCount} of ${p.tasks.length} task${p.tasks.length === 1 ? "" : "s"} done`;
    $("#plSub", box).textContent = !p.tasks.length ? "Add your first task to start planning."
      : p.progress === 100 ? "Everything’s done. Time to post proof for the next rung."
      : `${c.todo + c.doing} still open`;
    const stack = $("#plStack", box);
    stack.setAttribute("aria-label", `${c.done} done, ${c.doing} in progress, ${c.todo} to do`);
    const [d, g, t] = stack.children;
    d.style.flexGrow = c.done;
    g.style.flexGrow = c.doing;
    t.style.flexGrow = c.todo;
    $("#plLate b", box).textContent = late;
    $("#plLate", box).classList.toggle("is-late", late > 0);
    $("#plSoon b", box).textContent = soon;
    const pct = $("#plPct", box);
    if (shownPct == null) pct.textContent = p.progress + "%";
    else if (shownPct !== p.progress) { pct.dataset.from = shownPct; Mori.motion.animateCount(pct, p.progress); }
    shownPct = p.progress;
  }

  /* ---------- Board ---------- */
  function taskHTML(t, p) {
    const who = t.assignee ? memberOf(p, t.assignee) : null;
    const due = K.dueInfo(t.due, t.done);
    const label = [t.text, due && due.text, who && `for ${who.you ? "you" : who.person.name}`].filter(Boolean).join(" · ");
    return `
      <li class="task${t.done ? " is-done" : ""}" data-task="${esc(t.id)}" draggable="true">
        <label class="task-check" title="${t.done ? "Mark as not done" : "Mark as done"}"><input type="checkbox" data-task-done="${esc(t.id)}" ${t.done ? "checked" : ""}><span class="task-box">${icon("check")}</span><span class="sr-only">Done: ${esc(t.text)}</span></label>
        <button class="task-open" type="button" data-task-open="${esc(t.id)}" aria-label="Edit task: ${esc(label)}">
          <span class="task-text">${esc(t.text)}</span>
          ${due || who ? `<span class="task-meta">${due ? `<span class="task-due ${due.cls}">${icon("clock")}${esc(due.text)}</span>` : ""}${who ? `<span class="task-who" title="${esc(who.you ? "You" : who.person.name)}">${avatar(who.person, 22)}</span>` : ""}</span>` : ""}
        </button>
      </li>`;
  }

  /** Re-drawing replaces elements: keep keyboard focus on the same control. */
  function focusKey() {
    const a = document.activeElement;
    if (!a || !main.contains(a)) return null;
    for (const attr of ["data-task-done", "data-task-open"]) if (a.hasAttribute(attr)) return `[${attr}="${CSS.escape(a.getAttribute(attr))}"]`;
    return null;
  }

  function renderBoard(p) {
    const key = focusKey();
    const before = Mori.motion.reduced() ? null : new Map($$(".task[data-task]", main).map((el) => [el.dataset.task, el.getBoundingClientRect()]));
    COLS.forEach((st) => {
      const ts = p.tasks.filter((t) => t.status === st);
      $(`[data-list="${st}"]`, main).innerHTML = ts.map((t) => taskHTML(t, p)).join("") || `<li class="pl-empty">${HINTS[st]}</li>`;
      $(`[data-count-of="${st}"]`, main).textContent = ts.length;
    });
    const full = p.tasks.length >= S.MAX_TASKS;
    $$(".pl-add-input", main).forEach((i) => { i.placeholder = full ? `${S.MAX_TASKS} tasks is the limit for now` : "Add a task"; i.disabled = full; });
    if (key) { const el = $(key, main); if (el) el.focus({ preventScroll: true }); }
    if (!before) return;
    // Slide tasks from where they were to where they are now; new ones fade in.
    const fresh = before.size === 0;
    $$(".task[data-task]", main).forEach((el, i) => {
      const a = before.get(el.dataset.task);
      if (!a) {
        el.animate([{ opacity: 0, transform: "translateY(8px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: fresh ? i * 30 : 0, easing: EASE, fill: "backwards" });
        return;
      }
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 460, easing: EASE });
    });
  }

  /* ---------- Side: milestone ladder, coming up, team ---------- */
  function renderStage(p) {
    const now = D.ladder[p.rung];
    const next = D.ladder[Math.min(p.rung + 1, 5)];
    $("#plStage").innerHTML = `
      <h3>Milestone ladder <span>Rung ${p.rung} of 5</span></h3>
      ${Mori.shell.ladderBar(p.rung)}
      <div class="ladder-labels" aria-hidden="true">${D.ladder.map((r) => `<span class="${r.rung === p.rung ? "is-now" : ""}">${r.rung}</span>`).join("")}</div>
      <p class="pd-now"><b>Now:</b> ${esc(now.stage)}</p>
      ${p.rung < 5
        ? `<div class="pd-next"><b>Next: Rung ${next.rung} · ${esc(next.stage)}</b><br>${esc(next.proof)}</div>`
        : `<div class="pd-next"><b>Top rung reached.</b> Eligible for leaderboards and showcases.</div>`}
      <label class="pl-rung"><span>Stage</span><select class="select" data-pl-rung aria-label="Project stage">${D.ladder.map((r) => `<option value="${r.rung}" ${r.rung === p.rung ? "selected" : ""}>Rung ${r.rung} · ${esc(r.stage)}</option>`).join("")}</select></label>`;
  }

  function renderUpcoming(p) {
    const items = p.tasks.filter((t) => !t.done && t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
    const badge = (iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      return `<b>${d}</b><small>${new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short" })}</small>`;
    };
    $("#plUpcoming").innerHTML = `<h3>Coming up</h3>` + (items.length
      ? `<ul class="pl-up">${items.map((t) => {
          const due = K.dueInfo(t.due);
          const who = t.assignee ? memberOf(p, t.assignee) : null;
          return `<li><button class="pl-up-row" type="button" data-task-open="${esc(t.id)}"><span class="pl-up-date ${due.cls}">${badge(t.due)}</span><span class="pl-up-copy"><span class="pl-up-text">${esc(t.text)}</span><span class="meta">${esc(due.text)}${who ? ` · ${esc(who.you ? "You" : K.first(who.person.name))}` : ""}</span></span></button></li>`;
        }).join("")}</ul>`
      : `<p class="meta pl-up-none">Give tasks a due date and the next ones show up here.</p>`);
  }

  /* ---------- Changes ---------- */
  function toggleTask(id) {
    const was = project();
    const { project: u, saved } = S.toggleTask(pid, id);
    if (!u) return;
    saved.catch(failed);
    if (u.progress === 100 && was.progress < 100 && u.tasks.length > 1) {
      K.burst($(`[data-task-done="${CSS.escape(id)}"]`, main) || $("#plPct"));
      toast("Every task is done. Time to post proof for the next rung!", { icon: "award" });
    }
  }

  function bind() {
    // Add a task: type, then Enter.
    main.addEventListener("submit", (e) => {
      const form = e.target.closest("[data-add]");
      if (!form) return;
      e.preventDefault();
      const input = form.elements.text;
      const text = input.value.trim();
      if (!text) return;
      const { saved } = S.addTask(pid, text, { status: form.dataset.add, done: form.dataset.add === "done" });
      input.value = "";
      saved.catch((err) => { failed(err); if (!input.value) input.value = text; });
    });
    main.addEventListener("change", (e) => {
      const cb = e.target.closest("[data-task-done]");
      if (cb) { toggleTask(cb.dataset.taskDone); return; }
      const rung = e.target.closest("[data-pl-rung]");
      if (rung) {
        const r = Number(rung.value);
        S.updateProject(pid, { rung: r }).saved.then(() => toast(`Now on rung ${r} · ${D.ladder[r].stage}`, { icon: "ladder" }), failed);
      }
    });
    main.addEventListener("click", (e) => {
      const open = e.target.closest("[data-task-open]");
      if (open) { openTask(open.dataset.taskOpen, open); return; }
      const edit = e.target.closest("[data-pl-edit]");
      if (edit) { openDetails(edit); return; }
      const jump = e.target.closest("[data-jump]");
      if (jump) { const to = document.getElementById(jump.dataset.jump); if (to) to.scrollIntoView({ behavior: Mori.motion.reduced() ? "auto" : "smooth", block: "center" }); return; }
      const pin = e.target.closest("[data-pl-pin]");
      if (pin) {
        const u = S.togglePin(pid);
        if (u) toast(u.pinned ? `“${u.name}” is pinned to your homepage` : `“${u.name}” unpinned`, { icon: "pin" });
      }
    });
    K.bindTeam(main, project, {
      onAdded: () => render(),
      beforeLeave: (p) => { leaving = !!p; },
      onLeft: (p) => Mori.ui.go("projects.html", "You left the project", `You’re no longer on “${p.name}”.`),
    });
    bindDrag();
  }

  /* ---------- Drag and drop between columns (mouse and trackpad) ---------- */
  let marker = null;
  function placeMarker(list, y) {
    if (!marker) { marker = document.createElement("li"); marker.className = "pl-marker"; marker.setAttribute("aria-hidden", "true"); }
    const items = $$(".task[data-task]", list).filter((el) => el.dataset.task !== dragId);
    const next = items.find((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
    if (next) { if (marker.nextElementSibling !== next) list.insertBefore(marker, next); }
    else if (marker.parentNode !== list || marker.nextElementSibling) list.appendChild(marker);
    $$(".pl-col", main).forEach((c) => c.classList.toggle("is-over", c.contains(list)));
  }
  function endDrag() {
    if (marker) marker.remove();
    $$(".pl-col.is-over, .task.is-dragging", main).forEach((el) => el.classList.remove("is-over", "is-dragging"));
    main.classList.remove("is-dragging");
    dragId = null;
    if (deferred) { deferred = false; render(); }
  }
  function bindDrag() {
    const board = $(".pl-board", main);
    board.addEventListener("dragstart", (e) => {
      const el = e.target.closest(".task[data-task]");
      if (!el) return;
      dragId = el.dataset.task;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", el.querySelector(".task-text").textContent);
      requestAnimationFrame(() => { el.classList.add("is-dragging"); main.classList.add("is-dragging"); });
    });
    board.addEventListener("dragover", (e) => {
      const col = dragId && e.target.closest(".pl-col");
      if (!col) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      placeMarker($(".pl-list", col), e.clientY);
    });
    board.addEventListener("dragleave", (e) => { if (dragId && !board.contains(e.relatedTarget)) { if (marker) marker.remove(); $$(".pl-col.is-over", main).forEach((c) => c.classList.remove("is-over")); } });
    board.addEventListener("drop", (e) => {
      const col = dragId && e.target.closest(".pl-col");
      if (!col) return;
      e.preventDefault();
      const id = dragId;
      let after = marker && marker.parentNode ? marker.nextElementSibling : null;
      while (after && (!after.dataset.task || after.dataset.task === id)) after = after.nextElementSibling;
      const status = col.dataset.col;
      deferred = false;
      endDrag();
      const t = project() && project().tasks.find((x) => x.id === id);
      const was = project();
      S.moveTask(pid, id, status, after ? after.dataset.task : null).saved.catch(failed);
      const u = project();
      if (t && status === "done" && !t.done && u && u.progress === 100 && was.progress < 100 && u.tasks.length > 1) {
        K.burst($(`[data-task="${CSS.escape(id)}"]`, main));
        toast("Every task is done. Time to post proof for the next rung!", { icon: "award" });
      }
    });
    board.addEventListener("dragend", endDrag);
  }

  /* ---------- Edit a task ---------- */
  function openTask(id, opener) {
    const p = project();
    const t = p && p.tasks.find((x) => x.id === id);
    if (!t) return;
    const team = K.teamOf(p);
    const root = createModal("taskModal", { label: "Edit task", panelCls: "modal--new" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "tkTitle");
    panel.innerHTML = `
      <div class="modal-head">
        <div><h2 id="tkTitle">Edit task</h2><p class="meta">${esc(p.name)}</p></div>
        <button class="icon-btn modal-x" data-close aria-label="Close">${icon("x")}</button>
      </div>
      <form class="modal-body np-form" id="tkForm" novalidate>
        <label class="field"><span>Task</span><textarea class="textarea tk-text" name="text" maxlength="200" rows="2" required autofocus>${esc(t.text)}</textarea></label>
        <div class="field"><span>Column</span><div class="seg" id="tkStatus" data-value="${t.status}">${COLS.map((st) => `<button data-value="${st}">${K.STATUS[st]}</button>`).join("")}</div></div>
        <div class="form-grid">
          <label class="field"><span>For</span><select class="select tk-select" name="assignee">
            <option value="">No one yet</option>
            ${team.map((m) => `<option value="${esc(m.id)}" ${t.assignee === m.id ? "selected" : ""}>${esc(m.you ? "You" : m.person.name)}</option>`).join("")}
          </select></label>
          <label class="field"><span>Due <em class="hint">optional</em></span><input class="input" type="date" name="due" value="${esc(t.due || "")}"></label>
        </div>
      </form>
      <div class="modal-foot">
        <button class="btn btn--danger tk-delete" type="button" id="tkDelete">${icon("trash")} Delete</button>
        <button class="btn" type="button" data-close>Cancel</button>
        <button class="btn btn--ink" type="button" id="tkSave">${icon("check")} Save</button>
      </div>`;
    seg($("#tkStatus", panel));
    const form = $("#tkForm", panel);
    const text = form.elements.text;
    const save = () => {
      const value = text.value.trim().replace(/\s+/g, " ");
      if (!value) { text.classList.remove("is-invalid"); void text.offsetWidth; text.classList.add("is-invalid"); text.focus(); return; }
      const status = $("#tkStatus", panel).dataset.value;
      const was = project();
      const { project: u, saved } = S.updateTask(pid, id, { text: value, status, assignee: form.elements.assignee.value || null, due: form.elements.due.value || null });
      Mori.modal.close();
      saved.catch(failed);
      if (u && u.progress === 100 && was.progress < 100 && u.tasks.length > 1) toast("Every task is done. Time to post proof for the next rung!", { icon: "award" });
    };
    text.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } });
    text.addEventListener("input", () => text.classList.remove("is-invalid"));
    form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
    $("#tkSave", panel).addEventListener("click", save);
    $("#tkDelete", panel).addEventListener("click", (e) => {
      if (!Mori.people.confirmTap(e.currentTarget, "Tap again to delete")) return;
      const { saved } = S.removeTask(pid, id);
      Mori.modal.close({ restoreFocus: false });
      toast("Task deleted", { icon: "trash" });
      saved.catch(failed);
    });
    // Put the caret at the end of the text.
    setTimeout(() => { if (document.activeElement === text) text.setSelectionRange(text.value.length, text.value.length); }, 80);
    Mori.modal.open("taskModal", { opener });
  }

  /* ---------- Edit the project's details ---------- */
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
          <p class="meta">Removes the project and its tasks for everyone on the team. This can’t be undone.</p>
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
      }, () => { Mori.modal.close({ restoreFocus: false }); Mori.ui.go("projects.html", "Project deleted", `“${p.name}” and its tasks are gone.`); });
    });
    Mori.modal.open("detailsModal", { opener });
  }

  /* ---------- Data ---------- */
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (["projectsRemote", "projectsCreated", "projectOverrides", "network", "profile"].includes(key)) render();
  });
  // Co-founders' changes: check again when the page comes back into view, and every 20 s.
  const poll = () => { if (!document.hidden && N.available()) S.refreshProjects().catch(() => {}); };
  document.addEventListener("visibilitychange", poll);
  window.addEventListener("focus", poll);
  setInterval(poll, 20000);

  render();
  const ready = N.available() ? S.refreshProjects().catch((err) => { // shares the load the shell started
    if (err && err.code === "signed-out") Mori.people.signInAgain(err.message);
    else if (!project()) toast("Couldn’t load this project: " + err.message, { icon: "x" });
  }) : Promise.resolve();
  ready.then(() => { loaded = true; render(); });
})();
