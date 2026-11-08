/* ==========================================================================
   Mori: Sandbox — project helpers shared by the Projects page and the planner
   --------------------------------------------------------------------------
   The team list and its actions, the "Add to team" window (a searchable
   checklist of your connections), task labels and due dates, tag chips and
   the confetti burst.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, esc, icon, avatar, toast, createModal } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const N = S.network;
  const HUES = ["orange", "blue", "emerald", "teal", "purple", "gray"];
  const STATUS = { todo: "To do", doing: "In progress", done: "Done" };
  const first = (name) => String(name || "").split(/\s+/)[0];
  const plannerUrl = (id) => "project.html?id=" + encodeURIComponent(id);
  const tagChips = (tags, cls = "chip") => (tags || []).map((t, i) => `<span class="${cls} ${cls}--${HUES[i % HUES.length]}">${esc(t)}</span>`).join("");

  /** People on a project (owner first), each with a label. You appear as "You". */
  function teamOf(p) {
    const meId = S.session().id;
    return [p.ownerId].concat(p.cofounders || []).map((id) => {
      const person = id === meId ? S.me() : N.member(id);
      return person ? { id, person, you: id === meId, role: id === p.ownerId ? "Owner" : "Co-founder" } : null;
    }).filter(Boolean);
  }
  /** Only a founder who owns the project adds people, and only their connections. */
  const canAddPeople = (p) => !!p && p.owner && N.available() && S.profile().role === "founder";
  const addablePeople = (p) => N.connections().filter((c) => c.id !== p.ownerId && !(p.cofounders || []).includes(c.id));
  /** What the team section says when people can't be added. */
  function noPickerNote() {
    if (!N.available()) return "Teams need a Google sign-in: demo projects stay on this device.";
    if (S.profile().role !== "founder") return "Only founders can add people to their projects.";
    return `Connect with people in the <a class="link-btn" href="network.html#explore">Network</a> to add them to your team.`;
  }

  /* ---------- Picker: your connections as a searchable checklist ---------- */
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

  /** The "Add to team" window. `onAdded(ids)` runs once they're on the project. */
  function openAddPeople(p, opener, onAdded) {
    if (!p) return;
    const chosen = new Set();
    const root = createModal("addPeopleModal", { label: "Add to team", panelCls: "modal--new" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "acTitle");
    panel.innerHTML = `
      <div class="modal-head">
        <div><h2 id="acTitle">Add to team</h2><p class="meta">They’ll see “${esc(p.name)}” in their projects and can plan it with you.</p></div>
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
        toast(`Added ${added.length} ${added.length === 1 ? "person" : "people"} to “${p.name}”`, { icon: "check" });
        if (onAdded) onAdded(added);
      });
    });
    Mori.modal.open("addPeopleModal", { opener });
  }

  /* ---------- Tags: suggestions to tick, plus your own ---------- */
  const MAX_TAGS = 10;
  /** Tags already in use, the member's industries and `extra`, A–Z. */
  const tagChoices = (extra = []) => Array.from(new Set(S.allTags().concat(S.profile().industries || [], extra))).sort((a, b) => a.localeCompare(b));
  function tagFieldHTML(chosen) {
    return `
      <div class="field">
        <span>Tags</span>
        <div class="filters" data-tag-list>${tagChoices(Array.from(chosen)).map((t) => `<button type="button" class="fchip" data-tag-pick="${esc(t)}" data-active="${chosen.has(t)}">${esc(t)}</button>`).join("")}</div>
        <div class="np-addtag"><input class="input" data-tag-new maxlength="20" placeholder="Add your own tag and press Enter" aria-label="Add a tag"></div>
      </div>`;
  }
  /** Wire a tag field inside `box`; `chosen` is a Set of tags. */
  function bindTagField(box, chosen) {
    const list = $("[data-tag-list]", box);
    const full = () => { toast(`Up to ${MAX_TAGS} tags`, { icon: "x" }); };
    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tag-pick]");
      if (!b) return;
      const t = b.dataset.tagPick;
      if (chosen.has(t)) chosen.delete(t);
      else if (chosen.size >= MAX_TAGS) { full(); return; }
      else chosen.add(t);
      b.dataset.active = String(chosen.has(t));
    });
    $("[data-tag-new]", box).addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const t = e.target.value.trim().replace(/\s+/g, " ").slice(0, 20);
      if (!t) return;
      if (!chosen.has(t) && chosen.size >= MAX_TAGS) { full(); return; }
      chosen.add(t);
      const existing = list.querySelector(`[data-tag-pick="${CSS.escape(t)}"]`);
      if (existing) existing.dataset.active = "true";
      else list.insertAdjacentHTML("beforeend", `<button type="button" class="fchip enter" data-tag-pick="${esc(t)}" data-active="true">${esc(t)}</button>`);
      e.target.value = "";
    });
  }

  /* ---------- Team list ---------- */
  /** The team rows; `openTasks` (optional) maps member id → tasks assigned to them that aren't done. */
  function teamHTML(p, { openTasks } = {}) {
    const team = teamOf(p);
    const rows = team.map((t) => {
      const actions = t.you
        ? (!p.owner ? `<button class="btn btn--sm btn--ghost" type="button" data-pd-leave>Leave project</button>` : "")
        : `${N.status(t.id) === "connected" ? `<button class="btn btn--sm btn--ghost" type="button" data-message="${esc(t.id)}">${icon("message")} Message</button>` : ""}<button class="btn btn--sm btn--ghost" type="button" data-view="${esc(t.id)}">${icon("user")} Profile</button>${p.owner && t.role === "Co-founder" ? `<button class="btn btn--sm btn--ghost" type="button" data-pd-drop="${esc(t.id)}">Remove</button>` : ""}`;
      const n = openTasks ? openTasks[t.id] || 0 : null;
      const line = [t.role, n != null ? `${n} open task${n === 1 ? "" : "s"}` : !t.you && t.person.headline ? t.person.headline : ""].filter(Boolean).map(esc).join(" · ");
      return `<div class="team-row">${avatar(t.person, 36)}<div><b>${esc(t.you ? "You" : t.person.name)}</b><span class="meta">${line}</span></div><div class="team-actions">${actions}</div></div>`;
    }).join("");
    const add = canAddPeople(p) && addablePeople(p).length
      ? `<button class="btn btn--sm" type="button" data-pd-add>${icon("userPlus")} Add to team</button>`
      : "";
    return `
      <h3>Team <span>${team.length > 1 ? `${team.length} people` : "Just you"}</span></h3>
      <div class="team">${rows}</div>
      ${add ? `<div class="pd-team-add">${add}</div>` : team.length === 1 && p.owner ? `<p class="meta">${canAddPeople(p) ? "Add people from your connections." : noPickerNote()}</p>` : ""}`;
  }

  /**
   * Team actions inside `box` (Add to team, Remove, Leave project).
   *   getProject(): the current project · onAdded(ids, project)
   *   beforeLeave(project) / onLeft(project): around leaving it yourself
   */
  function bindTeam(box, getProject, { onAdded, beforeLeave, onLeft } = {}) {
    box.addEventListener("click", (e) => {
      const p = getProject();
      if (!p) return;
      const add = e.target.closest("[data-pd-add]");
      if (add) { openAddPeople(p, add, (ids) => { if (onAdded) onAdded(ids, p); }); return; }
      const drop = e.target.closest("[data-pd-drop]");
      if (drop && Mori.people.confirmTap(drop, "Tap again")) {
        const who = N.member(drop.dataset.pdDrop);
        Mori.people.busy(drop, () => S.removeCofounder(p.id, drop.dataset.pdDrop), () => toast(`${who ? who.name : "They"} ${who ? "is" : "are"} no longer on this project`, { icon: "x" }));
        return;
      }
      const leave = e.target.closest("[data-pd-leave]");
      if (leave && Mori.people.confirmTap(leave, "Tap again to leave")) {
        Mori.people.busy(leave, () => {
          if (beforeLeave) beforeLeave(p);
          return S.removeCofounder(p.id, S.session().id).catch((err) => { if (beforeLeave) beforeLeave(null); throw err; });
        }, () => { if (onLeft) onLeft(p); });
      }
    });
  }

  /* ---------- Tasks ---------- */
  const counts = (p) => p.tasks.reduce((c, t) => { c[t.status] += 1; return c; }, { todo: 0, doing: 0, done: 0 });
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  /** "Due today", "Overdue · Nov 3"… and how urgent it is. */
  function dueInfo(due, done) {
    if (!due) return null;
    const [y, m, d] = due.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((date - today) / 864e5);
    const label = date.toLocaleDateString("en-US", y === today.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
    if (done) return { text: label, cls: "", days };
    if (days < 0) return { text: `Overdue · ${label}`, cls: "is-late", days };
    if (days === 0) return { text: "Due today", cls: "is-soon", days };
    if (days === 1) return { text: "Due tomorrow", cls: "is-soon", days };
    if (days < 7) return { text: "Due " + date.toLocaleDateString("en-US", { weekday: "long" }), cls: "", days };
    return { text: "Due " + label, cls: "", days };
  }

  /** A short burst of confetti from an element (when the last task is done). */
  function burst(el) {
    if (!el || !el.animate || Mori.motion.reduced()) return;
    const r = el.getBoundingClientRect();
    const colors = ["#b80000", "#e0352b", "#1a1c1f", "#75777a", "#10b981", "#e8c63f"];
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

  Mori.projectKit = {
    HUES, STATUS, first, plannerUrl, tagChips, teamOf, canAddPeople, addablePeople, noPickerNote,
    pickerHTML, bindPicker, openAddPeople, teamHTML, bindTeam, tagFieldHTML, bindTagField, counts, todayISO, dueInfo, burst,
  };
})();
