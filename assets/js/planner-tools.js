/* ==========================================================================
   Mori: Sandbox — the planner's tools (the sections in its left sidebar)
   --------------------------------------------------------------------------
   Plan:   Daily tasks · GTM checklist · Milestone ladder
   Team:   People
   Build:  Documents (planner-docs.js) · Customer interviews · Lean canvas
   Grow:   Marketing · Metrics
   Money:  Finance · Funding
   Learn:  Toolkits (document templates)
   Each section draws itself into the planner's view; events are delegated
   from the view, so a section can be re-drawn whenever its data changes.
   Tasks are the project's tasks (state.js); everything else lives in the
   project's workspace (workspace.js).
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, toast, createModal, seg } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const P = D.planner;
  const W = Mori.workspace;
  const K = Mori.projectKit;
  const COLS = ["todo", "doing", "done"];
  const HINTS = { todo: "Nothing to do yet. Add the first task below.", doing: "Drag a task here when someone starts on it.", done: "Finished tasks land here." };
  const EASE = "cubic-bezier(.16,1,.3,1)";

  const SECTIONS = [
    { id: "mainframe", label: "Mainframe", icon: "grid" },
    { group: "Plan" },
    { id: "tasks", label: "Daily tasks", icon: "checklist" },
    { id: "gtm", label: "GTM checklist", icon: "rocket" },
    { id: "ladder", label: "Milestone ladder", icon: "ladder" },
    { group: "Team" },
    { id: "people", label: "People", icon: "network" },
    { group: "Build" },
    { id: "docs", label: "Documents", icon: "file" },
    { id: "interviews", label: "Customer interviews", icon: "mic" },
    { id: "canvas", label: "Lean canvas", icon: "canvas" },
    { group: "Grow" },
    { id: "marketing", label: "Marketing", icon: "megaphone" },
    { id: "metrics", label: "Metrics", icon: "chart" },
    { group: "Money" },
    { id: "finance", label: "Finance", icon: "wallet" },
    { id: "funding", label: "Funding opportunities", icon: "coins" },
    { group: "Learn" },
    { id: "toolkits", label: "Toolkits", icon: "layers" },
  ];
  const label = (id) => (SECTIONS.find((s) => s.id === id) || {}).label || "Mainframe";

  /* ---------- Shared bits ---------- */
  const card = (title, body, extra = "", cls = "") => `<section class="pl-card tool-card ${cls}">${title ? `<h3>${title}${extra ? `<span>${extra}</span>` : ""}</h3>` : ""}${body}</section>`;
  const failed = (err) => Mori.people.fail(err && (err.code === "signed-out" || err.code === "too-many") ? err : new Error("That change wasn’t saved: " + ((err && err.message) || "please try again.")));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const bar = (p, cls = "") => `<span class="wg-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></span>`;
  const checkbox = (attrs, on, text, sub = "") => `<label class="tool-check"><input type="checkbox" ${attrs} ${on ? "checked" : ""}><span class="task-box">${icon("check")}</span><span class="tool-check-text">${text}${sub ? `<span class="meta">${sub}</span>` : ""}</span></label>`;
  const removeBtn = (attrs, labelText) => `<button class="icon-btn tool-x" type="button" ${attrs} aria-label="${esc(labelText)}" title="${esc(labelText)}">${icon("trash")}</button>`;
  const dayLabel = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: y === new Date().getFullYear() ? undefined : "numeric" }); };
  const fmtNum = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n) || 0);
  const memberOf = (p, id) => K.teamOf(p).find((m) => m.id === id) || null;
  const gtmItems = (ws) => P.gtm.flatMap((g, gi) => g.items.map((text, ii) => ({ key: `g${gi}.${ii}`, text, group: g.group }))).concat(ws.gtm.custom.map((c) => ({ key: c.id, text: c.text, group: c.group || "Your items", custom: true })));
  const formData = (form) => Object.fromEntries(new FormData(form).entries());

  /* =====================================================================
     Daily tasks: the board (To do · In progress · Done)
     ===================================================================== */
  function taskHTML(t, p) {
    const who = t.assignee ? memberOf(p, t.assignee) : null;
    const due = K.dueInfo(t.due, t.done);
    const lbl = [t.text, due && due.text, who && `for ${who.you ? "you" : who.person.name}`].filter(Boolean).join(" · ");
    return `
      <li class="task${t.done ? " is-done" : ""}" data-task="${esc(t.id)}" draggable="true">
        <label class="task-check" title="${t.done ? "Mark as not done" : "Mark as done"}"><input type="checkbox" data-task-done="${esc(t.id)}" ${t.done ? "checked" : ""}><span class="task-box">${icon("check")}</span><span class="sr-only">Done: ${esc(t.text)}</span></label>
        <button class="task-open" type="button" data-task-open="${esc(t.id)}" aria-label="Edit task: ${esc(lbl)}">
          <span class="task-text">${esc(t.text)}</span>
          ${due || who ? `<span class="task-meta">${due ? `<span class="task-due ${due.cls}">${icon("clock")}${esc(due.text)}</span>` : ""}${who ? `<span class="task-who" title="${esc(who.you ? "You" : who.person.name)}">${avatar(who.person, 22)}</span>` : ""}</span>` : ""}
        </button>
      </li>`;
  }
  function renderTasks(view, { p }) {
    if (!$(".pl-board", view)) {
      view.innerHTML = `
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
        </section>`;
    }
    const a = document.activeElement;
    const key = a && view.contains(a) && (a.getAttribute("data-task-done") || a.getAttribute("data-task-open")) ? `[${a.hasAttribute("data-task-done") ? "data-task-done" : "data-task-open"}="${CSS.escape(a.getAttribute("data-task-done") || a.getAttribute("data-task-open"))}"]` : null;
    const before = Mori.motion.reduced() ? null : new Map($$(".task[data-task]", view).map((el) => [el.dataset.task, el.getBoundingClientRect()]));
    COLS.forEach((st) => {
      const ts = p.tasks.filter((t) => t.status === st);
      $(`[data-list="${st}"]`, view).innerHTML = ts.map((t) => taskHTML(t, p)).join("") || `<li class="pl-empty">${HINTS[st]}</li>`;
      $(`[data-count-of="${st}"]`, view).textContent = ts.length;
    });
    const full = p.tasks.length >= S.MAX_TASKS;
    $$(".pl-add-input", view).forEach((i) => { i.placeholder = full ? `${S.MAX_TASKS} tasks is the limit for now` : "Add a task"; i.disabled = full; });
    if (key) { const el = $(key, view); if (el) el.focus({ preventScroll: true }); }
    if (!before) return;
    const fresh = before.size === 0;
    $$(".task[data-task]", view).forEach((el, i) => {
      const r0 = before.get(el.dataset.task);
      if (!r0) { el.animate([{ opacity: 0, transform: "translateY(8px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 360, delay: fresh ? Math.min(i * 25, 200) : 0, easing: EASE, fill: "backwards" }); return; }
      const r1 = el.getBoundingClientRect();
      if (Math.abs(r0.left - r1.left) < 1 && Math.abs(r0.top - r1.top) < 1) return;
      el.animate([{ transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px)` }, { transform: "none" }], { duration: 420, easing: EASE });
    });
  }
  function openTask(ctx, id, opener) {
    const p = ctx.p;
    const t = p.tasks.find((x) => x.id === id);
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
      const { saved } = S.updateTask(ctx.pid, id, { text: value, status: $("#tkStatus", panel).dataset.value, assignee: form.elements.assignee.value || null, due: form.elements.due.value || null });
      Mori.modal.close();
      saved.catch(failed);
    };
    text.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } });
    text.addEventListener("input", () => text.classList.remove("is-invalid"));
    form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
    $("#tkSave", panel).addEventListener("click", save);
    $("#tkDelete", panel).addEventListener("click", (e) => {
      if (!Mori.people.confirmTap(e.currentTarget, "Tap again to delete")) return;
      const { saved } = S.removeTask(ctx.pid, id);
      Mori.modal.close({ restoreFocus: false });
      toast("Task deleted", { icon: "trash" });
      saved.catch(failed);
    });
    setTimeout(() => { if (document.activeElement === text) text.setSelectionRange(text.value.length, text.value.length); }, 80);
    Mori.modal.open("taskModal", { opener });
  }

  /* Drag tasks between columns (mouse and trackpad). */
  const drag = { id: null, marker: null };
  function placeMarker(view, list, y) {
    if (!drag.marker) { drag.marker = document.createElement("li"); drag.marker.className = "pl-marker"; drag.marker.setAttribute("aria-hidden", "true"); }
    const items = $$(".task[data-task]", list).filter((el) => el.dataset.task !== drag.id);
    const next = items.find((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
    if (next) { if (drag.marker.nextElementSibling !== next) list.insertBefore(drag.marker, next); }
    else if (drag.marker.parentNode !== list || drag.marker.nextElementSibling) list.appendChild(drag.marker);
    $$(".pl-col", view).forEach((c) => c.classList.toggle("is-over", c.contains(list)));
  }
  function endTaskDrag(view) {
    if (drag.marker) drag.marker.remove();
    $$(".pl-col.is-over, .task.is-dragging", view).forEach((el) => el.classList.remove("is-over", "is-dragging"));
    view.classList.remove("is-dragging");
    const was = drag.id;
    drag.id = null;
    return was;
  }

  /* =====================================================================
     GTM checklist
     ===================================================================== */
  function renderGtm(view, { ws }) {
    const items = gtmItems(ws);
    const done = items.filter((x) => ws.gtm.done[x.key]).length;
    const groups = P.gtm.map((g) => g.group).concat(ws.gtm.custom.some((c) => !P.gtm.some((g) => g.group === c.group)) ? ["Your items"] : []);
    view.innerHTML = `
      <div class="tool-intro">${bar(pct(done, items.length))}<p class="meta"><b>${done} of ${items.length}</b> go-to-market steps done. Tick them off as the team works through them, and add your own.</p></div>
      <div class="tool-grid">${groups.map((group) => {
        const list = items.filter((x) => x.group === group);
        const gd = list.filter((x) => ws.gtm.done[x.key]).length;
        return card(esc(group), `
          <div class="tool-checks">${list.map((x) => `<div class="tool-check-row">${checkbox(`data-gtm="${esc(x.key)}"`, ws.gtm.done[x.key], esc(x.text))}${x.custom ? removeBtn(`data-gtm-x="${esc(x.key)}"`, "Remove") : ""}</div>`).join("")}</div>
          <form class="tool-inline" data-gtm-add="${esc(group)}" autocomplete="off"><input class="input" name="text" maxlength="140" placeholder="Add a step" aria-label="Add a step to ${esc(group)}"><button class="btn btn--sm" type="submit">${icon("plus")} Add</button></form>`, `${gd}/${list.length}`);
      }).join("")}</div>`;
  }

  /* =====================================================================
     Milestone ladder
     ===================================================================== */
  function renderLadder(view, { p, ws }) {
    const g = W.progress(p, ws);
    const now = D.ladder[p.rung];
    const nextHTML = g.next ? (() => {
      const steps = P.ladderSteps[g.next];
      const allDone = g.done === g.total;
      return card(`Toward rung ${g.next} · ${esc(D.ladder[g.next].stage)}`, `
        <p class="meta tool-lead">${esc(D.ladder[g.next].proof)}</p>
        <div class="tool-checks">${steps.map((text, i) => `<div class="tool-check-row">${checkbox(`data-step="${g.next}:${i}"`, g.flags[i], esc(text), g.next === 1 && i === 0 && ws.interviews.items.length >= 8 ? "Ticked: 8+ interviews logged" : g.next === 1 && i === 0 ? `${ws.interviews.items.length} of 8 interviews logged · <button class="link-btn" type="button" data-go="interviews">Log interviews</button>` : "")}</div>`).join("")}</div>
        <div class="tool-actions">${allDone ? `<button class="btn btn--ink" type="button" data-rung-up="${g.next}">${icon("award")} Move up to rung ${g.next}</button>` : `<span class="meta">${g.total - g.done} step${g.total - g.done === 1 ? "" : "s"} to go.</span>`}<span class="meta">Toolkit: ${esc(D.ladder[g.next].toolkit)}</span></div>`, `${g.done} of ${g.total}`);
    })() : card("Top rung reached", `<p class="meta">${esc(now.opens)}</p>`);
    view.innerHTML = `
      <div class="tool-grid tool-grid--wide">
        ${card(`Rung ${p.rung} of 5 · ${esc(now.stage)}`, `${Mori.shell.ladderBar(p.rung)}
          <div class="ladder-labels" aria-hidden="true">${D.ladder.map((r) => `<span class="${r.rung === p.rung ? "is-now" : ""}">${r.rung}</span>`).join("")}</div>
          <p class="pd-now"><b>Opens:</b> ${esc(now.opens)}</p>
          <label class="pl-rung"><span>Change rung</span><select class="select" data-pl-rung aria-label="Project rung">${D.ladder.map((r) => `<option value="${r.rung}" ${r.rung === p.rung ? "selected" : ""}>Rung ${r.rung} · ${esc(r.stage)}</option>`).join("")}</select></label>`, `${g.pct}% overall`)}
        ${nextHTML}
      </div>
      ${card("Every rung", `<ol class="tool-rungs">${D.ladder.map((r) => `<li class="${r.rung === p.rung ? "is-now" : r.rung < p.rung ? "is-done" : ""}"><span class="tool-rung-n">${r.rung}</span><div><b>${esc(r.stage)}</b><span class="meta">${esc(r.proof)}</span></div><span class="meta tool-rung-time">${esc(r.time)}</span></li>`).join("")}</ol>`)}`;
  }

  /* =====================================================================
     People
     ===================================================================== */
  function renderPeople(view, { p, ws }) {
    const open = {};
    p.tasks.forEach((t) => { if (t.assignee && !t.done) open[t.assignee] = (open[t.assignee] || 0) + 1; });
    view.innerHTML = `
      <div class="tool-grid">
        <section class="pl-card tool-card" id="plTeam">${K.teamHTML(p, { openTasks: open })}</section>
        ${card("Roles we need", `
          <ul class="tool-rows">${ws.roles.map((r) => `<li class="${r.filled ? "is-done" : ""}">${checkbox(`data-role-fill="${esc(r.id)}"`, r.filled, esc(r.title), r.note ? esc(r.note) : r.filled ? "Filled" : "Open")}${removeBtn(`data-role-x="${esc(r.id)}"`, "Remove role")}</li>`).join("") || `<li class="meta">Which skills is the team missing? List them so specialists know.</li>`}</ul>
          <form class="tool-form" data-role-add autocomplete="off">
            <input class="input" name="title" maxlength="60" placeholder="Role, e.g. Mobile developer" required aria-label="Role">
            <input class="input" name="note" maxlength="120" placeholder="Notes (hours, equity, skills)" aria-label="Notes">
            <button class="btn btn--sm" type="submit">${icon("plus")} Add role</button>
          </form>
          <a class="btn btn--sm btn--ghost tool-find" href="network.html#explore">${icon("compass")} Find specialists in the MORI Network</a>`, `${ws.roles.filter((r) => !r.filled).length} open`)}
      </div>`;
  }

  /* =====================================================================
     Customer interviews
     ===================================================================== */
  function renderInterviews(view, { ws }) {
    const items = ws.interviews.items.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const count = (k) => items.filter((x) => x.pay === k).length;
    view.innerHTML = `
      <div class="tool-stats">
        <div><span class="meta">Interviews</span><b>${items.length}<small> / 8</small></b>${bar(pct(Math.min(items.length, 8), 8))}</div>
        <div><span class="meta">Would pay</span><b>${count("yes")}</b></div>
        <div><span class="meta">Maybe</span><b>${count("maybe")}</b></div>
        <div><span class="meta">Wouldn’t pay</span><b>${count("no")}</b></div>
      </div>
      <div class="tool-grid tool-grid--side">
        ${card("Log an interview", `
          <form class="tool-form tool-form--stack" data-int-add autocomplete="off">
            <div class="form-grid"><label class="field"><span>Who</span><input class="input" name="who" maxlength="80" placeholder="e.g. Warung owner, Bandung" required></label>
            <label class="field"><span>Date</span><input class="input" type="date" name="date" value="${W.isoDay()}"></label></div>
            <label class="field"><span>Their biggest pain</span><textarea class="textarea" name="pain" maxlength="400" rows="2" placeholder="What hurts, in their words"></textarea></label>
            <label class="field"><span>A quote worth keeping <em class="hint">optional</em></span><input class="input" name="quote" maxlength="200"></label>
            <label class="field"><span>Would they pay for a fix?</span><select class="select" name="pay">${Object.entries(P.interviewPay).map(([k, v]) => `<option value="${k}" ${k === "maybe" ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
            <button class="btn btn--ink" type="submit">${icon("plus")} Log interview</button>
          </form>`)}
        ${card("What you’ve heard", items.length ? `<ul class="tool-entries">${items.map((x) => `<li><div><b>${esc(x.who)}</b><span class="meta">${esc(dayLabel(x.date))} · <span class="tool-pay is-${esc(x.pay)}">${esc(P.interviewPay[x.pay] || "Maybe")}</span></span>${x.pain ? `<p>${esc(x.pain)}</p>` : ""}${x.quote ? `<blockquote>“${esc(x.quote)}”</blockquote>` : ""}</div>${removeBtn(`data-int-x="${esc(x.id)}"`, "Remove interview")}</li>`).join("")}</ul>` : `<p class="meta">Talk to 8–10 people who have the problem before you build. Log each conversation here; the ladder ticks itself off at eight.</p>`, `${items.length}`)}
      </div>`;
  }

  /* =====================================================================
     Lean canvas
     ===================================================================== */
  function renderCanvas(view, { ws }) {
    // Already on screen: just bring in changes, leaving the box being typed in alone.
    if ($(".lean", view)) {
      $$("[data-canvas]", view).forEach((t) => { const v = ws.canvas[t.dataset.canvas] || ""; if (t !== document.activeElement && t.value !== v) t.value = v; });
      return;
    }
    view.innerHTML = `<p class="meta tool-lead">Your business model on one page. Everything saves as you type, and the whole team can edit it.</p>
      <div class="lean">${P.canvas.map(([key, name, hint]) => `<label class="lean-box lean-box--${key}"><span class="lean-title">${esc(name)}</span><textarea data-canvas="${key}" maxlength="600" placeholder="${esc(hint)}">${esc(ws.canvas[key] || "")}</textarea></label>`).join("")}</div>`;
  }

  /* =====================================================================
     Marketing
     ===================================================================== */
  function renderMarketing(view, { ws }) {
    const list = ws.marketing.campaigns;
    const cur = ws.finance.currency;
    const leads = list.reduce((t, c) => t + (Number(c.leads) || 0), 0);
    const spend = list.reduce((t, c) => t + (Number(c.budget) || 0), 0);
    view.innerHTML = `
      <div class="tool-stats">
        <div><span class="meta">Campaigns</span><b>${list.length}</b></div>
        <div><span class="meta">Live now</span><b>${list.filter((c) => c.status === "live").length}</b></div>
        <div><span class="meta">Sign-ups</span><b>${fmtNum(leads)}</b></div>
        <div><span class="meta">Cost per sign-up</span><b>${leads ? W.fmtMoney(spend / leads, cur, { compact: true }) : "—"}</b></div>
      </div>
      ${card("Campaigns", `
        <div class="tool-table" role="table" aria-label="Campaigns">${list.length ? `
          <div class="tool-tr tool-th" role="row"><span role="columnheader">Campaign</span><span role="columnheader">Channel</span><span role="columnheader">Status</span><span role="columnheader">Budget</span><span role="columnheader">Sign-ups</span><span></span></div>
          ${list.map((c) => `<div class="tool-tr" role="row">
            <span role="cell"><b>${esc(c.name)}</b></span><span role="cell" data-label="Channel">${esc(c.channel || "—")}</span>
            <span role="cell" data-label="Status"><select class="select select--sm" data-camp-status="${esc(c.id)}" aria-label="Status of ${esc(c.name)}">${Object.entries(P.campaignStatus).map(([k, v]) => `<option value="${k}" ${c.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></span>
            <span role="cell" data-label="Budget">${c.budget ? W.fmtMoney(c.budget, cur, { compact: true }) : "—"}</span>
            <span role="cell" data-label="Sign-ups"><input class="input input--sm" type="number" min="0" step="1" value="${Number(c.leads) || 0}" data-camp-leads="${esc(c.id)}" aria-label="Sign-ups from ${esc(c.name)}"></span>
            <span role="cell">${removeBtn(`data-camp-x="${esc(c.id)}"`, "Remove campaign")}</span>
          </div>`).join("")}` : `<p class="meta">Plan where you’ll find your first customers, then track what each campaign brings in.</p>`}</div>
        <form class="tool-form" data-camp-add autocomplete="off">
          <input class="input" name="name" maxlength="60" placeholder="Campaign, e.g. Launch week on TikTok" required aria-label="Campaign name">
          <select class="select" name="channel" aria-label="Channel">${P.marketingChannels.map((x) => `<option>${esc(x)}</option>`).join("")}</select>
          <select class="select" name="status" aria-label="Status">${Object.entries(P.campaignStatus).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
          <input class="input" type="number" name="budget" min="0" step="1" placeholder="Budget (${esc(cur)})" aria-label="Budget">
          <button class="btn btn--sm" type="submit">${icon("plus")} Add</button>
        </form>`)}`;
  }

  /* =====================================================================
     Metrics
     ===================================================================== */
  function sparkline(points, w = 220, h = 48) {
    const vals = points.map((x) => Number(x.v) || 0);
    if (vals.length < 2) return `<span class="meta">Log a few values to see the trend.</span>`;
    const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - 4 - ((v - lo) / span) * (h - 8)).toFixed(1)}`).join(" ");
    return `<svg class="tool-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function renderMetrics(view, { ws }) {
    const items = ws.metrics.items;
    view.innerHTML = `
      <div class="tool-grid">${items.map((m) => {
        const pts = (m.points || []).slice().sort((a, b) => (a.d || "").localeCompare(b.d || ""));
        const last = pts.length ? Number(pts[pts.length - 1].v) : null;
        const target = Number(m.target) || 0;
        return card(esc(m.name), `
          <div class="tool-metric"><b>${last == null ? "—" : fmtNum(last)}</b><span class="meta">${esc(m.unit || "")}${target ? ` · target ${fmtNum(target)} (${pct(last || 0, target)}%)` : ""}</span></div>
          ${target ? bar(pct(last || 0, target)) : ""}
          ${sparkline(pts.slice(-20))}
          <form class="tool-inline" data-metric-log="${esc(m.id)}" autocomplete="off"><input class="input" type="number" step="any" name="v" placeholder="New value" required aria-label="New value for ${esc(m.name)}"><input class="input" type="date" name="d" value="${W.isoDay()}" aria-label="Date"><button class="btn btn--sm" type="submit">Log</button></form>`,
          removeBtn(`data-metric-x="${esc(m.id)}"`, `Remove ${m.name}`));
      }).join("")}
        ${card("Add a metric", `
          <form class="tool-form tool-form--stack" data-metric-add autocomplete="off">
            <label class="field"><span>Name</span><input class="input" name="name" maxlength="40" placeholder="e.g. Weekly active users" required></label>
            <div class="form-grid"><label class="field"><span>Unit <em class="hint">optional</em></span><input class="input" name="unit" maxlength="16" placeholder="users, orders, Rp"></label>
            <label class="field"><span>Target <em class="hint">optional</em></span><input class="input" type="number" step="any" name="target" placeholder="1000"></label></div>
            <button class="btn btn--ink" type="submit">${icon("plus")} Add metric</button>
          </form>`)}
      </div>`;
  }

  /* =====================================================================
     Finance
     ===================================================================== */
  function renderFinance(view, { ws }) {
    const f = ws.finance;
    const m = W.money(ws);
    const cur = f.currency;
    const runway = m.runway == null ? "—" : m.runway >= 99 ? "99+ months" : `${m.runway.toFixed(m.runway < 10 ? 1 : 0)} months`;
    const hi = Math.max(1, ...m.byMonth.map((x) => Math.max(x.in, x.out)));
    const entries = f.entries.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    view.innerHTML = `
      <div class="tool-stats">
        <div><span class="meta">Balance</span><b>${W.fmtMoney(m.balance, cur)}</b></div>
        <div><span class="meta">Monthly burn</span><b>${W.fmtMoney(m.burn, cur)}</b></div>
        <div><span class="meta">Runway</span><b>${runway}</b></div>
        <div><span class="meta">This month</span><b><span class="is-in">+${W.fmtMoney(m.thisMonth.in, cur, { compact: true })}</span> <span class="is-out">−${W.fmtMoney(m.thisMonth.out, cur, { compact: true })}</span></b></div>
      </div>
      <div class="tool-grid tool-grid--side">
        ${card("Cash flow", `<div class="wg-chart tool-chart">${m.byMonth.map((x) => { const [y, mo] = x.m.split("-").map(Number); return `<div class="wg-month" title="${new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "long" })}: in ${W.fmtMoney(x.in, cur)}, out ${W.fmtMoney(x.out, cur)}"><div class="wg-bars"><i class="is-in" style="height:${(x.in / hi) * 100}%"></i><i class="is-out" style="height:${(x.out / hi) * 100}%"></i></div><span>${new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short" })}</span></div>`; }).join("")}</div>
          <div class="wg-legend"><span><i class="is-in"></i>Money in</span><span><i class="is-out"></i>Money out</span></div>
          <p class="meta">Burn is the average net spend of the last three months with entries; runway is your balance divided by it.</p>`)}
        ${card("Setup", `<form class="tool-form tool-form--stack" data-fin-setup autocomplete="off">
            <label class="field"><span>Currency</span><select class="select" name="currency">${Object.keys(P.currencies).map((c) => `<option ${c === cur ? "selected" : ""}>${c}</option>`).join("")}</select></label>
            <label class="field"><span>Cash you started with</span><input class="input" type="number" min="0" step="1" name="start" value="${Number(f.start) || 0}"></label>
            <button class="btn btn--sm" type="submit">${icon("check")} Save</button>
          </form>`)}
      </div>
      ${card("Money in and out", `
        <form class="tool-form" data-fin-add autocomplete="off">
          <input class="input" type="date" name="date" value="${W.isoDay()}" aria-label="Date" required>
          <input class="input" name="label" maxlength="80" placeholder="Description, e.g. Domain and hosting" required aria-label="Description">
          <select class="select" name="kind" aria-label="In or out"><option value="out">Money out</option><option value="in">Money in</option></select>
          <input class="input" type="number" name="amount" min="0" step="1" placeholder="Amount (${esc(cur)})" required aria-label="Amount">
          <select class="select" name="category" aria-label="Category">${P.financeCategories.out.map((x) => `<option>${esc(x)}</option>`).join("")}</select>
          <button class="btn btn--sm" type="submit">${icon("plus")} Add</button>
        </form>
        ${entries.length ? `<ul class="tool-ledger">${entries.map((e) => `<li><span class="meta">${esc(dayLabel(e.date))}</span><span class="tool-ledger-label">${esc(e.label)}<span class="meta"> · ${esc(e.category || "")}</span></span><b class="${e.kind === "in" ? "is-in" : "is-out"}">${e.kind === "in" ? "+" : "−"}${W.fmtMoney(e.amount, cur)}</b>${removeBtn(`data-fin-x="${esc(e.id)}"`, "Remove entry")}</li>`).join("")}</ul>` : `<p class="meta">Add what comes in (sales, grants, investment) and what goes out. Even a rough list shows how long your cash lasts.</p>`}`, `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`)}`;
  }

  /* =====================================================================
     Funding
     ===================================================================== */
  function renderFunding(view, { ws }) {
    const items = ws.funding.items.slice().sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
    const cur = ws.finance.currency;
    view.innerHTML = `
      <div class="tool-grid tool-grid--side">
        ${card("Your pipeline", `${items.length ? `<ul class="tool-entries">${items.map((x) => `<li><div><b>${esc(x.name)}</b><span class="meta">${esc(P.fundingKinds[x.kind] || "Other")}${x.amount ? ` · ${W.fmtMoney(x.amount, cur, { compact: true })}` : ""}${x.deadline ? ` · deadline ${esc(dayLabel(x.deadline))}` : ""}${x.link ? ` · <a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">link</a>` : ""}</span>${x.note ? `<p>${esc(x.note)}</p>` : ""}</div>
            <select class="select select--sm" data-fund-status="${esc(x.id)}" aria-label="Status of ${esc(x.name)}">${Object.entries(P.fundingStatus).map(([k, v]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${v}</option>`).join("")}</select>${removeBtn(`data-fund-x="${esc(x.id)}"`, "Remove")}</li>`).join("")}</ul>` : `<p class="meta">Keep every grant, competition, accelerator and investor you’re going after in one place, with its deadline.</p>`}
          <form class="tool-form" data-fund-add autocomplete="off">
            <input class="input" name="name" maxlength="80" placeholder="Name of the programme or investor" required aria-label="Name">
            <select class="select" name="kind" aria-label="Type">${Object.entries(P.fundingKinds).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
            <input class="input" type="number" name="amount" min="0" step="1" placeholder="Amount (${esc(cur)})" aria-label="Amount">
            <input class="input" type="date" name="deadline" aria-label="Deadline">
            <input class="input" type="url" name="link" maxlength="300" placeholder="https://…" aria-label="Link">
            <button class="btn btn--sm" type="submit">${icon("plus")} Add</button>
          </form>`, `${items.filter((x) => x.status !== "won" && x.status !== "lost").length} active`)}
        ${card("Where to look", `<ul class="tool-tips">${P.fundingTips.map(([t, d]) => `<li><b>${esc(t)}</b><span class="meta">${esc(d)}</span></li>`).join("")}</ul><p class="meta">Check each programme’s own site for current terms and deadlines.</p>`)}
      </div>`;
  }

  /* =====================================================================
     Toolkits: start a document from a template
     ===================================================================== */
  function renderToolkits(view) {
    view.innerHTML = `
      <p class="meta tool-lead">Templates from the SandBox toolkits. Each one starts a document your whole team can edit.</p>
      <div class="tool-grid tool-grid--three">${P.templates.map((t) => `
        <section class="pl-card tool-card tool-template">
          <span class="tool-template-ico">${icon("file")}</span>
          <h3>${esc(t.name)}</h3>
          <p class="meta">${esc(t.blurb)}</p>
          ${t.toolkit ? `<span class="meta tool-template-kit">From: ${esc(t.toolkit)}</span>` : ""}
          <button class="btn btn--sm" type="button" data-template="${esc(t.id)}">${icon("plus")} Use template</button>
        </section>`).join("")}</div>
      ${card("More toolkits for each rung", `<ul class="tool-tips">${D.ladder.map((r) => `<li><b>Rung ${r.rung} · ${esc(r.stage)}</b><span class="meta">${esc(r.toolkit)}</span></li>`).join("")}</ul>`)}`;
  }

  /* =====================================================================
     Drawing and events
     ===================================================================== */
  const RENDER = {
    tasks: renderTasks, gtm: renderGtm, ladder: renderLadder, people: renderPeople, interviews: renderInterviews,
    canvas: renderCanvas, marketing: renderMarketing, metrics: renderMetrics, finance: renderFinance, funding: renderFunding, toolkits: renderToolkits,
  };
  function render(id, view, ctx) {
    view.dataset.section = id;
    (RENDER[id] || renderTasks)(view, ctx);
  }

  /** Delegated once on the planner's view; `getCtx()` returns { pid, p, ws, go }. */
  function bind(view, getCtx) {
    const change = (part, fn) => W.change(getCtx().pid, part, fn).catch(failed);
    const uid = W.uid;

    view.addEventListener("submit", (e) => {
      const form = e.target;
      const ctx = getCtx();
      const d = formData(form);
      if (form.matches("[data-add]")) {
        e.preventDefault();
        const text = (d.text || "").trim();
        if (!text) return;
        const st = form.dataset.add;
        form.elements.text.value = "";
        S.addTask(ctx.pid, text, { status: st, done: st === "done" }).saved.catch((err) => { failed(err); if (!form.elements.text.value) form.elements.text.value = text; });
        return;
      }
      if (!form.matches("[data-gtm-add], [data-role-add], [data-int-add], [data-camp-add], [data-metric-add], [data-metric-log], [data-fin-add], [data-fin-setup], [data-fund-add]")) return;
      e.preventDefault();
      // Something was added: clear the form (before the section re-draws) and,
      // if the cursor was in it, keep it there for the next one.
      const hadFocus = form.contains(document.activeElement);
      const own = Array.from(form.attributes).find((x) => x.name.startsWith("data-"));
      const added = (part, fn) => {
        form.reset();
        change(part, fn);
        const again = hadFocus && own && $(`form[${own.name}="${CSS.escape(own.value)}"]`, view);
        const field = again && $('input:not([type="hidden"]):not([type="date"]), textarea', again);
        if (field && document.activeElement !== field) field.focus({ preventScroll: true });
      };
      if (form.matches("[data-gtm-add]")) {
        const text = (d.text || "").trim();
        if (!text) return;
        const item = { id: uid("c"), text: text.slice(0, 140), group: form.dataset.gtmAdd };
        added("gtm", (g) => { g.custom = g.custom.concat([item]); return g; });
      } else if (form.matches("[data-role-add]")) {
        const role = { id: uid("r"), title: (d.title || "").trim().slice(0, 60), note: (d.note || "").trim().slice(0, 120), filled: false };
        if (!role.title) return;
        added("roles", (r) => r.concat([role]));
      } else if (form.matches("[data-int-add]")) {
        const item = { id: uid("v"), who: (d.who || "").trim().slice(0, 80), date: d.date || W.isoDay(), pain: (d.pain || "").trim().slice(0, 400), quote: (d.quote || "").trim().slice(0, 200), pay: d.pay || "maybe" };
        if (!item.who) return;
        added("interviews", (x) => { x.items = x.items.concat([item]); return x; });
        toast(item.pay === "yes" ? "Interview logged. They’d pay!" : "Interview logged", { icon: "mic" });
      } else if (form.matches("[data-camp-add]")) {
        const c = { id: uid("m"), name: (d.name || "").trim().slice(0, 60), channel: d.channel, status: d.status || "planned", budget: Math.max(0, Number(d.budget) || 0), leads: 0 };
        if (!c.name) return;
        added("marketing", (x) => { x.campaigns = x.campaigns.concat([c]); return x; });
      } else if (form.matches("[data-metric-add]")) {
        const m = { id: uid("k"), name: (d.name || "").trim().slice(0, 40), unit: (d.unit || "").trim().slice(0, 16), target: d.target === "" ? 0 : Number(d.target) || 0, points: [] };
        if (!m.name) return;
        added("metrics", (x) => { x.items = x.items.concat([m]); return x; });
      } else if (form.matches("[data-metric-log]")) {
        const id = form.dataset.metricLog;
        const pt = { d: d.d || W.isoDay(), v: Number(d.v) };
        if (d.v === "" || !Number.isFinite(pt.v)) return;
        added("metrics", (x) => { x.items = x.items.map((m) => (m.id === id ? Object.assign({}, m, { points: (m.points || []).filter((q) => q.d !== pt.d).concat([pt]).sort((a, b) => a.d.localeCompare(b.d)).slice(-60) }) : m)); return x; });
      } else if (form.matches("[data-fin-add]")) {
        const entry = { id: uid("f"), date: d.date || W.isoDay(), label: (d.label || "").trim().slice(0, 80), kind: d.kind === "in" ? "in" : "out", amount: Math.max(0, Number(d.amount) || 0), category: d.category };
        if (!entry.label || !entry.amount) return;
        added("finance", (x) => { x.entries = x.entries.concat([entry]).slice(-500); return x; });
      } else if (form.matches("[data-fin-setup]")) {
        const currency = d.currency;
        const start = Math.max(0, Number(d.start) || 0);
        change("finance", (x) => Object.assign(x, { currency, start }));
        toast("Finance settings saved", { icon: "check" });
      } else if (form.matches("[data-fund-add]")) {
        const link = /^https?:\/\//i.test(d.link || "") ? d.link.trim().slice(0, 300) : "";
        const item = { id: uid("u"), name: (d.name || "").trim().slice(0, 80), kind: d.kind, amount: Math.max(0, Number(d.amount) || 0), deadline: d.deadline || "", status: "researching", link, note: "" };
        if (!item.name) return;
        added("funding", (x) => { x.items = x.items.concat([item]); return x; });
      }
    });

    view.addEventListener("change", (e) => {
      const t = e.target;
      const ctx = getCtx();
      if (t.matches("[data-task-done]")) { S.toggleTask(ctx.pid, t.dataset.taskDone).saved.catch(failed); return; }
      if (t.matches('[data-fin-add] [name="kind"]')) { t.form.elements.category.innerHTML = P.financeCategories[t.value === "in" ? "in" : "out"].map((x) => `<option>${esc(x)}</option>`).join(""); return; }
      if (t.matches("[data-gtm]")) { const key = t.dataset.gtm; const on = t.checked; change("gtm", (g) => { if (on) g.done[key] = true; else delete g.done[key]; return g; }); return; }
      if (t.matches("[data-step]")) { const key = t.dataset.step; const on = t.checked; change("ladder", (l) => { if (on) l.done[key] = true; else delete l.done[key]; return l; }); return; }
      if (t.matches("[data-pl-rung]")) { const r = Number(t.value); S.updateProject(ctx.pid, { rung: r }).saved.then(() => toast(`Now on rung ${r} · ${D.ladder[r].stage}`, { icon: "ladder" }), failed); return; }
      if (t.matches("[data-role-fill]")) { const id = t.dataset.roleFill; const on = t.checked; change("roles", (r) => r.map((x) => (x.id === id ? Object.assign({}, x, { filled: on }) : x))); return; }
      if (t.matches("[data-camp-status]")) { const id = t.dataset.campStatus; const v = t.value; change("marketing", (x) => { x.campaigns = x.campaigns.map((c) => (c.id === id ? Object.assign({}, c, { status: v }) : c)); return x; }); return; }
      if (t.matches("[data-camp-leads]")) { const id = t.dataset.campLeads; const v = Math.max(0, Math.round(Number(t.value) || 0)); change("marketing", (x) => { x.campaigns = x.campaigns.map((c) => (c.id === id ? Object.assign({}, c, { leads: v }) : c)); return x; }); return; }
      if (t.matches("[data-fund-status]")) { const id = t.dataset.fundStatus; const v = t.value; change("funding", (x) => { x.items = x.items.map((i) => (i.id === id ? Object.assign({}, i, { status: v }) : i)); return x; }); if (v === "won") toast("Congratulations!", { icon: "award" }); }
    });

    // Lean canvas: saves a moment after you stop typing, and straight away when you
    // leave a box; every box keeps its own pending text, so moving on loses nothing.
    const canvasDraft = {};
    let canvasTimer = null;
    const saveCanvas = () => {
      clearTimeout(canvasTimer);
      const draft = Object.assign({}, canvasDraft);
      Object.keys(canvasDraft).forEach((k) => delete canvasDraft[k]);
      if (Object.keys(draft).length) change("canvas", (c) => Object.assign(c, draft));
    };
    view.addEventListener("input", (e) => {
      const t = e.target.closest("[data-canvas]");
      if (!t) return;
      canvasDraft[t.dataset.canvas] = t.value.slice(0, 600);
      clearTimeout(canvasTimer);
      canvasTimer = setTimeout(saveCanvas, 600);
    });
    view.addEventListener("focusout", (e) => { if (e.target.closest("[data-canvas]")) saveCanvas(); });
    window.addEventListener("pagehide", saveCanvas);

    view.addEventListener("click", (e) => {
      const ctx = getCtx();
      const go = e.target.closest("[data-go]");
      if (go) { ctx.go(go.dataset.go); return; }
      const open = e.target.closest("[data-task-open]");
      if (open) { openTask(ctx, open.dataset.taskOpen, open); return; }
      const up = e.target.closest("[data-rung-up]");
      if (up) {
        const r = Number(up.dataset.rungUp);
        Mori.people.busy(up, () => S.updateProject(ctx.pid, { rung: r }).saved, () => { K.burst(up); toast(`Rung ${r} reached: ${D.ladder[r].stage}!`, { icon: "award" }); });
        return;
      }
      const tpl = e.target.closest("[data-template]");
      if (tpl) {
        const t = P.templates.find((x) => x.id === tpl.dataset.template);
        Mori.people.busy(tpl, () => W.docs.create(ctx.pid, { title: t.name, body: t.body }), (d) => ctx.go("docs/" + d.id));
        return;
      }
      const x = e.target.closest("[data-gtm-x], [data-role-x], [data-int-x], [data-camp-x], [data-metric-x], [data-fin-x], [data-fund-x]");
      if (!x || !Mori.people.confirmTap(x, "Tap again")) return;
      const d = x.dataset;
      if (d.gtmX) change("gtm", (g) => { g.custom = g.custom.filter((c) => c.id !== d.gtmX); delete g.done[d.gtmX]; return g; });
      else if (d.roleX) change("roles", (r) => r.filter((c) => c.id !== d.roleX));
      else if (d.intX) change("interviews", (v) => { v.items = v.items.filter((c) => c.id !== d.intX); return v; });
      else if (d.campX) change("marketing", (m) => { m.campaigns = m.campaigns.filter((c) => c.id !== d.campX); return m; });
      else if (d.metricX) change("metrics", (m) => { m.items = m.items.filter((c) => c.id !== d.metricX); return m; });
      else if (d.finX) change("finance", (f) => { f.entries = f.entries.filter((c) => c.id !== d.finX); return f; });
      else if (d.fundX) change("funding", (f) => { f.items = f.items.filter((c) => c.id !== d.fundX); return f; });
    });

    /* Task board drag and drop */
    view.addEventListener("dragstart", (e) => {
      const el = e.target.closest(".task[data-task]");
      if (!el) return;
      drag.id = el.dataset.task;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", el.querySelector(".task-text").textContent);
      requestAnimationFrame(() => { el.classList.add("is-dragging"); view.classList.add("is-dragging"); });
    });
    view.addEventListener("dragover", (e) => {
      const col = drag.id && e.target.closest(".pl-col");
      if (!col) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      placeMarker(view, $(".pl-list", col), e.clientY);
    });
    view.addEventListener("dragleave", (e) => { if (drag.id && !view.contains(e.relatedTarget)) { if (drag.marker) drag.marker.remove(); $$(".pl-col.is-over", view).forEach((c) => c.classList.remove("is-over")); } });
    view.addEventListener("drop", (e) => {
      const col = drag.id && e.target.closest(".pl-col");
      if (!col) return;
      e.preventDefault();
      let after = drag.marker && drag.marker.parentNode ? drag.marker.nextElementSibling : null;
      while (after && (!after.dataset.task || after.dataset.task === drag.id)) after = after.nextElementSibling;
      const id = endTaskDrag(view);
      S.moveTask(getCtx().pid, id, col.dataset.col, after ? after.dataset.task : null).saved.catch(failed);
      if (view._afterDrag) view._afterDrag();
    });
    view.addEventListener("dragend", () => { if (drag.id) { endTaskDrag(view); if (view._afterDrag) view._afterDrag(); } });
  }

  Mori.plannerTools = { SECTIONS, label, render, bind, isDragging: () => !!drag.id };
})();
