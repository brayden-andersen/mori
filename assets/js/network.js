/* ==========================================================================
   Mori: Sandbox — Network page
   --------------------------------------------------------------------------
   Explore lists everyone who has finished signing up (from Supabase), with a
   search, filters (founder or specialist, years of experience, sprint rating,
   industry, open to build) and sorting. Requests holds the connection
   requests you received and sent. Messages lists your connections; messaging
   itself is coming soon.
   Tabs are routed by the hash so the nav dropdown and notifications can
   deep-link: #explore · #explore/<member id> · #requests · #messages · #messages/<member id>
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, ago, toast, roleChip, placeGlider, createModal, loader } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const N = S.network;
  const TABS = ["explore", "requests", "messages"];
  const HUES = ["orange", "blue", "purple"];
  const EXP_RANK = { "0-2 years": 1, "3-5 years": 2, "6-10 years": 3, "10+ years": 4 };

  const first = (name) => String(name || "").split(/\s+/)[0];
  const dash = (s) => String(s || "").replace(/(\d)-(\d)/, "$1–$2");
  const roleLabel = (role) => (D.roles[role] ? D.roles[role].label : "Member");
  const openLabel = (m) => (m.open ? D.openTypes[m.openType] || "Open to build" : "");
  const joined = (ts) => (ts ? new Date(ts).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "");
  const isNarrow = () => window.matchMedia("(max-width: 760px)").matches;
  const smooth = () => (Mori.motion.reduced() ? "instant" : "smooth");
  const emptyHTML = (ic, title, sub, action, cls = "") =>
    `<div class="empty ${cls}"><span class="empty-ico">${icon(ic)}</span><div>${title}</div>${sub ? `<div class="meta">${sub}</div>` : ""}${action || ""}</div>`;

  /* ready: members are on screen · loading: first load · error: nothing to show · off: demo account */
  let loadState = !N.available() ? "off" : N.members().length ? "ready" : "loading";
  let loadError = null;
  let pendingMember = null;

  /* ---------- Tabs ---------- */
  const tabs = $$(".net-tab");
  const glider = $(".net-glider");
  let activeTab = null;
  const moveGlider = (snap) => placeGlider(glider, tabs.find((t) => t.dataset.tab === activeTab), { snap });

  function showTab(tab) {
    if (tab === activeTab) return;
    const initial = activeTab === null;
    activeTab = tab;
    tabs.forEach((t) => {
      const on = t.dataset.tab === tab;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", String(on));
    });
    $$(".net-pane").forEach((p) => {
      const on = p.dataset.pane === tab;
      p.hidden = !on;
      if (on && !initial) { p.classList.remove("pane-in"); void p.offsetWidth; p.classList.add("pane-in"); }
    });
    moveGlider(initial);
    renderTab();
    if (tab === "messages") requestAnimationFrame(() => fitChat(true));
  }
  function renderTab() {
    if (activeTab === "explore") renderPeople();
    else if (activeTab === "requests") renderRequests();
    else if (activeTab === "messages") renderChats();
  }

  function parseHash() {
    const [tab, sub] = decodeURIComponent(location.hash.replace(/^#/, "")).split("/");
    return { tab: TABS.includes(tab) ? tab : "explore", sub: sub || null };
  }
  function route() {
    const { tab, sub } = parseHash();
    showTab(tab);
    if (tab === "explore" && sub) openMember(sub, { fromHash: true });
    if (tab !== "messages") return;
    if (sub) openChat(sub);
    else if (!isNarrow()) openChat(activeChat || (N.connections()[0] || {}).id, { quiet: true });
    else closeChat();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", () => moveGlider(true));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveGlider(true));

  /* ---------- Explore: filters ---------- */
  const filters = { q: "", role: "all", exp: new Set(), rating: 0, industries: new Set(), open: false };
  const peopleQ = $("#peopleQ");
  const sortSel = $("#peopleSort");
  const ratingSel = $("#ratingMin");
  const openOnly = $("#openOnly");
  const filtersOn = () => !!(filters.q || filters.role !== "all" || filters.exp.size || filters.rating || filters.industries.size || filters.open);

  $("#expChips").innerHTML = D.experience.map((x) => `<button class="fchip" type="button" data-exp="${esc(x)}" data-active="false">${esc(dash(x))}</button>`).join("");

  function matches(m) {
    if (filters.role !== "all" && m.role !== filters.role) return false;
    if (filters.exp.size && !filters.exp.has(m.experience)) return false;
    if (filters.rating && !(m.rating != null && m.rating >= filters.rating)) return false;
    if (filters.industries.size && !m.industries.some((x) => filters.industries.has(x))) return false;
    if (filters.open && !m.open) return false;
    if (filters.q) {
      const hay = [m.name, m.headline, m.bio, m.region, m.employment, roleLabel(m.role), openLabel(m), ...m.industries, ...m.skills, ...m.languages.map((l) => l.name)]
        .join(" ").toLowerCase();
      if (!filters.q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const SORTS = {
    newest: (a, b) => b.joinedAt - a.joinedAt,
    rating: (a, b) => (b.rating == null ? -1 : b.rating) - (a.rating == null ? -1 : a.rating) || b.reviews - a.reviews || b.joinedAt - a.joinedAt,
    experience: (a, b) => (EXP_RANK[b.experience] || 0) - (EXP_RANK[a.experience] || 0) || b.joinedAt - a.joinedAt,
    name: (a, b) => a.name.localeCompare(b.name),
  };

  function syncControls() {
    peopleQ.value = filters.q;
    $$("[data-role-filter]").forEach((c) => { c.dataset.active = String(c.dataset.roleFilter === filters.role); });
    $$("[data-exp]").forEach((c) => { c.dataset.active = String(filters.exp.has(c.dataset.exp)); });
    ratingSel.value = String(filters.rating);
    openOnly.checked = filters.open;
    setIndustryToggle();
  }
  function clearFilters(silent) {
    Object.assign(filters, { q: "", role: "all", rating: 0, open: false });
    filters.exp.clear();
    filters.industries.clear();
    syncControls();
    if (!silent) renderPeople();
  }

  peopleQ.addEventListener("input", () => { filters.q = peopleQ.value.trim().toLowerCase(); renderPeople(); });
  sortSel.addEventListener("change", renderPeople);
  ratingSel.addEventListener("change", () => { filters.rating = Number(ratingSel.value) || 0; renderPeople(); });
  openOnly.addEventListener("change", () => { filters.open = openOnly.checked; renderPeople(); });
  $("#roleChips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-role-filter]");
    if (!chip) return;
    filters.role = chip.dataset.roleFilter;
    syncControls();
    renderPeople();
  });
  $("#expChips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-exp]");
    if (!chip) return;
    const x = chip.dataset.exp;
    if (filters.exp.has(x)) filters.exp.delete(x); else filters.exp.add(x);
    syncControls();
    renderPeople();
  });

  /* Industry: a searchable checklist. Industries members have chosen come first. */
  const indFilter = $("#indFilter");
  const indToggle = $("#indToggle");
  const indPanel = $("#indPanel");
  const indQ = $("#indQ");
  const indList = $("#indList");

  function industryCounts() {
    const counts = {};
    N.members().forEach((m) => m.industries.forEach((x) => { counts[x] = (counts[x] || 0) + 1; }));
    return counts;
  }
  function renderIndustryList() {
    const term = indQ.value.trim().toLowerCase();
    const counts = industryCounts();
    const universe = Array.from(new Set(D.industries.concat(Object.keys(counts), Array.from(filters.industries))));
    const opt = (x) => `<li><label class="ind-opt"><input type="checkbox" value="${esc(x)}" ${filters.industries.has(x) ? "checked" : ""}><span class="ind-box">${icon("check")}</span><span class="ind-name">${esc(x)}</span>${counts[x] ? `<span class="ind-count" title="${counts[x]} member${counts[x] === 1 ? "" : "s"}">${counts[x]}</span>` : ""}</label></li>`;
    const group = (label) => `<li class="ind-group" aria-hidden="true">${label}</li>`;
    if (term) {
      const hits = universe.filter((x) => x.toLowerCase().includes(term)).sort((a, b) => a.localeCompare(b));
      indList.innerHTML = hits.length ? hits.map(opt).join("") : `<li class="ind-none">No industry matches “${esc(indQ.value.trim())}”.</li>`;
      return;
    }
    const inNetwork = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    const rest = universe.filter((x) => !counts[x]).sort((a, b) => a.localeCompare(b));
    indList.innerHTML = (inNetwork.length ? group("Chosen by members") + inNetwork.map(opt).join("") : "") + group("All industries") + rest.map(opt).join("");
  }
  function setIndustryToggle() {
    const picked = Array.from(filters.industries);
    indToggle.textContent = !picked.length ? "Any industry" : picked.length === 1 ? picked[0] : `${picked.length} industries`;
    indToggle.classList.toggle("is-set", picked.length > 0);
  }
  function showIndustries(open) {
    indPanel.hidden = !open;
    indToggle.setAttribute("aria-expanded", String(open));
    if (!open) return;
    indQ.value = "";
    renderIndustryList();
    indList.scrollTop = 0;
    setTimeout(() => indQ.focus({ preventScroll: true }), 30);
  }
  indToggle.addEventListener("click", () => showIndustries(indPanel.hidden));
  indQ.addEventListener("input", renderIndustryList);
  indList.addEventListener("change", (e) => {
    const box = e.target.closest('input[type="checkbox"]');
    if (!box) return;
    if (box.checked) filters.industries.add(box.value); else filters.industries.delete(box.value);
    setIndustryToggle();
    renderPeople();
  });
  indPanel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); showIndustries(false); indToggle.focus(); } });
  document.addEventListener("click", (e) => { if (!indPanel.hidden && !indFilter.contains(e.target)) showIndustries(false); });

  function renderActiveFilters() {
    const box = $("#activeFilters");
    const pills = Array.from(filters.industries).map((x) =>
      `<span class="fpill">${esc(x)}<button type="button" data-drop-industry="${esc(x)}" aria-label="Remove ${esc(x)}">${icon("x")}</button></span>`).join("");
    box.innerHTML = pills + (filtersOn() ? `<button class="link-btn" type="button" data-clear-filters>Clear all filters</button>` : "");
    box.hidden = !filtersOn();
  }
  $("#activeFilters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-drop-industry]");
    if (!b) return;
    filters.industries.delete(b.dataset.dropIndustry);
    setIndustryToggle();
    renderPeople();
  });

  /* ---------- Explore: member cards ---------- */
  function connectButton(m) {
    const id = esc(m.id);
    switch (N.status(m.id)) {
      case "connected": return `<span class="btn is-done" role="status">${icon("check")} Connected</span>`;
      case "pending":   return `<button class="btn is-pending" type="button" data-withdraw="${id}" title="Withdraw your request">${icon("check")} Pending</button>`;
      case "incoming":  return `<button class="btn btn--ink" type="button" data-accept="${id}">${icon("userPlus")} Accept</button>`;
      default:          return `<button class="btn btn--ink" type="button" data-connect="${id}">${icon("userPlus")} Connect</button>`;
    }
  }
  function ratingFact(m) {
    return m.rating != null
      ? `<span>${icon("star")}${m.rating.toFixed(1)} sprint rating · ${m.reviews} review${m.reviews === 1 ? "" : "s"}</span>`
      : `<span class="is-muted">${icon("star")}No sprint rating yet</span>`;
  }
  function personCard(m) {
    const where = [m.region, m.employment].filter(Boolean).map(esc).join(" · ");
    const open = openLabel(m);
    return `
      <article class="pcard person spotlight" data-person="${esc(m.id)}">
        <button class="person-top" type="button" data-view="${esc(m.id)}" aria-label="View ${esc(m.name)}’s profile">
          ${avatar(m, 52, { ring: m.open })}
          <span class="person-id"><b class="person-name">${esc(m.name)}</b><span class="meta">${where || (m.joinedAt ? `Joined ${esc(joined(m.joinedAt))}` : roleLabel(m.role))}</span></span>
        </button>
        <div class="chips">${roleChip(m.role)}${open ? `<span class="chip chip--emerald"><i class="live-dot"></i>${esc(open)}</span>` : ""}</div>
        ${m.headline ? `<p class="person-head">${esc(m.headline)}</p>` : ""}
        ${m.limited
          ? `<p class="person-note">${icon("shield")}${esc(first(m.name))} shares their full profile with connections.</p>`
          : `<div class="person-facts">${m.experience ? `<span>${icon("briefcase")}${esc(dash(m.experience))} of experience</span>` : ""}${ratingFact(m)}</div>
             ${m.industries.length ? `<div class="tags">${m.industries.map((x, i) => `<span class="badge badge--${HUES[i % HUES.length]}">${esc(x)}</span>`).join("")}</div>` : ""}`}
        <div class="pcard-actions">
          ${connectButton(m)}
          <button class="btn" type="button" data-view="${esc(m.id)}">View profile</button>
        </div>
      </article>`;
  }
  const skeleton = () => `
    <div class="pcard person is-skeleton" aria-hidden="true">
      <div class="person-top"><span class="sk sk-av"></span><span class="person-id"><span class="sk sk-line" style="width:62%"></span><span class="sk sk-line" style="width:40%"></span></span></div>
      <span class="sk sk-line" style="width:90%"></span><span class="sk sk-line" style="width:70%"></span>
      <div class="pcard-actions"><span class="sk sk-btn"></span><span class="sk sk-btn"></span></div>
    </div>`;

  let shownIds = null;
  function showPeopleEmpty(html) {
    const el = $("#peopleEmpty");
    el.innerHTML = html;
    el.hidden = !html;
  }
  function renderPeople() {
    const grid = $("#peopleGrid");
    const count = $("#peopleCount");
    renderActiveFilters();
    const all = N.members();

    if (loadState === "off") {
      grid.innerHTML = "";
      count.textContent = "";
      shownIds = null;
      showPeopleEmpty(`<span class="empty-ico">${icon("network")}</span><div>Sign in with Google to meet members</div><div class="meta">Demo accounts stay on this device, so there’s no one else here.</div>`);
      return;
    }
    if (!all.length && loadState === "loading") {
      grid.innerHTML = skeleton() + skeleton() + skeleton();
      count.textContent = "Loading members…";
      shownIds = null;
      showPeopleEmpty("");
      return;
    }
    if (!all.length && loadState === "error") {
      grid.innerHTML = "";
      count.textContent = "";
      shownIds = null;
      showPeopleEmpty(`<span class="empty-ico">${icon("refresh")}</span><div>Couldn’t load members</div><div class="meta">${esc((loadError && loadError.message) || "Check your connection and try again.")}</div><button class="btn" type="button" data-retry>${icon("refresh")} Try again</button>`);
      return;
    }

    const list = all.filter(matches).sort(SORTS[sortSel.value] || SORTS.newest);
    grid.innerHTML = list.map(personCard).join("");
    count.textContent = !all.length ? "" : filtersOn() ? `${list.length} of ${all.length} member${all.length === 1 ? "" : "s"}` : `${all.length} member${all.length === 1 ? "" : "s"}`;
    const ids = list.map((m) => m.id).join(",");
    if (ids !== shownIds) Mori.motion.enter(grid);
    shownIds = ids;

    if (!all.length) {
      showPeopleEmpty(`<span class="empty-ico">${icon("userPlus")}</span><div>You’re one of the first members</div><div class="meta">Founders and specialists appear here as soon as they finish signing up.</div>`);
    } else if (!list.length) {
      const noRatings = filters.rating && !all.some((m) => m.rating != null);
      showPeopleEmpty(`<span class="empty-ico">${icon("search")}</span><div>No one matches those filters</div><div class="meta">${noRatings ? "No one has a sprint rating yet. Ratings appear once members finish sprints." : "Try fewer filters or a different search."}</div><button class="btn" type="button" data-clear-filters>Clear filters</button>`);
    } else {
      showPeopleEmpty("");
    }
  }

  $("#findCofounder").addEventListener("click", () => {
    const want = S.profile().role === "specialist" ? "founder" : "specialist";
    clearFilters(true);
    filters.role = want;
    filters.open = true;
    syncControls();
    if (activeTab !== "explore") location.hash = "explore";
    else renderPeople();
    setTimeout(() => $("#peopleGrid").scrollIntoView({ behavior: smooth(), block: "start" }), 90);
    toast(`Showing ${want === "founder" ? "founders" : "specialists"} who are open to build`, { icon: "userPlus" });
  });

  /* ---------- Member profile ---------- */
  let shownMember = null; // { id, key } of the profile in the modal

  function memberHTML(m) {
    const st = N.status(m.id);
    const link = N.link(m.id);
    const id = esc(m.id);
    const fact = (label, value) => (value ? `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>` : "");
    const list = (items, cls) => items.map((x, i) => `<span class="badge badge--${cls ? cls(i) : "gray"}">${esc(x)}</span>`).join("");
    const open = openLabel(m);

    let action;
    if (st === "connected") {
      action = `<div class="mp-status"><span class="chip chip--emerald">${icon("check")} Connected</span><button class="btn btn--sm btn--ghost" type="button" data-remove="${id}">Remove connection</button></div>`;
    } else if (st === "pending") {
      action = `<div class="mp-status"><span class="chip chip--blue">Request sent ${esc(ago(link.at).toLowerCase())}</span><button class="btn btn--sm" type="button" data-withdraw="${id}">Withdraw</button></div>`;
    } else if (st === "incoming") {
      action = `${link.note ? `<p class="req-note">“${esc(link.note)}”</p>` : ""}<div class="mp-status"><span class="meta">${esc(first(m.name))} wants to connect</span><button class="btn btn--sm" type="button" data-ignore="${id}">Ignore</button><button class="btn btn--sm btn--ink" type="button" data-accept="${id}">${icon("check")} Accept</button></div>`;
    } else {
      action = `
        <form class="mp-connect" data-connect-form="${id}" novalidate>
          <label class="field"><span>Add a note <em class="hint">optional</em></span>
            <textarea class="textarea" name="note" maxlength="300" rows="3" placeholder="Hi ${esc(first(m.name))}, I’m working on… and would love your take."></textarea>
          </label>
          <button class="btn btn--ink" type="submit">${icon("userPlus")} Send request</button>
        </form>`;
    }

    const docs = [
      m.linkedin ? `<a class="btn btn--sm" href="${esc(m.linkedin)}" target="_blank" rel="noopener">${icon("link")} LinkedIn</a>` : "",
      m.cvPath ? `<button class="btn btn--sm" type="button" data-member-cv="${id}">${icon("file")} ${esc(m.cvName || "CV")}</button>` : "",
    ].join("");
    const docsNote = st === "connected" ? (docs ? "" : `<span class="meta">${esc(first(m.name))} hasn’t added a CV or LinkedIn yet.</span>`) : `<span class="meta">CVs are shared with connections.</span>`;

    const details = m.limited
      ? `<section class="pf-sec"><p class="meta">${esc(first(m.name))} shares their full profile with connections only. Connect to see their experience, industries and links.</p></section>`
      : `
        <div class="pf-stats">
          <div class="pf-stat"><b>${m.rating != null ? m.rating.toFixed(1) : "–"}</b><span>${m.rating != null ? `Sprint rating · ${m.reviews} review${m.reviews === 1 ? "" : "s"}` : "No sprint rating yet"}</span></div>
          <div class="pf-stat"><b>${m.experience ? esc(dash(m.experience).replace(" years", "")) : "–"}</b><span>Years of experience</span></div>
          <div class="pf-stat"><b>${esc(joined(m.joinedAt)) || "–"}</b><span>Joined Sandbox</span></div>
        </div>
        ${m.bio ? `<section class="pf-sec"><h3>About</h3><p>${esc(m.bio)}</p></section>` : ""}
        <section class="pf-sec"><h3>Details</h3>
          <dl class="pf-facts">${fact("Employment", m.employment)}${fact("Region", m.region)}</dl>
        </section>
        ${m.industries.length ? `<section class="pf-sec"><h3>Industry niche</h3><div class="tags">${list(m.industries, (i) => HUES[i % HUES.length])}</div></section>` : ""}
        ${m.languages.length ? `<section class="pf-sec"><h3>Languages</h3><div class="tags">${list(m.languages.map((l) => `${l.name} · ${l.level}`))}</div></section>` : ""}
        ${m.skills.length ? `<section class="pf-sec"><h3>Skills</h3><div class="tags">${list(m.skills)}</div></section>` : ""}
        <section class="pf-sec"><h3>CV &amp; links</h3><div class="tags">${docs}${docsNote}</div></section>`;

    return `
      <div class="pf-cover" aria-hidden="true"><span></span><span></span><span></span></div>
      <button class="icon-btn modal-x" data-close aria-label="Close profile">${icon("x")}</button>
      <div class="pf-head">${avatar(m, 88, { ring: m.open })}</div>
      <div class="pf-body">
        <h2 class="pf-name" id="mpTitle">${esc(m.name)}</h2>
        ${m.headline ? `<p class="pf-headline">${esc(m.headline)}</p>` : ""}
        ${m.region ? `<p class="meta pf-meta">${icon("pin")} ${esc(m.region)}</p>` : ""}
        <div class="chips">${roleChip(m.role)}${open ? `<span class="chip chip--emerald"><i class="live-dot"></i>${esc(open)}</span>` : ""}</div>
        <div class="mp-action">${action}</div>
        ${details}
      </div>`;
  }
  const memberKey = (m) => N.status(m.id) + JSON.stringify(m);

  function renderMember(m) {
    const root = createModal("memberModal", { label: "Member profile", panelCls: "modal--profile modal--member" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "mpTitle");
    panel.innerHTML = memberHTML(m);
    shownMember = { id: m.id, key: memberKey(m) };
    const form = $("[data-connect-form]", panel);
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const note = form.elements.note.value;
        busy($('button[type="submit"]', form), () => N.connect(m.id, note), () => toast(`Request sent to ${m.name}`, { icon: "userPlus" }));
      });
    }
    return root;
  }
  function openMember(id, opts = {}) {
    const m = N.member(id);
    if (!m) {
      // Not in the local copy: they may have joined since, so wait for this page's first refresh.
      if (N.available() && !N.refreshedAt() && loadState !== "error") { pendingMember = id; return; }
      toast("That member couldn’t be found", { icon: "x" });
      if (opts.fromHash) history.replaceState(null, "", "#explore");
      return;
    }
    const wasOpen = Mori.modal.isOpen("memberModal");
    renderMember(m);
    $("#memberModal .modal").scrollTop = 0;
    if (!wasOpen) {
      Mori.modal.open("memberModal", {
        opener: opts.opener,
        onClose: () => {
          shownMember = null;
          if (/^#explore\//.test(location.hash)) history.replaceState(null, "", "#explore");
        },
      });
    }
  }
  /** Keep an open profile in step with new data, without wiping a note being typed. */
  function refreshMember() {
    if (!shownMember || !Mori.modal.isOpen("memberModal")) return;
    const m = N.member(shownMember.id);
    if (!m) { Mori.modal.close(); return; }
    if (memberKey(m) !== shownMember.key) renderMember(m);
  }

  async function openCv(id) {
    const m = N.member(id);
    if (!m || !m.cvPath) return;
    const win = window.open("", "_blank"); // opened now so the browser doesn't block it
    try {
      const url = await Mori.db.cvLink(m.cvPath);
      if (win) win.location = url; else location.href = url;
    } catch (err) {
      if (win) win.close();
      fail(err);
    }
  }

  /* ---------- Requests ---------- */
  let holdRequests = 0; // a row is animating out: re-render once it's gone
  let shownRequests = null;

  function receivedRow(x) {
    const p = x.person;
    const id = esc(p.id);
    return `
      <article class="req" data-req="${id}">
        <button class="req-av" type="button" data-view="${id}" aria-label="View ${esc(p.name)}’s profile">${avatar(p, 48, { ring: p.open })}</button>
        <div class="req-main">
          <div class="req-title"><button class="req-name" type="button" data-view="${id}">${esc(p.name)}</button>${roleChip(p.role)}</div>
          <span class="meta">${esc(p.headline || [p.region, dash(p.experience)].filter(Boolean).join(" · "))}</span>
          ${x.note ? `<p class="req-note">“${esc(x.note)}”</p>` : ""}
          <span class="meta">${esc(ago(x.at))}</span>
        </div>
        <div class="req-actions">
          <button class="btn btn--sm" type="button" data-ignore="${id}">Ignore</button>
          <button class="btn btn--sm btn--ink" type="button" data-accept="${id}">${icon("check")} Accept</button>
        </div>
      </article>`;
  }
  function sentRow(x) {
    const p = x.person;
    const id = esc(p.id);
    return `
      <article class="req" data-req="${id}">
        <button class="req-av" type="button" data-view="${id}" aria-label="View ${esc(p.name)}’s profile">${avatar(p, 44)}</button>
        <div class="req-main">
          <div class="req-title"><button class="req-name" type="button" data-view="${id}">${esc(p.name)}</button>${roleChip(p.role)}</div>
          <span class="meta">Sent ${esc(ago(x.at).toLowerCase())}</span>
          ${x.note ? `<p class="req-note">“${esc(x.note)}”</p>` : ""}
        </div>
        <div class="req-actions"><span class="chip chip--blue">Pending</span><button class="btn btn--sm" type="button" data-withdraw="${id}">Withdraw</button></div>
      </article>`;
  }
  function renderRequests() {
    if (holdRequests) return;
    const recv = $("#recvList");
    const sentEl = $("#sentList");
    if (loadState === "off") {
      $("#recvCount").textContent = "";
      $("#sentCount").textContent = "";
      recv.innerHTML = emptyHTML("network", "Sign in with Google to connect", "Connection requests need a Sandbox account, so demo accounts don’t have any.", "", "req-empty");
      sentEl.innerHTML = "";
      return;
    }
    if (loadState === "loading" && !N.links().length) {
      recv.innerHTML = `<div class="req-loading meta">Loading requests…</div>`;
      sentEl.innerHTML = "";
      return;
    }
    const incoming = N.incoming();
    const sent = N.sent();
    $("#recvCount").textContent = incoming.length ? `${incoming.length} waiting` : "";
    $("#sentCount").textContent = sent.length ? `${sent.length} pending` : "";
    recv.innerHTML = incoming.length ? incoming.map(receivedRow).join("") : emptyHTML("inbox", "No requests waiting.", "When founders or specialists want to connect, they’ll show up here.", "", "req-empty");
    sentEl.innerHTML = sent.length ? sent.map(sentRow).join("") : emptyHTML("userPlus", "No pending requests.", "Find people in Explore and hit Connect.", `<a class="btn btn--sm" href="#explore">${icon("compass")} Explore members</a>`, "req-empty");
    const ids = incoming.concat(sent).map((x) => x.link.id).join(",");
    if (ids !== shownRequests) { Mori.motion.enter(recv); Mori.motion.enter(sentEl); }
    shownRequests = ids;
  }
  /** Slide a request row out while the change is saved; put it back if saving fails. */
  function leaveRow(row, work, done) {
    holdRequests++;
    row.style.maxHeight = row.offsetHeight + "px";
    void row.offsetWidth;
    row.classList.add("is-leaving");
    $$("button", row).forEach((b) => { b.disabled = true; });
    const wait = new Promise((r) => setTimeout(r, Mori.motion.reduced() ? 0 : 430));
    Promise.allSettled([Promise.resolve().then(work), wait]).then(([res]) => {
      holdRequests--;
      renderRequests();
      if (res.status === "fulfilled") { if (done) done(); } else fail(res.reason);
    });
  }

  /* ---------- Messages: your connections (messaging is coming soon) ---------- */
  const chat = $("#chat");
  let activeChat = null;

  /** Size the panel to the space under the sticky tab bar; optionally scroll it into place. */
  function fitChat(scroll) {
    const nav = document.getElementById("topNav");
    const top = (nav ? nav.offsetHeight : 72) + 12 + $(".net-bar").offsetHeight + 14;
    document.documentElement.style.setProperty("--chatTop", top + "px");
    if (!scroll || activeTab !== "messages") return;
    const y = Math.round(chat.getBoundingClientRect().top + window.scrollY - top);
    if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: y, behavior: smooth() });
  }
  window.addEventListener("resize", () => fitChat(false));

  function chatIntro() {
    const any = N.connections().length;
    return `<div class="chat-empty"><span class="empty-ico">${icon("message")}</span><p><b>Messaging is coming soon</b></p><p class="meta">You’ll be able to message your connections here.${any ? "" : " Connect with founders and specialists in Explore first."}</p>${any ? "" : `<a class="btn btn--sm" href="#explore">${icon("compass")} Explore members</a>`}</div>`;
  }
  function renderChats() {
    const all = N.connections();
    const term = $("#chatQ").value.trim().toLowerCase();
    const list = all.filter((p) => !term || p.name.toLowerCase().includes(term));
    $("#chatList").innerHTML = list.length
      ? list.map((p) => `
          <button class="chat-item ${p.id === activeChat ? "is-on" : ""}" type="button" role="listitem" data-chat="${esc(p.id)}">
            ${avatar(p, 42, { ring: p.open })}
            <span class="chat-copy"><b>${esc(p.name)}</b><span class="preview">${esc(p.headline || roleLabel(p.role))}</span></span>
          </button>`).join("")
      : `<div class="chat-none meta">${loadState === "off" ? "Sign in with Google to connect with members." : all.length ? "No connections match." : "Your connections appear here once a request is accepted."}</div>`;
    if (activeChat && N.status(activeChat) !== "connected") activeChat = null;
    if (!activeChat) { chat.classList.remove("is-thread"); $("#chatMain").innerHTML = chatIntro(); }
  }
  function closeChat() {
    activeChat = null;
    renderChats();
  }
  function openChat(id, opts = {}) {
    const p = id && N.member(id);
    if (!p || N.status(id) !== "connected") { closeChat(); return; }
    activeChat = id;
    $("#chatMain").innerHTML = `
      <header class="chat-head">
        <button class="icon-btn chat-back" type="button" data-chat-back aria-label="Back to your connections">${icon("chevronLeft")}</button>
        ${avatar(p, 40, { ring: p.open })}
        <div class="who"><b>${esc(p.name)}</b><span class="meta">${esc(p.headline || roleLabel(p.role))}</span></div>
        ${roleChip(p.role)}
      </header>
      <div class="chat-scroll">
        <div class="chat-soon">
          <span class="empty-ico">${icon("message")}</span>
          <p><b>Messaging opens soon</b></p>
          <p class="meta">You and ${esc(first(p.name))} are connected. Until messaging arrives, ${p.linkedin ? "you can reach them on LinkedIn" : "their profile has their details"}.</p>
          <div class="chat-soon-actions">
            <button class="btn btn--sm" type="button" data-view="${esc(p.id)}">${icon("user")} View profile</button>
            ${p.linkedin ? `<a class="btn btn--sm" href="${esc(p.linkedin)}" target="_blank" rel="noopener">${icon("link")} LinkedIn</a>` : ""}
          </div>
        </div>
      </div>
      <div class="chat-compose" aria-hidden="true">
        <input class="input" placeholder="Messaging is coming soon" disabled tabindex="-1">
        <button class="btn btn--ink" type="button" disabled tabindex="-1">${icon("send")}</button>
      </div>`;
    chat.classList.add("is-thread");
    renderChats();
    if (isNarrow() && !opts.quiet) requestAnimationFrame(() => fitChat(true));
  }
  $("#chatQ").addEventListener("input", renderChats);
  $("#chatMain").addEventListener("click", (e) => {
    if (!e.target.closest("[data-chat-back]")) return;
    history.replaceState(null, "", "#messages");
    closeChat();
  });

  /* ---------- Actions (delegated: cards, requests, profile modal, chats) ---------- */
  function signInAgain(message) {
    loader.show("Please sign in again", message || "Your sign-in has expired.");
    Mori.auth.clearSession();
    setTimeout(() => location.replace("index.html?next=" + encodeURIComponent("network.html" + location.hash)), 1500);
  }
  function fail(err) {
    if (err && err.code === "signed-out") { signInAgain(err.message); return; }
    toast((err && err.message) || "Something went wrong. Please try again.", { icon: "x", duration: 3800 });
  }
  /** Disable the button while the change is saved; the views re-render when it lands. */
  function busy(btn, work, done) {
    if (!btn || btn.getAttribute("aria-busy") === "true") return;
    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
    Promise.resolve().then(work).then(
      () => { if (done) done(); },
      (err) => { btn.disabled = false; btn.removeAttribute("aria-busy"); fail(err); }
    );
  }
  /** First tap arms the button, a second tap within 3 s confirms. */
  function confirmTap(btn, label) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = "1";
    const html = btn.innerHTML;
    btn.textContent = label;
    setTimeout(() => { if (document.contains(btn)) { delete btn.dataset.armed; btn.innerHTML = html; } }, 3000);
    return false;
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-connect],[data-withdraw],[data-accept],[data-ignore],[data-remove],[data-view],[data-chat],[data-member-cv],[data-retry],[data-clear-filters]");
    if (!t) return;
    const d = t.dataset;
    if (d.view) { e.preventDefault(); openMember(d.view, { opener: t }); return; }
    if (d.chat) { history.replaceState(null, "", "#messages/" + d.chat); openChat(d.chat); return; }
    if (d.memberCv) { openCv(d.memberCv); return; }
    if ("retry" in d) { load(true); return; }
    if ("clearFilters" in d) { clearFilters(); return; }

    const id = d.connect || d.withdraw || d.accept || d.ignore || d.remove;
    const p = N.member(id);
    const name = p ? p.name : "this member";
    const row = t.closest(".req");
    const run = (work, done) => (row ? leaveRow(row, work, done) : busy(t, work, done));

    if (d.connect) run(() => N.connect(id), () => toast(N.status(id) === "connected" ? `You’re now connected with ${name}` : `Request sent to ${name}`, { icon: "userPlus" }));
    else if (d.accept) run(() => N.accept(id), () => toast(`You’re now connected with ${name}`, { icon: "check" }));
    else if (d.ignore) run(() => N.ignore(id), () => toast("Request ignored", { icon: "x" }));
    else if (d.withdraw) run(() => N.withdraw(id), () => toast("Request withdrawn", { icon: "x" }));
    else if (d.remove && confirmTap(t, "Tap again to remove")) busy(t, () => N.remove(id), () => toast(`${name} is no longer a connection`, { icon: "x" }));
  });

  // New data from Supabase, or a change you just made.
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (key !== "network" && key !== "links") return;
    if (key === "network" && loadState !== "off") loadState = "ready";
    renderTab();
    refreshMember();
  });

  /* ---------- Load ---------- */
  function load(force) {
    if (!N.available()) { loadState = "off"; renderTab(); return; }
    if (!N.members().length) { loadState = "loading"; renderTab(); }
    N.refresh({ force }).then(
      () => {
        loadState = "ready";
        loadError = null;
        renderTab();
        if (pendingMember) { const id = pendingMember; pendingMember = null; openMember(id, { fromHash: true }); }
      },
      (err) => {
        if (err && err.code === "signed-out") { signInAgain(err.message); return; }
        loadError = err;
        loadState = N.members().length ? "ready" : "error";
        renderTab();
        if (loadState === "ready") toast("Couldn’t refresh the network. Showing what was loaded before.", { icon: "x" });
        if (pendingMember) { pendingMember = null; toast("That member couldn’t be found", { icon: "x" }); }
      }
    );
  }

  /* ---------- Boot ---------- */
  syncControls();
  route();
  load(false);
})();
