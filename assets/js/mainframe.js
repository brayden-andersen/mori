/* ==========================================================================
   Mori: Sandbox — the Mainframe (a project's home in the planner)
   --------------------------------------------------------------------------
   A canvas of widgets on a grid three columns wide, with as many rows as it
   needs. Widgets come from the project's tools (tasks, GTM checklist,
   finance, metrics…). "Edit Mainframe" opens a drawer on the right where you
   pick a widget, its style and its size, like on a phone's home screen. On
   the canvas, drag a widget by its top bar to move it and by its corner to
   resize it; it never gets smaller than its style needs. Other widgets move
   down out of the way. The layout is saved in the project's workspace.
   On narrow screens the widgets stack in one column (arrange them on a
   larger screen).
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, avatarStack, ago, toast, createModal, seg } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const P = D.planner;
  const W = Mori.workspace;
  const K = Mori.projectKit;
  const COLS = 3;
  const MAXH = W.MAX_ROWS;
  const EASE = "cubic-bezier(.16,1,.3,1)";

  /* ---------- Small pieces ---------- */
  const plain = (html) => { const d = document.createElement("div"); d.innerHTML = html || ""; return (d.textContent || "").replace(/\s+/g, " ").trim(); };
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
  const bar = (pct, cls = "") => `<span class="wg-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;
  const ring = (pct, label, cls = "") => `<span class="wg-ring ${cls}" style="--p:${Math.max(0, Math.min(100, pct))}"><b>${label}</b></span>`;
  const more = (n, section) => (n > 0 ? `<button class="wg-more-link" type="button" data-wgo="${section}">+${n} more</button>` : "");
  /** How many list rows (rowPx tall) fit a widget h grid rows tall, keeping room for "+N more" when they don't all fit. */
  const fit = (h, total, rowPx = 31, extraPx = 0) => {
    const body = h * 166 - 16 - 62 - extraPx; // the rows and gaps, less the widget's top bar and padding
    return total <= Math.floor(body / rowPx) ? total : Math.max(1, Math.floor((body - 26) / rowPx));
  };
  /** The five rungs: full up to the project's rung, part-filled for the share of the next rung's proof that's done. */
  const rungBar = (p, g) => `<span class="pl-ladderbar wg-ladderbar" aria-hidden="true">${[1, 2, 3, 4, 5].map((r) => `<i><b style="width:${r <= p.rung ? 100 : r === g.next && g.total ? Math.round((g.done / g.total) * 100) : 0}%"></b></i>`).join("")}</span>`;
  const empty = (text, section, cta) => `<div class="wg-empty"><p>${text}</p>${section ? `<button class="btn btn--sm" type="button" data-wgo="${section}">${cta || "Open"}</button>` : ""}</div>`;
  const dayLabel = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
  const daysTo = (iso) => { const [y, m, d] = iso.split("-").map(Number); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(y, m - 1, d) - t) / 864e5); };
  function spark(points, w = 120, h = 34) {
    const vals = points.map((x) => Number(x.v) || 0);
    if (vals.length < 2) return "";
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo || 1;
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - lo) / span) * (h - 6)).toFixed(1)}`).join(" ");
    return `<svg class="wg-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  const metricValue = (m) => { const pts = (m.points || []).slice().sort((a, b) => (a.d || "").localeCompare(b.d || "")); return pts.length ? Number(pts[pts.length - 1].v) || 0 : null; };
  const fmtNum = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: Math.abs(n) >= 100000 ? "compact" : "standard" }).format(n);
  const gtmItems = (ws) => P.gtm.flatMap((g, gi) => g.items.map((text, ii) => ({ key: `g${gi}.${ii}`, text, group: g.group }))).concat(ws.gtm.custom.map((c) => ({ key: c.id, text: c.text, group: c.group || "Your items" })));

  /* ---------- The widgets ----------
     Each style (variant) has a smallest size [columns, rows] and sizes to
     offer in the drawer. render(ctx, w) returns the widget's body. */
  const TYPES = {
    tasks: {
      name: "Daily tasks", icon: "checklist", section: "tasks", desc: "What’s on today, overall progress or the whole board.",
      variants: {
        today: { name: "Today", min: [1, 2], sizes: [[1, 2], [2, 2], [1, 3]] },
        progress: { name: "Progress", min: [2, 1], sizes: [[2, 1], [3, 1]] },
        board: { name: "Board", min: [3, 2], sizes: [[3, 2], [3, 3]] },
      },
      render({ p }, w) {
        const c = K.counts(p);
        if (!p.tasks.length) return empty("No tasks yet.", "tasks", "Add tasks");
        if (w.variant === "progress") {
          const pct = Math.round((c.done / p.tasks.length) * 100);
          const late = p.tasks.filter((t) => !t.done && t.due && daysTo(t.due) < 0).length;
          return `<div class="wg-split"><div><span class="wg-big">${pct}<small>%</small></span><span class="wg-sub">${c.done} of ${p.tasks.length} tasks done</span></div>
            <div class="wg-stack">${bar(pct, "is-green")}<div class="wg-counts"><span><b>${c.todo}</b> to do</span><span><b>${c.doing}</b> in progress</span><span class="${late ? "is-late" : ""}"><b>${late}</b> overdue</span></div></div></div>`;
        }
        if (w.variant === "board") {
          const room = Math.max(1, Math.floor((w.h * 166 - 136) / 37));
          return `<div class="wg-board">${["todo", "doing", "done"].map((st) => {
            const ts = p.tasks.filter((t) => t.status === st);
            return `<div class="wg-bcol"><span class="wg-bhead">${K.STATUS[st]} <b>${ts.length}</b></span>${ts.slice(0, room).map((t) => `<span class="wg-bline ${st === "done" ? "is-done" : ""}">${esc(t.text)}</span>`).join("")}${ts.length > room ? `<span class="wg-sub">+${ts.length - room} more</span>` : ""}</div>`;
          }).join("")}</div>`;
        }
        const open = p.tasks.filter((t) => !t.done).sort((a, b) => (a.status === "doing" ? 0 : 1) - (b.status === "doing" ? 0 : 1) || (a.due || "9999").localeCompare(b.due || "9999"));
        if (!open.length) return empty("Everything’s done. Nice work.", "tasks", "Open tasks");
        const room = fit(w.h, open.length);
        return `<ul class="wg-list">${open.slice(0, room).map((t) => {
          const due = K.dueInfo(t.due, false);
          return `<li><label class="wg-check"><input type="checkbox" data-wtask="${esc(t.id)}"><span class="task-box">${icon("check")}</span><span class="wg-text">${esc(t.text)}</span>${due ? `<span class="wg-due ${due.cls}">${esc(due.text.replace(/^Due /, ""))}</span>` : t.status === "doing" ? `<span class="wg-due is-doing">Doing</span>` : ""}</label></li>`;
        }).join("")}</ul>${more(open.length - room, "tasks")}`;
      },
    },
    gtm: {
      name: "GTM checklist", icon: "rocket", section: "gtm", desc: "The go-to-market steps that are still open.",
      variants: {
        list: { name: "Checklist", min: [1, 2], sizes: [[1, 2], [2, 2], [1, 3]] },
        ring: { name: "Progress", min: [1, 1], sizes: [[1, 1], [2, 1]] },
      },
      render({ ws }, w) {
        const items = gtmItems(ws);
        const done = items.filter((x) => ws.gtm.done[x.key]).length;
        const pct = items.length ? Math.round((done / items.length) * 100) : 0;
        if (w.variant === "ring") return `<div class="wg-split">${ring(pct, pct + "%")}<div><span class="wg-strong">${done} of ${items.length} done</span><span class="wg-sub">${done === items.length ? "Ready to launch." : `Next: ${esc(short((items.find((x) => !ws.gtm.done[x.key]) || {}).text || "", 60))}`}</span></div></div>`;
        const open = items.filter((x) => !ws.gtm.done[x.key]);
        const room = fit(w.h, open.length, 31, 26);
        return `<div class="wg-line">${bar(pct)}<span class="wg-sub">${done}/${items.length}</span></div><ul class="wg-list">${open.slice(0, room).map((x) => `<li><label class="wg-check"><input type="checkbox" data-wgtm="${esc(x.key)}"><span class="task-box">${icon("check")}</span><span class="wg-text" title="${esc(x.text)}">${esc(x.text)}</span></label></li>`).join("") || `<li class="wg-sub">Every step is done.</li>`}</ul>${more(open.length - room, "gtm")}`;
      },
    },
    ladder: {
      name: "Milestone ladder", icon: "ladder", section: "ladder", desc: "Your rung, and the proof for the next one.",
      variants: {
        next: { name: "Next rung", min: [1, 1], sizes: [[1, 1], [2, 1]] },
        steps: { name: "Proof steps", min: [2, 2], sizes: [[2, 2], [3, 2]] },
      },
      render({ p, ws }, w) {
        const g = W.progress(p, ws);
        if (!g.next) return `<span class="wg-big">Rung 5</span><span class="wg-sub">Top rung reached: early traction.</span>`;
        const head = `<span class="wg-strong">Rung ${g.rung} → ${g.next}</span><span class="wg-sub">${esc(D.ladder[g.next].stage)} · ${g.done} of ${g.total} steps</span>`;
        if (w.variant === "next") return `<div class="wg-col">${head}${rungBar(p, g)}</div>`;
        const steps = P.ladderSteps[g.next];
        return `<div class="wg-col wg-col--top">${head}${rungBar(p, g)}</div><ul class="wg-list">${steps.map((text, i) => `<li><label class="wg-check"><input type="checkbox" data-wstep="${g.next}:${i}" ${g.flags[i] ? "checked" : ""}><span class="task-box">${icon("check")}</span><span class="wg-text">${esc(text)}</span></label></li>`).join("")}</ul>`;
      },
    },
    finance: {
      name: "Finance", icon: "wallet", section: "finance", desc: "Cash in the bank, monthly burn and runway.",
      variants: {
        runway: { name: "Runway", min: [1, 1], sizes: [[1, 1]] },
        summary: { name: "Summary", min: [2, 1], sizes: [[2, 1], [3, 1]] },
        chart: { name: "Cash flow", min: [2, 2], sizes: [[2, 2], [3, 2]] },
      },
      render({ ws }, w) {
        const m = W.money(ws);
        const cur = m.currency;
        if (!ws.finance.entries.length && !ws.finance.start) return empty("Add your cash and spending to see your runway.", "finance", "Open Finance");
        const runway = m.runway == null ? "—" : m.runway >= 99 ? "99+" : m.runway.toFixed(m.runway < 10 ? 1 : 0);
        if (w.variant === "runway") return `<div class="wg-col"><span class="wg-big">${runway}<small> months</small></span><span class="wg-sub">Runway · ${W.fmtMoney(m.balance, cur, { compact: true })} in the bank</span></div>`;
        if (w.variant === "summary") {
          return `<div class="wg-stats">
            <div><span class="wg-sub">Balance</span><b>${W.fmtMoney(m.balance, cur, { compact: true })}</b></div>
            <div><span class="wg-sub">Monthly burn</span><b>${W.fmtMoney(m.burn, cur, { compact: true })}</b></div>
            <div><span class="wg-sub">Runway</span><b>${runway}${runway === "—" ? "" : " mo"}</b></div>
            ${w.w >= 3 ? `<div><span class="wg-sub">This month</span><b class="is-in">+${W.fmtMoney(m.thisMonth.in, cur, { compact: true })}</b> <b class="is-out">−${W.fmtMoney(m.thisMonth.out, cur, { compact: true })}</b></div>` : ""}
          </div>`;
        }
        const hi = Math.max(1, ...m.byMonth.map((x) => Math.max(x.in, x.out)));
        return `<div class="wg-line"><span class="wg-strong">${W.fmtMoney(m.balance, cur, { compact: true })}</span><span class="wg-sub">balance · ${runway}${runway === "—" ? "" : " months runway"}</span></div>
          <div class="wg-chart">${m.byMonth.map((x) => {
            const [y, mo] = x.m.split("-").map(Number);
            return `<div class="wg-month"><div class="wg-bars"><i class="is-in" style="height:${(x.in / hi) * 100}%"></i><i class="is-out" style="height:${(x.out / hi) * 100}%"></i></div><span>${new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short" })}</span></div>`;
          }).join("")}</div>
          <div class="wg-legend"><span><i class="is-in"></i>In</span><span><i class="is-out"></i>Out</span></div>`;
      },
    },
    funding: {
      name: "Funding opportunities", icon: "coins", section: "funding", desc: "Grants, competitions and investors you’re going after.",
      variants: {
        next: { name: "Next deadline", min: [1, 1], sizes: [[1, 1], [2, 1]] },
        pipeline: { name: "Pipeline", min: [1, 2], sizes: [[1, 2], [2, 2]] },
      },
      render({ ws }, w) {
        const live = ws.funding.items.filter((x) => x.status !== "won" && x.status !== "lost");
        if (!ws.funding.items.length) return empty("Track the grants, competitions and investors you’re going after.", "funding", "Open Funding");
        if (w.variant === "next") {
          const nxt = live.filter((x) => x.deadline && daysTo(x.deadline) >= 0).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
          if (!nxt) return `<div class="wg-col"><span class="wg-strong">No deadlines coming up</span><span class="wg-sub">${live.length} in progress</span></div>`;
          const n = daysTo(nxt.deadline);
          return `<div class="wg-col"><span class="wg-big">${n}<small> day${n === 1 ? "" : "s"}</small></span><span class="wg-sub">to ${esc(short(nxt.name, 40))} · ${dayLabel(nxt.deadline)}</span></div>`;
        }
        const list = ws.funding.items.slice().sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
        const room = fit(w.h, list.length, 34);
        return `<ul class="wg-list wg-list--rows">${list.slice(0, room).map((x) => `<li><span class="wg-text">${esc(x.name)}</span><span class="wg-chip is-${esc(x.status || "researching")}">${esc(P.fundingStatus[x.status] || "Researching")}</span></li>`).join("")}</ul>${more(list.length - room, "funding")}`;
      },
    },
    metrics: {
      name: "Metrics", icon: "chart", section: "metrics", desc: "The numbers that tell you it’s working.",
      variants: {
        kpi: { name: "One metric", min: [1, 1], sizes: [[1, 1], [2, 1]], pick: "metric" },
        row: { name: "Key metrics", min: [3, 1], sizes: [[3, 1]] },
      },
      render({ ws }, w) {
        const items = ws.metrics.items;
        const tile = (m) => {
          const v = metricValue(m);
          const target = Number(m.target) || 0;
          return `<div class="wg-kpi"><span class="wg-sub">${esc(m.name)}</span><span class="wg-big">${v == null ? "—" : fmtNum(v)}<small>${m.unit ? " " + esc(m.unit) : ""}</small></span>${target ? `<span class="wg-sub">${v == null ? 0 : Math.round((v / target) * 100)}% of ${fmtNum(target)}</span>` : ""}${spark((m.points || []).slice(-12))}</div>`;
        };
        if (!items.length) return empty("Add the numbers you want to watch, like sign-ups or revenue.", "metrics", "Add a metric");
        if (w.variant === "row") return `<div class="wg-kpis">${items.slice(0, 3).map(tile).join("")}</div>`;
        const m = items.find((x) => x.id === w.opts.metricId) || items[0];
        return tile(m);
      },
    },
    marketing: {
      name: "Marketing", icon: "megaphone", section: "marketing", desc: "Campaigns, channels and the sign-ups they bring.",
      variants: {
        campaigns: { name: "Campaigns", min: [1, 2], sizes: [[1, 2], [2, 2]] },
        leads: { name: "Sign-ups", min: [1, 1], sizes: [[1, 1]] },
      },
      render({ ws }, w) {
        const list = ws.marketing.campaigns;
        if (!list.length) return empty("Plan your first campaign.", "marketing", "Open Marketing");
        if (w.variant === "leads") {
          const leads = list.reduce((t, c) => t + (Number(c.leads) || 0), 0);
          return `<div class="wg-col"><span class="wg-big">${fmtNum(leads)}</span><span class="wg-sub">sign-ups from ${list.length} campaign${list.length === 1 ? "" : "s"}</span></div>`;
        }
        const room = fit(w.h, list.length, 34);
        const order = { live: 0, planned: 1, done: 2 };
        const sorted = list.slice().sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
        return `<ul class="wg-list wg-list--rows">${sorted.slice(0, room).map((c) => `<li><span class="wg-text">${esc(c.name)}<span class="wg-sub"> · ${esc(c.channel || "")}</span></span><span class="wg-chip is-${esc(c.status || "planned")}">${esc(P.campaignStatus[c.status] || "Planned")}</span></li>`).join("")}</ul>${more(sorted.length - room, "marketing")}`;
      },
    },
    doc: {
      name: "Document", icon: "file", section: "docs", desc: "Pin one document, or show the latest edits.",
      variants: {
        one: { name: "One document", min: [1, 1], sizes: [[1, 1], [1, 2], [2, 2]], pick: "doc" },
        recent: { name: "Recent documents", min: [1, 2], sizes: [[1, 2], [2, 2]] },
      },
      render({ docs, who }, w) {
        if (!docs.length) return empty("No documents yet.", "docs", "Write one");
        const line = (d) => `Edited ${ago(d.updatedAt).toLowerCase()}${who(d.updatedBy) ? " by " + esc(who(d.updatedBy)) : ""}`;
        if (w.variant === "recent") {
          const room = fit(w.h, docs.length, 34);
          return `<ul class="wg-list wg-list--rows">${docs.slice(0, room).map((d) => `<li><button class="wg-link" type="button" data-wdoc="${esc(d.id)}">${icon("file")}<span class="wg-text">${esc(d.title)}</span></button><span class="wg-sub">${esc(ago(d.updatedAt))}</span></li>`).join("")}</ul>${more(docs.length - room, "docs")}`;
        }
        const d = docs.find((x) => x.id === w.opts.docId);
        if (!d) return empty("This document was deleted.", "docs", "Documents");
        const text = d.body !== undefined ? plain(d.body) : "";
        return `<button class="wg-docbtn" type="button" data-wdoc="${esc(d.id)}"><span class="wg-strong">${esc(d.title)}</span><span class="wg-sub">${line(d)}</span>${w.h > 1 && text ? `<span class="wg-preview">${esc(short(text, w.h * w.w * 160))}</span>` : ""}</button>`;
      },
    },
    people: {
      name: "People", icon: "network", section: "people", desc: "Your team, and the roles you still need.",
      variants: {
        team: { name: "Team", min: [1, 1], sizes: [[1, 1], [2, 1]] },
        roles: { name: "Roles we need", min: [1, 2], sizes: [[1, 2]] },
      },
      render({ p, ws }, w) {
        const team = K.teamOf(p);
        const open = ws.roles.filter((r) => !r.filled);
        if (w.variant === "roles") {
          if (!ws.roles.length) return empty("List the roles your team still needs.", "people", "Add a role");
          const room = fit(w.h, open.length, 34);
          return `<ul class="wg-list wg-list--rows">${open.slice(0, room).map((r) => `<li><span class="wg-text">${esc(r.title)}</span><span class="wg-chip">Open</span></li>`).join("") || `<li class="wg-sub">Every role is filled.</li>`}</ul>${more(open.length - room, "people")}`;
        }
        return `<div class="wg-col">${avatarStack(team.map((t) => t.person), 32)}<span class="wg-strong">${team.length === 1 ? "Just you" : team.length + " people"}</span><span class="wg-sub">${open.length ? `${open.length} role${open.length === 1 ? "" : "s"} still open` : "No open roles"}</span></div>`;
      },
    },
    interviews: {
      name: "Customer interviews", icon: "mic", section: "interviews", desc: "Conversations logged toward the 8–10 for rung 1.",
      variants: { count: { name: "Interviews", min: [1, 1], sizes: [[1, 1], [2, 1]] } },
      render({ ws }) {
        const items = ws.interviews.items;
        const pay = items.filter((x) => x.pay === "yes").length;
        return `<div class="wg-split">${ring(Math.min(100, (items.length / 8) * 100), String(items.length))}<div><span class="wg-strong">${items.length} of 8 interviews</span><span class="wg-sub">${items.length ? `${pay} would pay` : "Log every problem interview."}</span></div></div>`;
      },
    },
    canvas: {
      name: "Lean canvas", icon: "canvas", section: "canvas", desc: "Your business model on one page.",
      variants: {
        uvp: { name: "Value proposition", min: [1, 1], sizes: [[1, 1], [2, 1]] },
        full: { name: "Whole canvas", min: [3, 2], sizes: [[3, 2], [3, 3]] },
      },
      render({ ws }, w) {
        const c = ws.canvas;
        if (w.variant === "uvp") return c.uvp ? `<p class="wg-quote">${esc(short(c.uvp, 180))}</p>` : empty("Write your one-line value proposition.", "canvas", "Open the canvas");
        return `<div class="wg-canvas">${P.canvas.map(([key, label]) => `<div class="wg-cbox wg-cbox--${key}"><span class="wg-sub">${esc(label)}</span><span>${esc(short(c[key] || "", 90)) || "<em>—</em>"}</span></div>`).join("")}</div>`;
      },
    },
    note: {
      name: "Note", icon: "note", desc: "A quick note for the whole team.",
      variants: { note: { name: "Note", min: [1, 1], sizes: [[1, 1], [1, 2], [2, 1], [2, 2]] } },
      render(ctx, w) { return `<textarea class="wg-note" data-wnote="${esc(w.id)}" maxlength="600" placeholder="Write a note…" aria-label="Note">${esc(w.opts.text || "")}</textarea>`; },
    },
    countdown: {
      name: "Countdown", icon: "calendar", desc: "Days left to a launch, demo day or deadline.",
      variants: { days: { name: "Countdown", min: [1, 1], sizes: [[1, 1], [2, 1]], pick: "date" } },
      render(ctx, w) {
        const o = w.opts;
        if (!o.date) return empty("Pick a date in the widget’s settings.");
        const n = daysTo(o.date);
        return `<div class="wg-col"><span class="wg-big">${Math.abs(n)}<small> day${Math.abs(n) === 1 ? "" : "s"}</small></span><span class="wg-sub">${n >= 0 ? "to" : "since"} ${esc(o.label || "the big day")} · ${dayLabel(o.date)}</span></div>`;
      },
    },
  };
  const variantOf = (w) => { const t = TYPES[w.type]; return t && (t.variants[w.variant] || Object.values(t.variants)[0]); };
  function titleOf(w, ctx) {
    const t = TYPES[w.type];
    if (!t) return "Widget";
    if (w.type === "doc" && w.variant === "one") { const d = ctx.docs.find((x) => x.id === w.opts.docId); return d ? d.title : "Document"; }
    if (w.type === "metrics" && w.variant === "kpi") { const m = ctx.ws.metrics.items.find((x) => x.id === w.opts.metricId) || ctx.ws.metrics.items[0]; return m ? m.name : "Metric"; }
    if (w.type === "countdown") return w.opts.label || "Countdown";
    if (w.type === "finance") return { runway: "Runway", summary: "Finance", chart: "Cash flow" }[w.variant] || t.name;
    return t.name;
  }

  /* ---------- Layout maths ---------- */
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  /** Put `pinned` where it is and move anything it overlaps down, cascading. */
  function resolve(list, pinned) {
    const out = [];
    const first = list.find((w) => w.id === pinned);
    if (first) out.push(Object.assign({}, first));
    list.filter((w) => w.id !== pinned).sort((a, b) => a.y - b.y || a.x - b.x).forEach((w) => {
      const c = Object.assign({}, w);
      while (out.some((o) => overlaps(o, c))) c.y += 1;
      out.push(c);
    });
    return out;
  }
  /** The first gap (top to bottom, left to right) that fits w × h. */
  function freeSpot(list, w, h) {
    for (let y = 0; y < 400; y++) for (let x = 0; x + w <= COLS; x++) {
      const c = { x, y, w, h };
      if (!list.some((o) => overlaps(o, c))) return { x, y };
    }
    return { x: 0, y: 0 };
  }
  const rowsUsed = (list) => list.reduce((m, w) => Math.max(m, w.y + w.h), 0);

  /* ---------- Rendering ---------- */
  let ctx = null;      // { pid, p, ws, docs, who, go(section), route() }
  let grid = null;
  let dragging = null; // the drag or resize in progress
  let pendingRender = false;
  const celebrate = new Set(); // widgets just added: scroll to them and flash them once drawn

  /** A widget's markup; `place` adds its spot on the grid (left out for the drawer's preview and for comparing). */
  function widgetHTML(w, { place = true } = {}) {
    const t = TYPES[w.type];
    const v = variantOf(w);
    if (!t || !v) return "";
    return `
      <article class="wg wg--${esc(w.type)} wg--${esc(w.type)}-${esc(w.variant)}" data-wid="${esc(w.id)}"${place ? ` style="grid-column:${w.x + 1} / span ${w.w}; grid-row:${w.y + 1} / span ${w.h}; --order:${w.y * COLS + w.x}"` : ""} aria-label="${esc(titleOf(w, ctx))}">
        <header class="wg-head" data-wdrag>
          <span class="wg-ico">${icon(t.icon)}</span>
          ${t.section ? `<button class="wg-title" type="button" data-wgo="${t.section}" aria-label="Open ${esc(TYPES[w.type].name)}">${esc(t.name)}</button>` : `<span class="wg-title">${esc(t.name)}</span>`}
          <span class="wg-tools">
            <button class="wg-tool wg-grip" type="button" data-wdrag aria-label="Move ${esc(titleOf(w, ctx))}" title="Drag to move">${icon("grip")}</button>
            <button class="wg-tool" type="button" data-wmenu="${esc(w.id)}" aria-label="Options for ${esc(titleOf(w, ctx))}" title="Options">${icon("more")}</button>
          </span>
        </header>
        <div class="wg-body">${t.render(ctx, w)}</div>
        <span class="wg-resize" data-wresize aria-hidden="true" title="Drag to resize"></span>
      </article>`;
  }

  function render(container, c) {
    ctx = c;
    if (dragging) { pendingRender = true; return; }
    const layout = c.ws.layout;
    if (!container.dataset.bound) { container.dataset.bound = "1"; bind(container); }
    grid = container;
    if (!layout.length) {
      container.classList.add("is-empty");
      container.innerHTML = `
        <div class="mf-empty">
          <span class="mf-empty-ico">${icon("grid")}</span>
          <h2>Your Mainframe is empty</h2>
          <p>Pick the widgets you want to see at a glance: tasks, runway, metrics, documents and more. Everything also lives in the sidebar on the left.</p>
          <button class="btn btn--ink" type="button" data-mf-edit>${icon("plus")} Add widgets</button>
        </div>`;
      return;
    }
    if (container.classList.contains("is-empty")) { container.classList.remove("is-empty"); container.textContent = ""; }
    container.style.setProperty("--mf-rows", Math.max(1, rowsUsed(layout)));
    // Keyed: a widget is re-drawn only when what it shows changed, and never
    // while someone types in it; one that only moved keeps its element, so a
    // drop's glide plays out. Focus on a ticked box comes back after a re-draw.
    const active = document.activeElement;
    const inWid = active && container.contains(active) && active.closest(".wg") ? active.closest(".wg").dataset.wid : null;
    const focusAttr = inWid && ["data-wtask", "data-wgtm", "data-wstep"].find((a) => active.hasAttribute(a));
    const focusSel = focusAttr ? `[${focusAttr}="${CSS.escape(active.getAttribute(focusAttr))}"]` : null;
    const ids = new Set(layout.map((w) => w.id));
    Array.from(container.children).forEach((el) => { if (!el.classList.contains("wg") || !ids.has(el.dataset.wid)) el.remove(); });
    const old = new Map(Array.from(container.children).map((el) => [el.dataset.wid, el]));
    layout.forEach((w, i) => {
      const html = widgetHTML(w, { place: false });
      let el = old.get(w.id);
      const typing = el && el.contains(active) && active.matches("textarea");
      if (!el || (el._html !== html && !typing)) {
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();
        const fresh = tpl.content.firstElementChild;
        fresh._html = html;
        if (el) el.replaceWith(fresh);
        el = fresh;
      }
      placeEl(el, w);
      el.style.setProperty("--order", w.y * COLS + w.x);
      if (container.children[i] !== el) container.insertBefore(el, container.children[i] || null);
      if (celebrate.has(w.id)) {
        celebrate.delete(w.id);
        el.classList.add("is-new");
        setTimeout(() => el.classList.remove("is-new"), 1600);
        requestAnimationFrame(() => el.scrollIntoView({ behavior: Mori.motion.reduced() ? "auto" : "smooth", block: "nearest" }));
      }
    });
    if (inWid && !container.contains(active)) {
      const box = $(`.wg[data-wid="${CSS.escape(inWid)}"]`, container);
      const target = box && ((focusSel && $(focusSel, box)) || $("input, .wg-title", box));
      if (target) target.focus({ preventScroll: true });
    }
  }

  /* ---------- Saving the layout ---------- */
  const failed = (err) => Mori.people.fail(err && err.code === "signed-out" ? err : new Error("That change wasn’t saved: " + ((err && err.message) || "please try again.")));
  /** Move/resize: apply the new places to whatever the latest layout is. */
  function savePlaces(next) {
    const places = new Map(next.map((w) => [w.id, w]));
    return W.change(ctx.pid, "layout", (cur) => {
      const merged = cur.map((w) => { const n = places.get(w.id); return n ? Object.assign({}, w, { x: n.x, y: n.y, w: n.w, h: n.h }) : w; });
      return resolve(merged, null);
    }).catch(failed);
  }
  function addWidget(w) {
    return W.change(ctx.pid, "layout", (cur) => {
      if (cur.some((x) => x.id === w.id)) return cur;
      const spot = freeSpot(cur, w.w, w.h);
      return cur.concat([Object.assign({}, w, spot)]);
    }).catch(failed);
  }
  function updateWidget(id, patch) {
    return W.change(ctx.pid, "layout", (cur) => resolve(cur.map((w) => (w.id === id ? Object.assign({}, w, patch, { opts: Object.assign({}, w.opts, patch.opts || {}) }) : w)), id)).catch(failed);
  }
  function removeWidget(id) { return W.change(ctx.pid, "layout", (cur) => cur.filter((w) => w.id !== id)).catch(failed); }

  /* ---------- Drag to move, drag the corner to resize ---------- */
  const metrics = () => {
    const r = grid.getBoundingClientRect();
    const cs = getComputedStyle(grid);
    const gap = parseFloat(cs.columnGap) || 16;
    const rowH = parseFloat(cs.gridAutoRows) || 150;
    const cols = cs.gridTemplateColumns.split(" ").length;
    return { r, gap, rowH, colW: (r.width - gap * (cols - 1)) / cols, cols };
  };
  const stacked = () => grid && metrics().cols < COLS;
  function placeEl(el, w) { el.style.gridColumn = `${w.x + 1} / span ${w.w}`; el.style.gridRow = `${w.y + 1} / span ${w.h}`; }
  /** Show `preview` on screen: widgets that change place glide there. */
  function showPreview(preview, skipId) {
    const before = new Map();
    $$(".wg", grid).forEach((el) => before.set(el.dataset.wid, el.getBoundingClientRect()));
    preview.forEach((w) => { if (w.id === skipId) return; const el = $(`.wg[data-wid="${CSS.escape(w.id)}"]`, grid); if (el) placeEl(el, w); });
    grid.style.setProperty("--mf-rows", Math.max(1, rowsUsed(preview)));
    if (Mori.motion.reduced()) return;
    $$(".wg", grid).forEach((el) => {
      if (el.dataset.wid === skipId) return;
      const a = before.get(el.dataset.wid);
      const b = el.getBoundingClientRect();
      if (a && (Math.abs(a.left - b.left) > 1 || Math.abs(a.top - b.top) > 1)) el.animate([{ translate: `${a.left - b.left}px ${a.top - b.top}px` }, { translate: "0 0" }], { duration: 300, easing: EASE });
    });
  }

  function startDrag(e, el, mode) {
    if (stacked()) { toast("Rearrange the Mainframe on a larger screen", { icon: "grid" }); return; }
    const id = el.dataset.wid;
    const layout = ctx.ws.layout.map((w) => Object.assign({}, w));
    const self = layout.find((w) => w.id === id);
    if (!self) return;
    e.preventDefault();
    const m = metrics();
    const box = el.getBoundingClientRect();
    const v = variantOf(self);
    const ghost = document.createElement("div");
    ghost.className = "wg-ghost";
    grid.appendChild(ghost);
    placeEl(ghost, self);
    dragging = { id, el, mode, layout, self, m, startX: e.clientX, startY: e.clientY, box, target: Object.assign({}, self), ghost, pointerId: e.pointerId, v };
    el.classList.add(mode === "move" ? "is-dragging" : "is-resizing");
    grid.classList.add("is-arranging");
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  }
  function moveDrag(e) {
    const d = dragging;
    if (!d || e.pointerId !== d.pointerId) return;
    const { m, self, v } = d;
    const step = (px, size) => Math.round(px / (size + m.gap));
    let t;
    if (d.mode === "move") {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      d.el.style.translate = `${dx}px ${dy}px`;
      const x = Math.max(0, Math.min(COLS - self.w, self.x + step(dx, m.colW)));
      const y = Math.max(0, self.y + step(dy, m.rowH));
      t = Object.assign({}, self, { x, y });
    } else {
      const w = Math.max(v.min[0], Math.min(COLS - self.x, Math.round((e.clientX - d.box.left + m.gap) / (m.colW + m.gap))));
      const h = Math.max(v.min[1], Math.min(MAXH, Math.round((e.clientY - d.box.top + m.gap) / (m.rowH + m.gap))));
      t = Object.assign({}, self, { w, h });
      placeEl(d.el, t);
    }
    if (t.x === d.target.x && t.y === d.target.y && t.w === d.target.w && t.h === d.target.h) return;
    d.target = t;
    placeEl(d.ghost, t);
    d.preview = resolve(d.layout.map((w) => (w.id === d.id ? t : w)), d.id);
    showPreview(d.preview, d.id);
  }
  function endDrag(e) {
    const d = dragging;
    if (!d || (e && e.pointerId !== d.pointerId)) return;
    dragging = null;
    const before = d.el.getBoundingClientRect();
    d.el.style.translate = "";
    d.el.classList.remove("is-dragging", "is-resizing");
    grid.classList.remove("is-arranging");
    d.ghost.remove();
    const changed = d.preview && (d.target.x !== d.self.x || d.target.y !== d.self.y || d.target.w !== d.self.w || d.target.h !== d.self.h);
    if (changed) {
      placeEl(d.el, d.target);
      if (!Mori.motion.reduced() && d.mode === "move") {
        const after = d.el.getBoundingClientRect();
        d.el.animate([{ translate: `${before.left - after.left}px ${before.top - after.top}px` }, { translate: "0 0" }], { duration: 320, easing: EASE });
      }
      savePlaces(d.preview);
    } else {
      placeEl(d.el, d.self);
      showPreview(d.layout, null);
    }
    if (pendingRender) { pendingRender = false; Mori.mainframe.render(grid, ctx); }
  }

  /* ---------- Events ---------- */
  const notes = new Map(); // note id → { text, timer } not saved yet
  function saveNote(id) {
    const n = notes.get(id);
    if (!n) return;
    clearTimeout(n.timer);
    notes.delete(id);
    updateWidget(id, { opts: { text: n.text } });
  }
  window.addEventListener("pagehide", () => Array.from(notes.keys()).forEach(saveNote));
  function bind(container) {
    container.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const corner = e.target.closest("[data-wresize]");
      const head = e.target.closest("[data-wdrag]");
      const el = e.target.closest(".wg");
      if (!el) return;
      if (corner) { startDrag(e, el, "resize"); return; }
      // The grip moves the widget for any pointer; the top bar does for a mouse or pen.
      if (head && (e.target.closest(".wg-grip") || (e.pointerType !== "touch" && !e.target.closest("button, a, input, textarea, select")))) startDrag(e, el, "move");
    });
    container.addEventListener("pointermove", moveDrag);
    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
    container.addEventListener("lostpointercapture", (e) => { if (dragging && e.pointerId === dragging.pointerId) endDrag(e); });
    container.addEventListener("keydown", (e) => {
      // Keyboard: arrows on the grip move the widget a cell.
      const grip = e.target.closest(".wg-grip");
      if (!grip || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) || stacked()) return;
      e.preventDefault();
      const id = grip.closest(".wg").dataset.wid;
      const w = ctx.ws.layout.find((x) => x.id === id);
      if (!w) return;
      const t = Object.assign({}, w, {
        x: Math.max(0, Math.min(COLS - w.w, w.x + (e.key === "ArrowRight") - (e.key === "ArrowLeft"))),
        y: Math.max(0, w.y + (e.key === "ArrowDown") - (e.key === "ArrowUp")),
      });
      savePlaces(resolve(ctx.ws.layout.map((x) => (x.id === id ? t : x)), id)).then(() => { const g = $(`.wg[data-wid="${CSS.escape(id)}"] .wg-grip`, grid); if (g) g.focus(); });
    });
    container.addEventListener("click", (e) => {
      if (e.target.closest("[data-mf-edit]")) { openGallery(e.target.closest("[data-mf-edit]")); return; }
      const go = e.target.closest("[data-wgo]");
      if (go) { ctx.go(go.dataset.wgo); return; }
      const doc = e.target.closest("[data-wdoc]");
      if (doc) { ctx.go("docs/" + doc.dataset.wdoc); return; }
      const menu = e.target.closest("[data-wmenu]");
      if (menu) { openMenu(menu); }
    });
    container.addEventListener("change", (e) => {
      const t = e.target;
      if (t.matches("[data-wtask]")) { S.toggleTask(ctx.pid, t.dataset.wtask).saved.catch(failed); return; }
      if (t.matches("[data-wgtm]")) { const key = t.dataset.wgtm; const on = t.checked; W.change(ctx.pid, "gtm", (g) => { g.done[key] = on || undefined; if (!on) delete g.done[key]; return g; }).catch(failed); return; }
      if (t.matches("[data-wstep]")) { const key = t.dataset.wstep; const on = t.checked; W.change(ctx.pid, "ladder", (l) => { if (on) l.done[key] = true; else delete l.done[key]; return l; }).catch(failed); }
    });
    container.addEventListener("input", (e) => {
      const note = e.target.closest("[data-wnote]");
      if (!note) return;
      const id = note.dataset.wnote;
      const n = notes.get(id) || {};
      clearTimeout(n.timer);
      notes.set(id, { text: note.value, timer: setTimeout(() => saveNote(id), 700) });
    });
    container.addEventListener("focusout", (e) => { const note = e.target.closest("[data-wnote]"); if (note) saveNote(note.dataset.wnote); });
  }

  /* ---------- A widget's options menu ---------- */
  function closeMenu() { const m = $(".wg-pop"); if (m) m.remove(); document.removeEventListener("pointerdown", outside, true); }
  const outside = (e) => { if (!e.target.closest(".wg-pop") && !e.target.closest("[data-wmenu]")) closeMenu(); };
  function openMenu(btn) {
    const open = $(".wg-pop");
    closeMenu();
    if (open && open.dataset.for === btn.dataset.wmenu) return;
    const id = btn.dataset.wmenu;
    const pop = document.createElement("div");
    pop.className = "wg-pop";
    pop.dataset.for = id;
    pop.setAttribute("role", "menu");
    pop.innerHTML = `<button type="button" role="menuitem" data-pop="edit">${icon("sliders")} Style and size</button><button type="button" role="menuitem" data-pop="remove">${icon("trash")} Remove</button>`;
    btn.closest(".wg").appendChild(pop);
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pop]");
      if (!b) return;
      if (b.dataset.pop === "edit") { closeMenu(); openGallery(btn, { edit: id }); return; }
      if (Mori.people.confirmTap(b, "Tap again to remove")) { closeMenu(); removeWidget(id); toast("Widget removed", { icon: "trash" }); }
    });
    setTimeout(() => document.addEventListener("pointerdown", outside, true), 0);
    $("button", pop).focus();
  }

  /* ---------- The widget drawer (right side) ---------- */
  const PREVIEW = { colW: 300, rowH: 150, gap: 16 };
  function openGallery(opener, { edit } = {}) {
    if (!ctx) return;
    const root = createModal("mfGallery", { label: "Add to Mainframe", cls: "modal-root--drawer", panelCls: "modal--drawer mf-drawer" });
    const panel = $(".modal", root);
    const editing = edit ? ctx.ws.layout.find((w) => w.id === edit) : null;
    let state = editing ? { type: editing.type, variant: editing.variant, size: [editing.w, editing.h], opts: Object.assign({}, editing.opts) } : null;

    const listView = () => `
      <div class="modal-head"><div><h2 id="mfgTitle">Add to Mainframe</h2><p class="meta">Pick a widget, then its style and size.</p></div><button class="icon-btn modal-x" data-close aria-label="Close">${icon("x")}</button></div>
      <div class="modal-body"><div class="mfg-list">${Object.entries(TYPES).map(([id, t]) => `
        <button class="mfg-type" type="button" data-mfg-type="${id}">
          <span class="mfg-ico">${icon(t.icon)}</span>
          <span class="mfg-copy"><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></span>
          <span class="mfg-count">${Object.keys(t.variants).length > 1 ? `${Object.keys(t.variants).length} styles` : ""}</span>
        </button>`).join("")}</div></div>`;

    const optionsHTML = (t, v) => {
      if (v.pick === "doc") {
        const docs = ctx.docs;
        if (!docs.length) return `<div class="field"><span>Document</span><p class="meta">No documents yet. <button class="link-btn" type="button" data-mfg-newdoc>Write one</button> first.</p></div>`;
        if (!state.opts.docId || !docs.some((d) => d.id === state.opts.docId)) state.opts.docId = docs[0].id;
        return `<label class="field"><span>Which document?</span><select class="select" data-mfg-opt="docId">${docs.map((d) => `<option value="${esc(d.id)}" ${d.id === state.opts.docId ? "selected" : ""}>${esc(d.title)}</option>`).join("")}</select></label>`;
      }
      if (v.pick === "metric") {
        const items = ctx.ws.metrics.items;
        if (!items.length) return `<div class="field"><span>Metric</span><p class="meta">No metrics yet. Add one in <button class="link-btn" type="button" data-wgo-drawer="metrics">Metrics</button>.</p></div>`;
        if (!state.opts.metricId || !items.some((m) => m.id === state.opts.metricId)) state.opts.metricId = items[0].id;
        return `<label class="field"><span>Which metric?</span><select class="select" data-mfg-opt="metricId">${items.map((m) => `<option value="${esc(m.id)}" ${m.id === state.opts.metricId ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>`;
      }
      if (v.pick === "date") {
        return `<div class="form-grid"><label class="field"><span>Counting down to</span><input class="input" data-mfg-opt="label" maxlength="40" placeholder="Demo day" value="${esc(state.opts.label || "")}"></label>
          <label class="field"><span>Date</span><input class="input" type="date" data-mfg-opt="date" value="${esc(state.opts.date || "")}"></label></div>`;
      }
      return "";
    };

    const configView = () => {
      const t = TYPES[state.type];
      const v = t.variants[state.variant];
      const sizeOK = (s) => s[0] >= v.min[0] && s[1] >= v.min[1];
      if (!sizeOK(state.size)) state.size = v.sizes[0].slice();
      const sizes = v.sizes.some((s) => s[0] === state.size[0] && s[1] === state.size[1]) ? v.sizes : v.sizes.concat([state.size]);
      return `
        <div class="modal-head">
          ${editing ? "" : `<button class="icon-btn" type="button" data-mfg-back aria-label="Back to all widgets">${icon("chevronLeft")}</button>`}
          <div><h2 id="mfgTitle">${esc(t.name)}</h2><p class="meta">${esc(t.desc)}</p></div>
          <button class="icon-btn modal-x" data-close aria-label="Close">${icon("x")}</button>
        </div>
        <div class="modal-body mfg-config">
          ${Object.keys(t.variants).length > 1 ? `<div class="field"><span>Style</span><div class="seg" id="mfgVariant" data-value="${state.variant}">${Object.entries(t.variants).map(([id, x]) => `<button data-value="${id}">${esc(x.name)}</button>`).join("")}</div></div>` : ""}
          <div class="field"><span>Size</span><div class="mfg-sizes" role="radiogroup" aria-label="Size">${sizes.map((s) => `<button type="button" class="mfg-size" role="radio" aria-checked="${s[0] === state.size[0] && s[1] === state.size[1]}" data-mfg-size="${s[0]}x${s[1]}"><span class="mfg-size-pic" style="--w:${s[0]};--h:${s[1]}"></span>${s[0]} × ${s[1]}</button>`).join("")}</div>
            <p class="meta mfg-min">Takes at least ${v.min[0]} column${v.min[0] > 1 ? "s" : ""} × ${v.min[1]} row${v.min[1] > 1 ? "s" : ""}. Drag its corner on the Mainframe to resize.</p></div>
          ${optionsHTML(t, v)}
          <div class="field"><span>Preview</span><div class="mfg-preview" id="mfgPreview"></div></div>
        </div>
        <div class="modal-foot">
          ${editing ? `<button class="btn btn--danger mfg-remove" type="button" data-mfg-remove>${icon("trash")} Remove</button>` : ""}
          <button class="btn" type="button" data-close>Cancel</button>
          <button class="btn btn--ink" type="button" data-mfg-save>${icon(editing ? "check" : "plus")} ${editing ? "Save" : "Add widget"}</button>
        </div>`;
    };

    const drawPreview = () => {
      const box = $("#mfgPreview", panel);
      if (!box) return;
      const [cw, ch] = state.size;
      const wpx = cw * PREVIEW.colW + (cw - 1) * PREVIEW.gap;
      const hpx = ch * PREVIEW.rowH + (ch - 1) * PREVIEW.gap;
      const room = box.clientWidth || 420;
      const scale = Math.min(1, room / wpx);
      const w = { id: "preview", type: state.type, variant: state.variant, x: 0, y: 0, w: cw, h: ch, opts: state.opts };
      box.style.height = Math.round(hpx * scale) + "px";
      box.innerHTML = `<div class="mfg-stage" style="width:${wpx}px;height:${hpx}px;transform:scale(${scale})">${widgetHTML(w, { place: false })}</div>`;
      $$("button, input, textarea, select", box).forEach((x) => { x.tabIndex = -1; x.disabled = x.tagName !== "TEXTAREA"; if (x.tagName === "TEXTAREA") x.readOnly = true; });
    };

    const show = () => {
      panel.innerHTML = state ? configView() : listView();
      panel.setAttribute("aria-labelledby", "mfgTitle");
      panel.scrollTop = 0;
      const sg = $("#mfgVariant", panel);
      if (sg) seg(sg, (val) => { state.variant = val; const v = TYPES[state.type].variants[val]; state.size = v.sizes[0].slice(); show(); });
      if (state) requestAnimationFrame(drawPreview);
      const focus = $(state ? "[data-mfg-save]" : "[data-mfg-type]", panel);
      if (focus && Mori.modal.isOpen("mfGallery")) focus.focus({ preventScroll: true });
    };

    if (!panel.dataset.bound) {
      panel.dataset.bound = "1";
      panel.addEventListener("click", (e) => panel._on && panel._on(e));
      panel.addEventListener("input", (e) => panel._onInput && panel._onInput(e));
    }
    panel._on = (e) => {
      const type = e.target.closest("[data-mfg-type]");
      if (type) { const t = TYPES[type.dataset.mfgType]; const [vid, v] = Object.entries(t.variants)[0]; state = { type: type.dataset.mfgType, variant: vid, size: v.sizes[0].slice(), opts: {} }; show(); return; }
      if (e.target.closest("[data-mfg-back]")) { state = null; show(); return; }
      const size = e.target.closest("[data-mfg-size]");
      if (size) { state.size = size.dataset.mfgSize.split("x").map(Number); $$("[data-mfg-size]", panel).forEach((b) => b.setAttribute("aria-checked", String(b === size))); drawPreview(); return; }
      if (e.target.closest("[data-mfg-newdoc]")) { Mori.modal.close({ restoreFocus: false }); ctx.go("docs"); return; }
      const goto = e.target.closest("[data-wgo-drawer]");
      if (goto) { Mori.modal.close({ restoreFocus: false }); ctx.go(goto.dataset.wgoDrawer); return; }
      if (e.target.closest("[data-mfg-remove]")) {
        const b = e.target.closest("[data-mfg-remove]");
        if (!Mori.people.confirmTap(b, "Tap again to remove")) return;
        Mori.modal.close({ restoreFocus: false });
        removeWidget(editing.id);
        toast("Widget removed", { icon: "trash" });
        return;
      }
      if (e.target.closest("[data-mfg-save]")) {
        const t = TYPES[state.type];
        const v = t.variants[state.variant];
        if (v.pick === "doc" && !state.opts.docId) { toast("Write a document first", { icon: "file" }); return; }
        if (v.pick === "metric" && !state.opts.metricId) { toast("Add a metric first", { icon: "chart" }); return; }
        if (v.pick === "date" && !state.opts.date) { toast("Pick a date", { icon: "calendar" }); const d = $('[data-mfg-opt="date"]', panel); if (d) d.focus(); return; }
        const [w, h] = state.size;
        Mori.modal.close({ restoreFocus: false });
        if (editing) {
          updateWidget(editing.id, { variant: state.variant, w: Math.min(w, COLS - editing.x), h, opts: state.opts });
          toast("Widget updated", { icon: "check" });
        } else {
          const id = W.uid("w");
          celebrate.add(id);
          addWidget({ id, type: state.type, variant: state.variant, x: 0, y: 0, w, h, opts: state.opts });
          toast(`${t.name} added to your Mainframe`, { icon: "check" });
        }
      }
    };
    panel._onInput = (e) => {
      const o = e.target.closest("[data-mfg-opt]");
      if (!o || !state) return;
      state.opts[o.dataset.mfgOpt] = o.value;
      drawPreview();
    };
    show();
    Mori.modal.open("mfGallery", { opener });
    requestAnimationFrame(() => { if (state) drawPreview(); });
  }

  Mori.mainframe = { render, openGallery, TYPES, resolve, freeSpot };
})();
