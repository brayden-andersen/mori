/* ==========================================================================
   Mori: Sandbox — Sprints
   --------------------------------------------------------------------------
   Two-week online sprints, grouped in lobbies by niche. The first ones
   haven't run yet, and the page says so plainly. Three views, routed by the
   address so links can be shared and the back button works:
     sprints               your spots, the lobbies, what starts next, how sprints work
     sprints#lobby/<id>    a lobby: its upcoming and past sprints
     sprints#sprint/<id>   a sprint: brief, dates, team size, how teams
                                form, what gets verified, how badges are earned,
                                and "Save my spot"
   The catalogue is SandBox's own (data.js). Saved spots go through
   state.js: Supabase for Google members, this browser for guests and demo
   accounts.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, esc, icon, toast } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const view = $("#sprintsView");

  /* ---------- The catalogue, with dates worked out from today ---------- */
  const DAY = 864e5;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dateIn = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); return new Date(d.getTime() + n * DAY); };
  const fmt = (d, opts = {}) => d.toLocaleDateString(Mori.i18n.locale, Object.assign({ day: "numeric", month: "short" }, opts));
  const kindOf = (x) => D.sprintKinds[x.kind] || D.sprintKinds.problem;
  const lobbyOf = (id) => D.sprintLobbies.find((l) => l.id === id) || null;
  const sprint = (id) => D.sprints.find((x) => x.id === id) || null;
  function dates(x) {
    const start = dateIn(x.startsIn);
    const end = dateIn(x.startsIn + D.sprintHow.days - 1);
    return { start, end, label: `${fmt(start)} ${Mori.i18n.t("to")} ${fmt(end, { year: "numeric" })}`, iso: iso(start) };
  }
  const upcoming = (list = D.sprints) => list.filter((x) => x.startsIn >= 0).sort((a, b) => a.startsIn - b.startsIn);
  const startsLine = (x) => (x.startsIn === 0 ? "Starts today" : x.startsIn === 1 ? "Starts tomorrow" : `Starts in ${x.startsIn} days`);

  /* ---------- Pieces ---------- */
  const kindChip = (x) => { const k = kindOf(x); return `<span class="sp-kind" style="--c1:${k.c1};--c2:${k.c2}">${icon(k.icon)} ${esc(k.name)}</span>`; };
  const rungChip = (x) => { const r = kindOf(x).rung; return `<span class="chip chip--gray">${icon("ladder")} Toward rung ${r} · ${esc(D.ladder[r].stage)}</span>`; };
  const savedChip = `<span class="chip sp-saved-chip">${icon("check")} Spot saved</span>`;
  function sprintRow(x, { lobby = true } = {}) {
    const d = dates(x);
    const l = lobbyOf(x.lobby);
    return `
      <li><a class="card spotlight sp-row" href="#sprint/${encodeURIComponent(x.id)}">
        <span class="sp-when" aria-hidden="true"><b>${esc(fmt(d.start, { month: undefined }))}</b>${esc(fmt(d.start, { day: undefined }))}</span>
        <div class="sp-row-main">
          <b>${esc(x.title)}</b>
          <span class="meta">${lobby && l ? `${esc(l.name)} · ` : ""}${esc(startsLine(x))} · teams of ${esc(x.teamSize)}</span>
        </div>
        ${S.sprints.has(x.id) ? savedChip : ""}
        <span class="go" aria-hidden="true">${icon("arrowRight")}</span>
      </a></li>`;
  }
  const crumbs = (...parts) => `<nav class="crumbs" aria-label="Breadcrumb"><a href="home">Home</a> <span class="sep">/</span> ${parts.join(' <span class="sep">/</span> ')}</nav>`;
  const notRunYet = `<p class="sp-note">${icon("calendar")} <span>The first sprints haven’t run yet. Save a spot and you’ll be in the first teams. Dates and topics can still change.</span></p>`;
  const emptyBox = (ic, title, sub, action = "") => `<div class="empty sp-empty"><span class="empty-ico">${icon(ic)}</span><div>${title}</div><div class="meta">${sub}</div>${action}</div>`;

  /* ---------- Views ---------- */
  function overview() {
    const mine = S.sprints.spots().map((s) => sprint(s.id)).filter(Boolean).sort((a, b) => a.startsIn - b.startsIn);
    const next = upcoming();
    return `
      <header class="pagehead"><div>
        ${crumbs("<span>Sprints</span>")}
        <h1 class="title" tabindex="-1">Sprints</h1>
        <p class="meta sp-lead">Two-week online sprints by niche. Team up with founders and specialists, ship real proof, and every sprint your teammates confirm goes on your verified work record.</p>
      </div></header>
      ${notRunYet}
      <section class="panel" aria-labelledby="mineTitle">
        <div class="panel-head"><h3 id="mineTitle">Your spots</h3></div>
        ${mine.length ? `<ul class="sp-list">${mine.map((x) => sprintRow(x)).join("")}</ul>`
          : emptyBox("calendar", "No spots saved yet", "Open a sprint below and save your spot. It shows here and on your homepage.", next[0] ? `<a class="btn" href="#sprint/${encodeURIComponent(next[0].id)}">${icon("arrowRight")} See the next sprint</a>` : "")}
      </section>
      <section class="panel" aria-labelledby="lobbiesTitle">
        <div class="panel-head"><h3 id="lobbiesTitle">Lobbies</h3><span class="meta">${D.sprintLobbies.length} niches</span></div>
        <div class="sp-lobbies">${D.sprintLobbies.map((l) => {
          const n = upcoming(D.sprints.filter((x) => x.lobby === l.id)).length;
          return `<a class="card spotlight sp-lobby" href="#lobby/${encodeURIComponent(l.id)}"><b>${esc(l.name)}</b><span class="meta">${esc(l.blurb)}</span><span class="sp-lobby-count">${n ? `${n} upcoming` : "No sprints scheduled yet"}</span></a>`;
        }).join("")}</div>
      </section>
      <section class="panel" aria-labelledby="nextTitle">
        <div class="panel-head"><h3 id="nextTitle">Starting soon</h3></div>
        <ul class="sp-list">${next.map((x) => sprintRow(x)).join("")}</ul>
      </section>
      ${howHTML()}`;
  }

  function howHTML() {
    return `
      <section class="panel" aria-labelledby="howTitle">
        <div class="panel-head"><h3 id="howTitle">How sprints work</h3></div>
        <div class="sp-kinds">${Object.values(D.sprintKinds).map((k) => `
          <div class="sp-kindcard"><span class="sp-kind-ico" style="--c1:${k.c1};--c2:${k.c2}">${icon(k.icon)}</span><b>${esc(k.name)}</b><span class="meta">${esc(k.blurb)}</span><span class="chip chip--gray">Toward rung ${k.rung}</span></div>`).join("")}</div>
        <div class="sp-how">
          <div><h4>${icon("network")} How teams form</h4><p class="meta">${esc(D.sprintHow.teams)}</p></div>
          <div><h4>${icon("checks")} What gets verified</h4><p class="meta">${esc(D.sprintHow.verify)}</p></div>
          <div><h4>${icon("award")} How badges are earned</h4><p class="meta">${esc(D.sprintHow.badges)}</p></div>
        </div>
      </section>`;
  }

  function lobbyView(id) {
    const l = lobbyOf(id);
    if (!l) return missing("That lobby doesn’t exist", "It may have been renamed.");
    const list = D.sprints.filter((x) => x.lobby === l.id);
    const next = upcoming(list);
    const past = list.filter((x) => x.startsIn < 0);
    return `
      <header class="pagehead"><div>
        ${crumbs('<a href="#">Sprints</a>', `<span>${esc(l.name)}</span>`)}
        <h1 class="title" tabindex="-1">${esc(l.name)}</h1>
        <p class="meta sp-lead">${esc(l.blurb)}</p>
      </div></header>
      <section class="panel" aria-labelledby="upTitle">
        <div class="panel-head"><h3 id="upTitle">Upcoming</h3></div>
        ${next.length ? `<ul class="sp-list">${next.map((x) => sprintRow(x, { lobby: false })).join("")}</ul>`
          : emptyBox("calendar", "No sprints scheduled in this lobby yet", "New sprints are added every few weeks. The other lobbies have sprints starting sooner.", `<a class="btn" href="#">${icon("arrowRight")} All lobbies</a>`)}
      </section>
      <section class="panel" aria-labelledby="pastTitle">
        <div class="panel-head"><h3 id="pastTitle">Past sprints</h3></div>
        ${past.length ? `<ul class="sp-list">${past.map((x) => sprintRow(x, { lobby: false })).join("")}</ul>`
          : emptyBox("clock", "No sprints have run here yet", next[0] ? `The first one starts on ${esc(fmt(dates(next[0]).start, { weekday: "long" }))}. Past sprints and the teams’ proof will show here.` : "Past sprints and the teams’ proof will show here.")}
      </section>`;
  }

  function sprintView(id) {
    const x = sprint(id);
    if (!x) return missing("That sprint doesn’t exist", "It may have moved to another date or lobby.");
    const k = kindOf(x);
    const l = lobbyOf(x.lobby);
    const d = dates(x);
    const saved = S.sprints.has(x.id);
    return `
      <header class="pagehead sp-head"><div>
        ${crumbs('<a href="#">Sprints</a>', l ? `<a href="#lobby/${encodeURIComponent(l.id)}">${esc(l.name)}</a>` : "", `<span>${esc(k.name)}</span>`)}
        <div class="sp-chips">${kindChip(x)}${rungChip(x)}</div>
        <h1 class="title" tabindex="-1">${esc(x.title)}</h1>
        <p class="sp-facts"><span>${icon("calendar")} ${esc(d.label)}</span><span>${icon("clock")} Two weeks, online</span><span>${icon("network")} Teams of ${esc(x.teamSize)}</span></p>
      </div>
      <div class="sp-save">
        ${saved
          ? `<p class="sp-saved">${icon("check")} <span><b>Your spot is saved.</b> We’ll put you in a team before ${esc(fmt(d.start, { weekday: "long" }))}.</span></p><button class="btn" type="button" data-drop-spot="${esc(x.id)}">Cancel my spot</button>`
          : `<button class="btn btn--ink btn--lg" type="button" data-save-spot="${esc(x.id)}">${icon("plus")} Save my spot</button><p class="meta">Free, and you can cancel any time before it starts.</p>`}
      </div></header>
      ${notRunYet}
      <div class="sp-detail">
        <section class="panel"><h3>The brief</h3><p>${esc(x.brief)}</p><p class="meta">${esc(k.blurb)}</p></section>
        <section class="panel"><h3>How teams form</h3><p class="meta">${esc(D.sprintHow.teams)}</p></section>
        <section class="panel"><h3>What gets verified</h3><p>Proof for rung ${k.rung}, <b>${esc(D.ladder[k.rung].stage)}</b>: ${esc(D.ladder[k.rung].proof)}</p><p class="meta">${esc(D.sprintHow.verify)}</p></section>
        <section class="panel"><h3>How badges are earned</h3><p class="meta">${esc(D.sprintHow.badges)}</p></section>
      </div>`;
  }

  function missing(title, sub) {
    return `
      <header class="pagehead"><div>${crumbs('<a href="#">Sprints</a>')}<h1 class="title" tabindex="-1">${esc(title)}</h1></div></header>
      ${emptyBox("search", esc(title), esc(sub), `<a class="btn" href="#">${icon("arrowRight")} All sprints</a>`)}`;
  }

  /* ---------- Routing ---------- */
  function render({ moved = false } = {}) {
    const [kind, id] = decodeURIComponent(location.hash.replace(/^#/, "")).split("/");
    const route = kind === "lobby" && id ? ["lobby", id] : kind === "sprint" && id ? ["sprint", id] : ["", ""];
    view.innerHTML = route[0] === "lobby" ? lobbyView(route[1]) : route[0] === "sprint" ? sprintView(route[1]) : overview();
    const title = $("h1", view);
    document.title = `SandBox • ${route[0] ? title.textContent : "Sprints"}`;
    if (moved) {
      window.scrollTo(0, 0);
      title.focus({ preventScroll: true });
    }
    if (Mori.motion) Mori.motion.refresh(view);
  }
  window.addEventListener("hashchange", () => render({ moved: true }));
  document.addEventListener("mori:change", (e) => { if (e.detail && ["sprintSpots", "settings"].includes(e.detail.key)) render(); });

  /* ---------- Save my spot ---------- */
  view.addEventListener("click", (e) => {
    const save = e.target.closest("[data-save-spot]");
    const drop = e.target.closest("[data-drop-spot]");
    if (!save && !drop) return;
    const id = (save || drop).dataset[save ? "saveSpot" : "dropSpot"];
    const x = sprint(id);
    if (!x) return;
    const work = save ? S.sprints.save(id) : S.sprints.drop(id);
    // The view re-draws straight away (mori:change); keep focus on the button that replaced this one.
    const refocus = () => { const b = $(save ? "[data-drop-spot]" : "[data-save-spot]", view); if (b) b.focus({ preventScroll: true }); };
    refocus();
    work.then(
      () => toast(save ? `Spot saved: ${x.title}` : "Spot cancelled", { icon: save ? "check" : "calendar" }),
      (err) => { Mori.people.fail(err); refocus(); }
    );
  });

  render();
  S.sprints.refresh().catch(() => {});
})();
