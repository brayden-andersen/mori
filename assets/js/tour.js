/* ==========================================================================
   Mori: Sandbox — guided tours (every app page)
   --------------------------------------------------------------------------
   • The site tour starts right after a member first signs up. A slideshow
     in a modal on three pages in turn:
       1. the MORI Network (Discover): finding people, connecting, requests,
          messages and your profile;
       2. Projects: how to start a first project, shown in the slides and
          never forced;
       3. the subscription ladder, ending with "start your first project".
   • The project tour starts when a member declares their first project and
     lands on its Mainframe. A spotlight walks through the sidebar's tools
     (documents among them), the People page (the team, adding people, the
     roles you need), then back to the Mainframe to show how widgets work:
     adding them, and moving and resizing them in edit mode.
   Both can be skipped at any step and taken again from Settings
   (Preferences and Projects) or the footer's Sandbox Guide. Where a member
   is in each tour is kept with their settings, so it follows them across
   devices: settings.tour = { site: network|projects|subscription|done|
   skipped, project: <project id>|done|skipped }.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, toast, avatar, brandMark } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const page = document.body.dataset.page || "";
  const reduced = () => !!(Mori.motion && Mori.motion.reduced());
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const tour = () => Object.assign({}, S.settings().tour);
  const setTour = (patch) => S.saveSettings({ tour: Object.assign(tour(), patch) });
  /** Resolves once no other modal is open (a greeting, the new-project form…). */
  const modalFree = () => new Promise((resolve) => {
    if (!Mori.modal.isOpen()) { resolve(); return; }
    const on = (e) => { if (e.detail && !e.detail.open) { document.removeEventListener("mori:modal", on); setTimeout(resolve, 300); } };
    document.addEventListener("mori:modal", on);
  });

  /* =====================================================================
     The slides' pictures: small, quiet demos of the real thing
     ===================================================================== */
  const av = (txt, tone, size = 34) => `<i class="ta-av ta-av--${tone}" style="--s:${size}px">${esc(txt)}</i>`;
  const rupiah = (n) => "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));
  const cursor = `<i class="ta-cursor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8-6.2 1.6L10 19z"/></svg></i>`;
  const me = () => S.me() || {};

  const ART = {
    // MORI Network
    orbit() {
      const nodes = [[17, 27, "AR", 1], [31, 80, "DS", 2], [80, 23, "NP", 3], [86, 68, "RK", 4], [63, 86, "MI", 5], [11, 63, "YT", 3]];
      return `<div class="ta ta-orbit">
        <svg class="ta-links" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes.map(([x, y], k) => `<line x1="50" y1="50" x2="${x}" y2="${y}" style="--d:${k}"/>`).join("")}</svg>
        ${nodes.map(([x, y, t, tone], k) => `<span class="ta-node" style="left:${x}%;top:${y}%;--d:${k}">${av(t, tone, 34)}</span>`).join("")}
        <span class="ta-node ta-node--you" style="left:50%;top:50%">${avatar(me(), 56)}</span>
      </div>`;
    },
    discover() {
      const people = [["DS", 2, "Dewi S.", "Product designer"], ["MI", 5, "Maya I.", "UI/UX designer"], ["AR", 1, "Arif R.", "Brand designer"]];
      return `<div class="ta ta-discover"><div class="ta-col">
        <div class="ta-card ta-search">${icon("search")}<span class="ta-typed" style="--w:7.5em">UI designer</span><i class="ta-caret"></i></div>
        <div class="ta-pills">${["Specialist", "Design", "Bandung", "4★ and up"].map((t, k) => `<span class="ta-chip ${k === 1 ? "is-red" : ""}" style="--d:${k}">${esc(t)}</span>`).join("")}</div>
        <div class="ta-results">${people.map(([i, tone, n, r], k) => `<div class="ta-card ta-person" style="--d:${k}">${av(i, tone, 32)}<b>${esc(n)}</b><span>${esc(r)}</span></div>`).join("")}</div>
      </div></div>`;
    },
    connect() {
      return `<div class="ta ta-connect"><div class="ta-col">
        <div class="ta-card ta-row">${av("DS", 2, 44)}<div class="ta-copy"><b>Dewi Saraswati</b><span>Product designer · Bandung</span></div>
          <span class="ta-btn ta-swap"><span class="ta-a">${icon("userPlus")} Connect</span><span class="ta-b">${icon("check")} Request sent</span>${cursor}</span></div>
        <p class="ta-card ta-note">“Hi Dewi! I’m building a payments app for warungs and need a designer who gets small shops.”</p>
      </div></div>`;
    },
    requests() {
      return `<div class="ta ta-requests"><div class="ta-col">
        <div class="ta-card ta-row">${av("RK", 4, 38)}<div class="ta-copy"><b>Raka Pratama</b><span>Wants to connect · Fintech founder</span></div>
          <span class="ta-btn ta-swap"><span class="ta-a">Accept</span><span class="ta-b">${icon("message")} Message</span>${cursor}</span></div>
        <div class="ta-card ta-row">${av("DS", 2, 38)}<div class="ta-copy"><b>Dewi Saraswati</b><span>Wants to connect · Product designer</span></div><span class="ta-btn">Ignore</span><span class="ta-btn ta-btn--ink">Accept</span></div>
      </div></div>`;
    },
    profile() {
      const you = me();
      const line = you.headline || (D.roles[you.role] ? D.roles[you.role].label : "Founder");
      return `<div class="ta ta-profile"><div class="ta-col">
        <div class="ta-card ta-pf"><div class="ta-pf-cover"></div>
          <div class="ta-pf-body"><span class="ta-pf-photo">${avatar(you, 50)}</span>
            <div class="ta-copy"><b>${esc(you.name || "You")}</b><span>${esc(line)}</span></div>
            <span class="ta-chip is-red">Open to build</span></div></div>
        <div class="ta-card ta-vis"><span>${icon("shield")} Who sees your full profile</span><span class="ta-seg"><i>Everyone</i><i>Connections</i><b></b></span></div>
      </div></div>`;
    },
    // Projects
    gallery() {
      const cards = [["Warung Pay", "Fintech", 62, true], ["KopiKita", "Food & drink", 38], ["Sawah Data", "Agritech", 80]];
      return `<div class="ta ta-gallery"><div class="ta-cards3">${cards.map(([n, tag, pct, pin], k) => `
        <div class="ta-card ta-proj" style="--d:${k};--p:${pct}%">
          <div class="ta-proj-top"><span class="ta-chip ${k === 0 ? "is-red" : ""}">${esc(tag)}</span>${pin ? `<span class="ta-pin">${icon("pin")}</span>` : ""}</div>
          <b>${esc(n)}</b><span class="ta-line" style="width:84%"></span><span class="ta-line" style="width:58%"></span>
          <span class="ta-bar"><i></i></span>
        </div>`).join("")}</div></div>`;
    },
    declare() {
      return `<div class="ta ta-declare">
        <div class="ta-card ta-form">
          <div class="ta-form-head"><b>Declare a new project</b>${icon("x")}</div>
          <div class="ta-field"><span>Project name</span><span class="ta-input"><span class="ta-typed" style="--w:7em">Warung Pay</span><i class="ta-caret ta-caret--1"></i></span></div>
          <div class="ta-field"><span>Current focus</span><span class="ta-input"><span class="ta-typed ta-typed--2" style="--w:15em">Interview 10 warung owners</span><i class="ta-caret ta-caret--2"></i></span></div>
          <div class="ta-form-foot"><span class="ta-btn ta-btn--ink ta-create">${icon("plus")} Create project</span></div>
        </div></div>`;
    },
    ladder() {
      return `<div class="ta ta-ladder"><div class="ta-col">
        <div class="ta-stairs">${D.ladder.map((l, k) => `<div class="ta-stair ${k <= 2 ? "is-done" : ""} ${k === 2 ? "is-here" : ""}" style="--k:${k}"><i>${k === 2 ? `<em>Rung ${k}</em>` : ""}</i><span>${esc(l.stage)}</span></div>`).join("")}</div>
        <div class="ta-pills">${["Fintech", "B2B", "Prototype"].map((t, k) => `<span class="ta-chip ${k === 0 ? "is-red" : ""}" style="--d:${k + 4}">${t}</span>`).join("")}</div>
      </div></div>`;
    },
    team() {
      const you = me();
      return `<div class="ta ta-team">
        <div class="ta-card ta-teamcard">
          <div class="ta-proj-top"><span class="ta-chip is-red">Fintech</span></div>
          <b>Warung Pay</b>
          <div class="ta-stack"><span style="--k:0">${avatar(you, 36)}</span><span style="--k:1">${av("DS", 2, 36)}</span><span style="--k:2">${av("RK", 4, 36)}</span><span class="ta-plus" style="--k:3">${icon("userPlus")}</span></div>
          <span class="ta-meta">3 people · You and 2 co-founders</span>
        </div></div>`;
    },
    planner() {
      const wgs = ["1/1/3/2", "1/2/2/3", "1/3/2/4", "1/4/2/5", "2/2/3/5"];
      return `<div class="ta ta-planner">
        <div class="ta-card ta-app">
          <div class="ta-app-side">${[0, 1, 2, 3, 4, 5, 6].map((k) => `<span class="ta-line ${k === 0 ? "is-red" : ""}" style="width:${[70, 52, 64, 46, 60, 50, 56][k]}%"></span>`).join("")}</div>
          <div class="ta-app-main"><div class="ta-app-head"><b>Warung Pay</b><span>Mainframe</span></div>
            <div class="ta-wgrid">${wgs.map((a, k) => `<i style="grid-area:${a};--d:${k}"><b></b></i>`).join("")}</div></div>
        </div></div>`;
    },
    // Subscription
    plans() {
      return `<div class="ta ta-plans"><div class="ta-plancols">${D.plans.tiers.map((t, k) => `
        <div class="ta-plancol ${k === 0 ? "is-you" : ""}" style="--k:${k}">${k === 0 ? `<em>You’re here</em>` : ""}<i></i><b>${esc(t.name)}</b><span>${t.monthly ? rupiah(t.monthly) : "Free"}</span></div>`).join("")}</div></div>`;
    },
    climb() {
      const [from, to] = D.plans.tiers;
      return `<div class="ta ta-climb"><div class="ta-card ta-perks">
        <div class="ta-perks-head"><span class="ta-chip">${esc(from.name)}</span>${icon("arrowRight")}<span class="ta-chip is-red">${esc(to.name)}</span></div>
        <ul>${to.perks.slice(1, 5).map((p, k) => `<li style="--k:${k}">${icon("check")}<span>${esc(p)}</span></li>`).join("")}</ul>
        <p class="ta-keep">${icon("shield")} Your projects and documents stay, whatever your plan</p>
      </div></div>`;
    },
    billing() {
      const t = D.plans.tiers.find((x) => x.popular) || D.plans.tiers[1];
      return `<div class="ta ta-billing"><div class="ta-col ta-col--center">
        <span class="ta-seg ta-seg--bill"><i>Monthly</i><i>Yearly</i><b></b></span>
        <div class="ta-card ta-price"><span class="ta-price-a"><b>${rupiah(t.monthly)}</b>/month</span><span class="ta-price-b"><b>${rupiah(t.monthly * 10)}</b>/year</span></div>
        <span class="ta-free">2 months free</span>
      </div></div>`;
    },
    ready() {
      return `<div class="ta ta-ready"><span class="ta-rings"><i></i><i></i><i></i></span><span class="ta-mark">${brandMark("ta-logo")}</span></div>`;
    },
    // The project tour's widget lesson
    widgets() {
      return `<div class="ta-mini" aria-hidden="true"><div class="ta-mini-cells">${"<i></i>".repeat(8)}</div><span class="ta-mini-w"><b></b></span><span class="ta-mini-fixed"><b></b></span></div>`;
    },
  };

  /* =====================================================================
     The site tour
     ===================================================================== */
  const CHAPTERS = [
    { id: "network", label: "MORI Network", url: "network.html#explore" },
    { id: "projects", label: "Projects", url: "projects.html" },
    { id: "subscription", label: "Plans", url: "subscription.html" },
  ];
  const SLIDES = {
    network: [
      { art: "orbit", title: "Welcome to the MORI Network", body: "Founders and specialists building in Indonesia, all in one place. This is where you find a co-founder, your first teammates and people who’ve done it before." },
      { art: "discover", title: "Discover the right people", body: "Search names, skills or regions, then narrow it down by role, experience, industry and verified sprints. People you’re already connected with stay out of the way." },
      { art: "connect", title: "Connect with a note", body: "Send a request with a line about what you’re building. A good note gets more yeses, and once they accept, you’re connected." },
      { art: "requests", title: "Requests and messages", body: "Requests for you wait at the top of this page. Accept one and you can message each other right away." },
      { art: "profile", title: "Let the right people find you", body: "Keep your headline and skills up to date from your profile. Choose who sees your full profile in Settings → Privacy, or go invisible." },
    ],
    projects: [
      { art: "gallery", title: "Your projects live here", body: "Every project you declare or join shows in this gallery. Pin the ones you’re working on and they’ll wait for you on your homepage." },
      { art: "declare", title: "Declare a project in a minute", body: "Press New project, give it a name and say what you’re focused on right now. That’s all it takes to start." },
      { art: "ladder", title: "Tag it, and find your rung", body: "Tags say what it is. The milestone ladder says how far along it is, from Idea declared to Early traction, and what proof the next rung needs." },
      { art: "team", title: "Bring in your co-founders", body: "Add co-founders from your connections when you declare it, or any time later. The whole team works from the same planner." },
      { art: "planner", title: "Then build it in the planner", body: "A project opens on its Mainframe, with tasks, documents, finance, funding and more a click away. No rush: start your first one whenever you’re ready." },
    ],
    subscription: [
      { art: "plans", title: "The SandBox ladder", body: "Four plans, each a rung higher than the last. Everyone starts on Explorer, and it’s free for as long as you like." },
      { art: "climb", title: "Climb as your project grows", body: "Move up for your full launch path, team agreements and member pricing with partners, or back down whenever you want. Your work always stays." },
      { art: "billing", title: "Monthly or yearly", body: "Pay month to month, or yearly and get two months free. These prices are placeholders for now, and payments open soon." },
      { art: "ready", title: "You’re all set", body: "That’s the tour. When you’re ready, declare your first project and we’ll show you around its planner." },
    ],
  };

  let deck = null; // { ch, i } while the slideshow is open
  let closingDeck = false;

  function deckRoot() {
    let el = document.getElementById("tourModal");
    if (el) return el;
    el = document.createElement("div");
    el.id = "tourModal";
    el.className = "modal-root tour-root";
    el.hidden = true;
    el.innerHTML = `<div class="modal-backdrop"></div>
      <div class="modal tour-modal" role="dialog" aria-modal="true" aria-labelledby="tourTitle" aria-describedby="tourBody" tabindex="-1">
        <div class="tour-top"><ol class="tour-chapters" aria-label="Sandbox tour"></ol><button class="link-btn tour-skip" type="button" data-tour-skip>Skip tour</button></div>
        <div class="tour-art" aria-hidden="true"></div>
        <div class="tour-copy" aria-live="polite"><p class="tour-kicker"></p><h2 id="tourTitle"></h2><p id="tourBody"></p></div>
        <div class="tour-foot"><div class="tour-dots"></div><div class="tour-actions"></div></div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", onDeckClick);
    return el;
  }

  function drawSlide(dir = 0) {
    const root = deckRoot();
    const chapter = CHAPTERS[deck.ch];
    const list = SLIDES[chapter.id];
    const s = list[deck.i];
    const last = deck.i === list.length - 1;
    const end = last && deck.ch === CHAPTERS.length - 1;
    const next = CHAPTERS[deck.ch + 1];
    const keepFocus = root.contains(document.activeElement) && document.activeElement.matches("[data-tour-next], [data-tour-back], [data-tour-go]");

    $(".tour-chapters", root).innerHTML = CHAPTERS.map((c, k) => `<li class="${k < deck.ch ? "is-done" : k === deck.ch ? "is-on" : ""}"${k === deck.ch ? ' aria-current="step"' : ""}><i></i><span>${esc(c.label)}</span></li>`).join("");
    $(".tour-skip", root).hidden = end;
    const art = $(".tour-art", root);
    art.innerHTML = ART[s.art]();
    const copy = $(".tour-copy", root);
    $(".tour-kicker", copy).textContent = `${chapter.label} · ${deck.i + 1} of ${list.length}`;
    $("#tourTitle", copy).textContent = s.title;
    $("#tourBody", copy).textContent = s.body;
    [art, copy].forEach((el) => {
      el.classList.remove("is-next", "is-prev");
      if (dir && !reduced()) { void el.offsetWidth; el.classList.add(dir > 0 ? "is-next" : "is-prev"); }
    });
    $(".tour-dots", root).innerHTML = list.map((_, k) => `<button type="button" class="tour-dot ${k === deck.i ? "is-on" : ""}" data-tour-go="${k}" aria-label="Slide ${k + 1} of ${list.length}"${k === deck.i ? ' aria-current="step"' : ""}></button>`).join("");
    const hasProjects = S.projects().length > 0;
    const primary = end
      ? `<button class="btn" type="button" data-tour-home>${icon("home")} My homepage</button>
         <button class="btn btn--ink" type="button" data-tour-start-project>${hasProjects ? `${icon("projects")} My projects` : `${icon("plus")} Start my first project`}</button>`
      : `<button class="btn btn--ink" type="button" data-tour-next>${last ? `Next: ${esc(next.label)}` : "Next"} ${icon("arrowRight")}</button>`;
    $(".tour-actions", root).innerHTML = `${deck.i > 0 && !end ? `<button class="btn" type="button" data-tour-back>${icon("chevronLeft")} Back</button>` : ""}${primary}`;
    if (keepFocus || dir === 0) {
      const f = $("[data-tour-next], [data-tour-start-project]", root);
      if (f && Mori.modal.isOpen("tourModal")) f.focus({ preventScroll: true });
    }
  }

  function openDeck(chapterId) {
    const ch = CHAPTERS.findIndex((c) => c.id === chapterId);
    if (ch < 0) return;
    deck = { ch, i: 0 };
    deckRoot();
    drawSlide(0);
    closingDeck = false;
    Mori.modal.open("tourModal", { onClose: deckClosed });
    setTimeout(() => { const f = $("#tourModal [data-tour-next]"); if (f && Mori.modal.isOpen("tourModal")) f.focus({ preventScroll: true }); }, 80);
  }
  function closeDeck() {
    closingDeck = true;
    if (Mori.modal.isOpen("tourModal")) Mori.modal.close({ restoreFocus: false });
    closingDeck = false;
  }
  // Closed with Escape: that skips the tour (it can be taken again from Settings).
  function deckClosed() {
    if (closingDeck || !deck) return;
    deck = null;
    skipSite();
  }
  function skipSite() {
    setTour({ site: "skipped" });
    hidePill();
    toast("Tour skipped. Take it again any time from Settings → Preferences.", { icon: "compass", duration: 4200 });
  }

  function step(delta) {
    if (!deck) return;
    const list = SLIDES[CHAPTERS[deck.ch].id];
    const to = deck.i + delta;
    if (to < 0) return;
    if (to < list.length) { deck.i = to; drawSlide(delta); return; }
    if (deck.ch < CHAPTERS.length - 1) {
      const next = CHAPTERS[deck.ch + 1];
      deck = null;
      closeDeck();
      setTour({ site: next.id });
      Mori.ui.go(next.url, next.label, `Sandbox tour · ${CHAPTERS.indexOf(next) + 1} of ${CHAPTERS.length}`);
    }
  }
  function finishSite(url, title, sub) {
    deck = null;
    closeDeck();
    setTour({ site: "done" });
    if (url) Mori.ui.go(url, title, sub);
    else toast("That’s the tour. Welcome to Sandbox!", { icon: "check" });
  }

  function onDeckClick(e) {
    if (!deck) return;
    if (e.target.closest("[data-tour-next]")) { step(1); return; }
    if (e.target.closest("[data-tour-back]")) { step(-1); return; }
    const dot = e.target.closest("[data-tour-go]");
    if (dot) { const to = Number(dot.dataset.tourGo); if (to !== deck.i) { const d = to - deck.i; deck.i = to; drawSlide(d > 0 ? 1 : -1); } return; }
    if (e.target.closest("[data-tour-skip]")) { deck = null; closeDeck(); skipSite(); return; }
    if (e.target.closest("[data-tour-home]")) { finishSite("home.html", "Welcome to Sandbox", "Opening your homepage…"); return; }
    if (e.target.closest("[data-tour-start-project]")) {
      if (S.projects().length) finishSite("projects.html", "Your projects", "");
      else finishSite("projects.html?new=1", "Your first project", "Opening the new project form…");
    }
  }
  document.addEventListener("keydown", (e) => {
    if (!deck || !Mori.modal.isOpen("tourModal")) return;
    if (e.target.matches && e.target.matches("input, textarea, select")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); const last = deck.i === SLIDES[CHAPTERS[deck.ch].id].length - 1; if (!last) step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });

  /* A tour that's under way, seen from another page: carry on, or stop. */
  function showPill(chapter) {
    if ($("#tourPill")) return;
    const el = document.createElement("div");
    el.id = "tourPill";
    el.className = "tour-pill";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Sandbox tour");
    el.innerHTML = `<span class="tour-pill-ico">${icon("compass")}</span><span class="tour-pill-copy"><b>Sandbox tour</b><span>Next: ${esc(chapter.label)}</span></span>
      <button class="btn btn--sm btn--ink" type="button" data-pill-go>Continue</button>
      <button class="icon-btn" type="button" data-pill-x aria-label="Skip the tour">${icon("x")}</button>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-pill-go]")) Mori.ui.go(chapter.url, chapter.label, `Sandbox tour · ${CHAPTERS.indexOf(chapter) + 1} of ${CHAPTERS.length}`);
      else if (e.target.closest("[data-pill-x]")) skipSite();
    });
  }
  function hidePill() { const el = $("#tourPill"); if (el) el.remove(); }

  async function startSite() {
    const t = tour();
    const chapter = CHAPTERS.find((c) => c.id === t.site);
    if (!chapter) return;
    if (chapter.id !== page) { if (page !== "project") showPill(chapter); return; }
    await wait(reduced() ? 150 : 520);
    await modalFree();
    if (tour().site === chapter.id) openDeck(chapter.id);
  }

  /* =====================================================================
     The spotlight (the project tour)
     ===================================================================== */
  const coach = (() => {
    let root = null, spot, pop, blocks;
    let steps = [], i = -1, busy = false, opts = {};
    /** A step whose target can be used (the page under the hole takes clicks and drags). */
    const live = (st) => !!(st && (typeof st.interactive === "function" ? st.interactive() : st.interactive));
    let targets = [], ro = null, raf = 0, glideTimer = 0;
    const GAP = 14;
    const PAD = 6;

    function build() {
      root = document.createElement("div");
      root.className = "coach";
      root.innerHTML = `${["t", "r", "b", "l", "c"].map((k) => `<div class="coach-block" data-b="${k}"></div>`).join("")}
        <div class="coach-spot" aria-hidden="true"></div>
        <div class="coach-pop" role="dialog" aria-modal="true" aria-labelledby="coachTitle" aria-describedby="coachBody" tabindex="-1">
          <div class="coach-art" aria-hidden="true"></div>
          <p class="coach-kicker"></p>
          <h3 class="coach-title" id="coachTitle"></h3>
          <p class="coach-body" id="coachBody"></p>
          <div class="coach-extra"></div>
          <div class="coach-foot">
            <button class="link-btn coach-skip" type="button" data-coach-skip>Skip tour</button>
            <span class="coach-actions"></span>
          </div>
        </div>`;
      document.body.appendChild(root);
      spot = $(".coach-spot", root);
      pop = $(".coach-pop", root);
      blocks = {};
      $$(".coach-block", root).forEach((b) => { blocks[b.dataset.b] = b; });
      root.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey, true);
      window.addEventListener("resize", queue);
      document.addEventListener("scroll", queue, { capture: true, passive: true });
      ro = "ResizeObserver" in window ? new ResizeObserver(queue) : null;
    }

    function start(list, o = {}) {
      if (!root) build();
      steps = list;
      opts = o;
      i = -1;
      root.hidden = false;
      root.classList.add("is-on");
      document.body.classList.add("is-touring");
      go(0, 1);
    }
    function end(how) {
      if (!root || i < 0) return;
      const cur = steps[i];
      i = -1;
      if (cur && cur.leave) cur.leave();
      watch([]);
      root.classList.remove("is-on");
      document.body.classList.remove("is-touring");
      setTimeout(() => { if (i < 0) root.hidden = true; }, 300);
      if (opts.onEnd) opts.onEnd(how);
    }
    const active = () => !!root && i >= 0;

    async function go(n, dir) {
      if (busy) return;
      busy = true;
      try {
        while (n >= 0 && n < steps.length && steps[n].skipIf && steps[n].skipIf()) n += dir;
        if (n < 0) { busy = false; return; }
        if (n >= steps.length) { busy = false; end("done"); return; }
        const prev = steps[i];
        if (prev && prev.leave && n !== i) await prev.leave();
        i = n;
        const st = steps[i];
        root.classList.add("is-moving");
        if (st.before) await st.before();
        await frames();
        const els = st.target ? st.target().filter(Boolean) : [];
        if (els.length) await bringIntoView(els);
        watch(els);
        fill(st);
        root.classList.add("is-gliding");
        clearTimeout(glideTimer);
        glideTimer = setTimeout(() => root.classList.remove("is-gliding"), 480);
        place();
        root.classList.toggle("is-interactive", live(st));
        await frames();
        root.classList.remove("is-moving");
        pop.classList.remove("coach-pop--in");
        if (!reduced()) { void pop.offsetWidth; pop.classList.add("coach-pop--in"); }
        if (i === n) pop.focus({ preventScroll: true });
      } finally {
        busy = false;
      }
    }

    function fill(st) {
      const n = steps.filter((s) => !s.skipIf || !s.skipIf()).indexOf(st);
      const total = steps.filter((s) => !s.skipIf || !s.skipIf()).length;
      const art = $(".coach-art", pop);
      art.innerHTML = st.art ? ART[st.art]() : "";
      art.hidden = !st.art;
      $(".coach-kicker", pop).textContent = `${opts.label || "Tour"} · ${n + 1} of ${total}`;
      $(".coach-title", pop).textContent = typeof st.title === "function" ? st.title() : st.title;
      $(".coach-body", pop).textContent = typeof st.body === "function" ? st.body() : st.body;
      const extra = $(".coach-extra", pop);
      extra.innerHTML = st.extra ? st.extra() : "";
      extra.hidden = !extra.innerHTML;
      const first = n === 0;
      const last = n === total - 1;
      $(".coach-skip", pop).hidden = last;
      $(".coach-actions", pop).innerHTML = `${first || last ? "" : `<button class="btn btn--sm" type="button" data-coach-back>Back</button>`}<button class="btn btn--sm btn--ink" type="button" data-coach-next>${esc(st.next || (last ? "Done" : "Next"))}${last ? "" : " " + icon("arrowRight")}</button>`;
      pop.classList.toggle("is-center", !targets.length);
    }

    function watch(els) {
      targets = els;
      if (ro) { ro.disconnect(); els.forEach((el) => ro.observe(el)); }
    }
    function queue() { if (active() && !raf) raf = requestAnimationFrame(() => { raf = 0; place(); }); }

    function rect() {
      const live = targets.filter((el) => document.contains(el));
      if (!live.length) return null;
      const rs = live.map((el) => el.getBoundingClientRect()).filter((r) => r.width || r.height);
      if (!rs.length) return null;
      const r = { left: Math.min(...rs.map((x) => x.left)), top: Math.min(...rs.map((x) => x.top)), right: Math.max(...rs.map((x) => x.right)), bottom: Math.max(...rs.map((x) => x.bottom)) };
      const vw = window.innerWidth, vh = window.innerHeight;
      r.left = Math.max(4, r.left - PAD); r.top = Math.max(4, r.top - PAD);
      r.right = Math.min(vw - 4, r.right + PAD); r.bottom = Math.min(vh - 4, r.bottom + PAD);
      r.width = Math.max(0, r.right - r.left); r.height = Math.max(0, r.bottom - r.top);
      return r;
    }

    /** Fixed or sticky: it stays put when the page scrolls. */
    const pinned = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === "fixed" || p === "sticky") return true; } return false; };
    async function bringIntoView(els) {
      // Links in the sidebar: scroll the sidebar itself, not the page.
      const box = els[0].closest(".pl-nav-inner");
      if (box && els.every((el) => box.contains(el))) {
        const b = box.getBoundingClientRect();
        const rs = els.map((el) => el.getBoundingClientRect());
        const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
        if (top < b.top + 8 || bottom > b.bottom - 8) { box.scrollTop += top - b.top - Math.max(8, (b.height - (bottom - top)) / 2); await wait(30); }
        if (pinned(box)) return;
      }
      if (els.every(pinned)) return;
      const rs = els.map((el) => el.getBoundingClientRect());
      const top = Math.min(...rs.map((r) => r.top));
      const bottom = Math.max(...rs.map((r) => r.bottom));
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--navH")) || 72;
      const room = window.innerHeight - navH;
      const h = bottom - top;
      let by = 0;
      if (top < navH + 12 || bottom > window.innerHeight - 12) by = h > room - 160 ? top - navH - 20 : top - navH - (room - h) / 2;
      if (Math.abs(by) < 4) return;
      window.scrollBy({ top: by, behavior: reduced() ? "auto" : "smooth" });
      await wait(reduced() ? 30 : 420);
    }

    function place() {
      if (!active()) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const r = rect();
      const st = steps[i] || {};
      // The dim with a hole round the target; clicks outside it do nothing.
      if (r) {
        Object.assign(spot.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", opacity: "1" });
        Object.assign(blocks.t.style, { left: "0", top: "0", width: "100%", height: r.top + "px" });
        Object.assign(blocks.b.style, { left: "0", top: r.bottom + "px", width: "100%", height: Math.max(0, vh - r.bottom) + "px" });
        Object.assign(blocks.l.style, { left: "0", top: r.top + "px", width: r.left + "px", height: r.height + "px" });
        Object.assign(blocks.r.style, { left: r.right + "px", top: r.top + "px", width: Math.max(0, vw - r.right) + "px", height: r.height + "px" });
        Object.assign(blocks.c.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", display: live(st) ? "none" : "block" });
      } else {
        Object.assign(spot.style, { left: vw / 2 + "px", top: vh / 2 + "px", width: "0px", height: "0px", opacity: "1" });
        Object.assign(blocks.t.style, { left: "0", top: "0", width: "100%", height: "100%" });
        ["b", "l", "r", "c"].forEach((k) => Object.assign(blocks[k].style, { width: "0", height: "0" }));
      }
      pop.classList.toggle("is-center", !r);
      // The card: beside the target where it fits, else above or below it, else at the bottom.
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      let x, y;
      if (!r) { x = (vw - pw) / 2; y = (vh - ph) / 2; }
      else {
        const room = { right: vw - r.right - GAP, left: r.left - GAP, bottom: vh - r.bottom - GAP, top: r.top - GAP };
        const fits = { right: room.right >= pw + 8, left: room.left >= pw + 8, bottom: room.bottom >= ph + 8, top: room.top >= ph + 8 };
        const order = [st.side || "right", "right", "bottom", "left", "top"];
        const side = order.find((s) => fits[s]);
        const clampY = (v) => Math.max(12, Math.min(vh - ph - 12, v));
        const clampX = (v) => Math.max(12, Math.min(vw - pw - 12, v));
        if (side === "right") { x = r.right + GAP; y = clampY(r.top + Math.min(24, r.height / 2 - ph / 2 > 0 ? r.height / 2 - ph / 2 : 0)); }
        else if (side === "left") { x = r.left - GAP - pw; y = clampY(r.top); }
        else if (side === "bottom") { x = clampX(r.left + r.width / 2 - pw / 2); y = r.bottom + GAP; }
        else if (side === "top") { x = clampX(r.left + r.width / 2 - pw / 2); y = r.top - GAP - ph; }
        else { x = (vw - pw) / 2; y = vh - ph - 16; } // no room anywhere: over the bottom of the target
        pop.dataset.side = side || "over";
      }
      pop.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }

    function onClick(e) {
      if (!active()) return;
      if (e.target.closest("[data-coach-next]")) { go(i + 1, 1); return; }
      if (e.target.closest("[data-coach-back]")) { go(i - 1, -1); return; }
      if (e.target.closest("[data-coach-skip]")) { end("skipped"); return; }
      const st = steps[i];
      if (st && st.onExtra) st.onExtra(e, { refresh: () => { fill(st); queue(); }, next: () => go(i + 1, 1) });
    }
    function onKey(e) {
      if (!active() || Mori.modal.isOpen()) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); end("skipped"); return; }
      const inPop = pop.contains(document.activeElement);
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && (inPop || document.activeElement === document.body)) {
        e.preventDefault();
        if (e.key === "ArrowRight") go(i + 1, 1); else go(i - 1, -1);
        return;
      }
      if (e.key === "Tab" && !live(steps[i])) {
        // Keep focus in the card while the page behind is dimmed.
        const items = $$("button:not([hidden]), a[href]", pop).filter((x) => x.offsetParent);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (!inPop) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    return { start, end, active, refresh: queue };
  })();

  /* =====================================================================
     The project tour
     ===================================================================== */
  function projectSteps(P) {
    const p = () => S.project(P.pid) || { name: "your project", team: [] };
    const link = (id) => $(`.pl-nav-link[data-section="${id}"]`);
    const links = (...ids) => ids.map(link);
    const narrow = () => P.isNarrow();
    let navWas = null;
    const openNav = async () => {
      if (navWas == null) navWas = P.navOpen();
      if (!P.navOpen()) { P.setNav(true); await wait(reduced() ? 40 : 360); }
    };
    const closeDrawer = async () => { if (narrow() && P.navOpen()) { P.setNav(false); await wait(reduced() ? 40 : 340); } };
    const page = async (sec) => {
      await closeDrawer();
      if (P.section() !== sec) { P.go(sec); await wait(reduced() ? 60 : 320); }
    };
    const layout = () => (Mori.workspace.get(P.pid).layout || []);
    const team = () => Mori.projectKit.teamOf(p());
    const addable = () => Mori.projectKit.canAddPeople(p()) && Mori.projectKit.addablePeople(p()).length > 0;
    const wideGrid = () => !window.matchMedia("(max-width: 900px)").matches;

    return {
      steps: [
        { art: "planner", title: () => `Welcome to ${p().name}`, body: "You’re on its Mainframe, the project’s home. Take a minute and we’ll show you around: the tools, working with your team, and how this page works.", next: "Show me around",
          before: () => page("mainframe") },
        { target: () => [$("#plNav .pl-nav-inner")], side: "right", before: openNav, title: "Every tool, one click away",
          body: "Each tool has its own page, listed in this sidebar under Plan, Team, Build, Grow, Money and Learn. The menu button at the top left hides and shows it." },
        { target: () => links("tasks", "gtm", "ladder"), side: "right", before: openNav, title: "Plan",
          body: "Daily tasks for the week, a go-to-market checklist, and the milestone ladder with the proof each rung needs. Tick off the proof and the ladder fills in." },
        { target: () => links("docs", "interviews", "canvas"), side: "right", before: openNav, title: "Write your own documents",
          body: "Documents is where your team writes: pitch drafts, research, meeting notes, from a blank page or a template. Log customer interviews and fill in your lean canvas here too." },
        { target: () => links("marketing", "metrics", "finance", "funding", "toolkits"), side: "right", before: openNav, title: "Grow, Money and Learn",
          body: "Track campaigns and the numbers that matter, keep an eye on cash and runway, find programmes, grants and investors, and learn as you go with step-by-step toolkits." },
        { target: () => [$("#plTeam")], side: "right", before: () => page("people"), title: "Build it together",
          body: () => (team().length > 1
            ? "Your team lives on the People page. Everyone on it sees the same Mainframe, tasks and documents, and you can give each other tasks."
            : "Your team lives on the People page. Add co-founders and teammates from your connections: everyone on the team sees the same Mainframe, tasks and documents, and you can give each other tasks."),
          extra: () => (addable() ? `<p class="coach-tip">${icon("userPlus")}<span>Use <b>Add to team</b> here, or at the top of the page, to bring people in.</span></p>`
            : `<p class="coach-tip">${icon("compass")}<span>No connections yet? Find people in the <a href="network.html#explore">MORI Network</a>, connect, then add them here.</span></p>`) },
        { target: () => [$("#plView .tool-grid > .tool-card:not(#plTeam)")], side: "left", before: () => page("people"), title: "Say who you’re looking for",
          body: "List the roles the team still needs, like a mobile developer, with the hours or equity on offer. Specialists in the MORI Network see what you need." },
        { target: () => [$(".pl-team-peek")], side: "bottom", before: () => page("people"), title: "Your team, always in view",
          body: "Everyone on the project shows up here at the top of every page. Click it to come back to the People page." },
        { target: () => [$("#mfGrid")], side: "bottom", art: "widgets", before: () => page("mainframe"), title: "The Mainframe is made of widgets",
          body: () => (layout().length
            ? "Widgets are small windows onto your tools: today’s tasks, the next rung, your runway and more. Click one to open its tool."
            : "Widgets are small windows onto your tools: today’s tasks, the next rung, your runway and more. Yours is empty for now, so start with a few."),
          extra: () => (layout().length ? "" : `<button class="btn btn--sm" type="button" data-coach-starter>${icon("grid")} Add starter widgets</button>`),
          onExtra: (e, ctl) => {
            const b = e.target.closest("[data-coach-starter]");
            if (!b) return;
            b.disabled = true;
            Mori.mainframe.addStarter().then(async () => { await wait(260); ctl.refresh(); });
          } },
        { target: () => [$("#plToolbar [data-mf-add]")], side: "bottom", before: () => page("mainframe"), title: "Add any widget",
          body: "Pick a widget from the list, then its style and size. Every tool in the sidebar has one, and you can change or remove it later." },
        { target: () => (layout().length ? [$("#plToolbar"), $("#mfGrid")] : [$("#plToolbar")]), side: "bottom",
          interactive: () => layout().length > 0 && wideGrid(), // try moving and resizing, right there
          before: async () => { await page("mainframe"); if (layout().length && wideGrid()) { P.setEditing(true); await wait(60); } },
          leave: () => P.setEditing(false),
          title: "Make it yours",
          body: () => (!layout().length
            ? "Once you’ve added widgets, Edit Mainframe appears here: drag a widget by its top bar to move it, or by its corner to resize it. They snap to a four-column grid."
            : wideGrid()
              ? "You’re in edit mode now, so try it: drag a widget by its top bar to move it, or by its corner to resize it. Widgets snap to a four-column grid. Press Done when it looks right."
              : "On a larger screen, Edit Mainframe lets you move widgets by their top bar and resize them by the corner. They snap to a four-column grid.") },
        { art: "ready", title: "You’re all set", body: "That’s the planner. Take this tour again any time from Settings → Projects.", next: "Start building",
          before: () => page("mainframe") },
      ],
      restore: () => { if (navWas != null && !P.isNarrow() && P.navOpen() !== navWas) P.setNav(navWas); else closeDrawer(); },
    };
  }

  async function startProject(force) {
    const P = Mori.planner;
    if (!P || coach.active()) return;
    const t = tour();
    const first = P.justCreated && P.justCreated.first && t.project !== "done" && t.project !== "skipped";
    if (!force && !first && t.project !== P.pid) return;
    if (!(await P.ready()) || !S.project(P.pid)) return;
    if (tour().project !== P.pid) setTour({ project: P.pid });
    await wait(reduced() ? 120 : 600);
    await modalFree();
    const { steps, restore } = projectSteps(P);
    coach.start(steps, {
      label: "Project tour",
      onEnd: (how) => {
        restore();
        setTour({ project: how === "done" ? "done" : "skipped" });
        if (how !== "done") toast("Tour skipped. Take it again any time from Settings → Projects.", { icon: "compass", duration: 4200 });
      },
    });
  }

  /* =====================================================================
     Starting tours: from Settings, the footer, or on their own
     ===================================================================== */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tour-start]");
    if (!b) return;
    e.preventDefault();
    if (Mori.modal.isOpen()) Mori.modal.close({ restoreFocus: false });
    if (b.dataset.tourStart === "project") {
      if (page === "project" && Mori.planner) { setTour({ project: Mori.planner.pid }); setTimeout(() => startProject(true), 320); return; }
      const p = S.pinnedProjects()[0] || S.projects()[0];
      if (!p) { toast("Declare a project first: the tour starts on its Mainframe.", { icon: "projects" }); return; }
      setTour({ project: p.id });
      Mori.ui.go(`project.html?id=${encodeURIComponent(p.id)}#mainframe`, p.name, "Project tour");
      return;
    }
    setTour({ site: "network" });
    hidePill();
    if (page === "network") setTimeout(() => openDeck("network"), 320);
    else Mori.ui.go(CHAPTERS[0].url, CHAPTERS[0].label, `Sandbox tour · 1 of ${CHAPTERS.length}`);
  });

  if (page === "project") startProject(false);
  else startSite();

  Mori.tour = { openDeck, startProject: () => startProject(true), state: tour };
})();
