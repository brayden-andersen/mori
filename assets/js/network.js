/* ==========================================================================
   Mori: Sandbox — Network page
   --------------------------------------------------------------------------
   Laid out like LinkedIn's "My network": "Manage my network" on the left;
   on the right, the requests you received sit on top of Discover, which
   lists everyone who has finished signing up, with a search, dropdown
   filters (role, years of experience, region, sprint rating, industry) and
   sorting. Sent requests and Messages (a live chat with your connections)
   open from the left. Profiles and the connect / accept / remove actions
   come from people.js. Views are routed by the hash so links can deep-link:
     #explore · #explore/<member id> · #requests · #sent · #messages · #messages/<member id>
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, ago, toast, roleChip } = Mori.ui;
  const { busy, fail } = Mori.people;
  const S = Mori.state;
  const D = Mori.data;
  const N = S.network;
  const C = S.chat;
  const TABS = ["explore", "requests", "sent", "messages"];
  const HUES = ["orange", "blue", "purple"];

  const first = (name) => String(name || "").split(/\s+/)[0];
  const dash = (s) => String(s || "").replace(/(\d)-(\d)/, "$1–$2");
  const roleLabel = (role) => (D.roles[role] ? D.roles[role].label : "Member");
  const openLabel = (m) => (m.open ? D.openTypes[m.openType] || "Open to build" : "");
  const isNarrow = () => window.matchMedia("(max-width: 760px)").matches;
  const smooth = () => (Mori.motion.reduced() ? "instant" : "smooth");
  const emptyHTML = (ic, title, sub, action, cls = "") =>
    `<div class="empty ${cls}"><span class="empty-ico">${icon(ic)}</span><div>${title}</div>${sub ? `<div class="meta">${sub}</div>` : ""}${action || ""}</div>`;
  const clock = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const shortAgo = (ts) => ago(ts).replace(" ago", "").replace("Just now", "now");

  /* ready: members are on screen · loading: first load · error: nothing to show · off: demo account */
  let loadState = !N.available() ? "off" : N.members().length ? "ready" : "loading";
  let loadError = null;

  /* ---------- Views: picked in "Manage my network" ---------- */
  const manageItems = $$(".manage-item[data-tab]");
  let activeTab = null; // the pane on screen: explore · sent · messages

  function showTab(tab) {
    const pane = tab === "requests" ? "explore" : tab; // requests sit on top of Discover
    manageItems.forEach((t) => {
      const on = t.dataset.tab === tab;
      t.classList.toggle("is-on", on);
      if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
    if (pane !== activeTab) {
      const initial = activeTab === null;
      activeTab = pane;
      $$(".net-pane").forEach((p) => {
        const on = p.dataset.pane === pane;
        p.hidden = !on;
        if (on && !initial) { p.classList.remove("pane-in"); void p.offsetWidth; p.classList.add("pane-in"); }
      });
      if (pane !== "messages") setViewing(null);
      renderTab();
      if (pane === "messages") requestAnimationFrame(() => fitChat(true));
    }
    if (tab === "requests") requestAnimationFrame(() => $("#requestsBox").scrollIntoView({ behavior: smooth(), block: "start" }));
  }
  function renderManage() {
    const on = N.available();
    $("#mConnections").textContent = on ? String(N.connections().length) : "";
    const sent = on ? N.sent().length : 0;
    $("#mSent").textContent = sent ? String(sent) : "";
  }
  function renderTab() {
    renderManage();
    if (activeTab === "explore") { renderRequests(); renderPeople(); }
    else if (activeTab === "sent") renderSent();
    else if (activeTab === "messages") { renderChatList(); renderThread(); }
  }

  function parseHash() {
    const [tab, sub] = decodeURIComponent(location.hash.replace(/^#/, "")).split("/");
    return { tab: TABS.includes(tab) ? tab : "explore", sub: sub || null };
  }
  function route() {
    const { tab, sub } = parseHash();
    showTab(tab);
    if (tab === "explore" && sub) {
      Mori.people.openMember(sub, { onClose: () => { if (/^#explore\//.test(location.hash)) history.replaceState(null, "", "#explore"); } })
        .then((ok) => { if (!ok) history.replaceState(null, "", "#explore"); });
    }
    if (tab !== "messages") return;
    if (sub) openChat(sub);
    else if (!isNarrow()) openChat(activeChat || (chatPeople()[0] || {}).id, { quiet: true });
    else closeChat();
  }
  window.addEventListener("hashchange", route);

  /* ---------- Discover: filters (dropdowns) ---------- */
  const filters = { q: "", role: "all", exp: "", region: "", rating: 0, industries: new Set() };
  const peopleQ = $("#peopleQ");
  const ratingSel = $("#ratingMin");
  const roleSel = $("#roleSel");
  const expSel = $("#expSel");
  const regionSel = $("#regionSel");
  const filtersOn = () => !!(filters.q || filters.role !== "all" || filters.exp || filters.region || filters.rating || filters.industries.size);

  expSel.innerHTML = `<option value="">Any experience</option>` + D.experience.map((x) => `<option value="${esc(x)}">${esc(dash(x))}</option>`).join("");

  /** Role: all, founders, specialists, or a specialist role (those members picked come first). */
  function renderRoleOptions() {
    const used = {};
    discoverable().forEach((m) => { if (m.role === "specialist" && m.specialty) used[m.specialty] = (used[m.specialty] || 0) + 1; });
    const all = Array.from(new Set(Object.keys(used).concat(D.specialties)));
    const named = all.filter((x) => used[x]).sort((a, b) => used[b] - used[a] || a.localeCompare(b));
    const rest = all.filter((x) => !used[x]).sort((a, b) => a.localeCompare(b));
    const opt = (x) => `<option value="spec:${esc(x)}">${esc(x)}${used[x] ? ` (${used[x]})` : ""}</option>`;
    roleSel.innerHTML = `<option value="all">All</option><option value="founder">Founders</option><option value="specialist">Specialists</option>`
      + (named.length ? `<optgroup label="Specialists on Sandbox">${named.map(opt).join("")}</optgroup>` : "")
      + `<optgroup label="Specialist roles">${rest.map(opt).join("")}</optgroup>`;
    roleSel.value = filters.role;
    if (roleSel.value !== filters.role) roleSel.value = "all";
  }
  /** Region: the regions members are in first, then every region. */
  function renderRegionOptions() {
    const used = {};
    discoverable().forEach((m) => { if (m.region) used[m.region] = (used[m.region] || 0) + 1; });
    const named = Object.keys(used).sort((a, b) => used[b] - used[a] || a.localeCompare(b));
    const opt = (x) => `<option value="${esc(x)}">${esc(x)}${used[x] ? ` (${used[x]})` : ""}</option>`;
    regionSel.innerHTML = `<option value="">Any region</option>`
      + (named.length ? `<optgroup label="Where members are">${named.map(opt).join("")}</optgroup>` : "")
      + D.regions.map((g) => `<optgroup label="${esc(g.group)}">${g.items.filter((x) => !used[x]).map(opt).join("")}</optgroup>`).join("");
    regionSel.value = filters.region;
  }

  function matches(m) {
    if (filters.role.startsWith("spec:")) { if (m.role !== "specialist" || m.specialty !== filters.role.slice(5)) return false; }
    else if (filters.role !== "all" && m.role !== filters.role) return false;
    if (filters.exp && m.experience !== filters.exp) return false;
    if (filters.region && m.region !== filters.region) return false;
    if (filters.rating && !(m.rating != null && m.rating >= filters.rating)) return false;
    if (filters.industries.size && !m.industries.some((x) => filters.industries.has(x))) return false;
    if (filters.q) {
      const hay = [m.name, m.headline, m.bio, m.region, m.employment, m.specialty, roleLabel(m.role), openLabel(m), ...m.industries, ...m.skills, ...m.languages.map((l) => l.name)]
        .join(" ").toLowerCase();
      if (!filters.q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const newestFirst = (a, b) => b.joinedAt - a.joinedAt;
  /** Discover is for meeting people: members you're already connected with live under Connections. */
  const discoverable = () => N.members().filter((m) => N.status(m.id) !== "connected");

  function syncControls() {
    peopleQ.value = filters.q;
    renderRoleOptions();
    renderRegionOptions();
    expSel.value = filters.exp;
    ratingSel.value = String(filters.rating);
    setIndustryToggle();
    [roleSel, expSel, regionSel, ratingSel].forEach((s) => s.classList.toggle("is-set", s.value !== "all" && s.value !== "" && s.value !== "0"));
  }
  function clearFilters(silent) {
    Object.assign(filters, { q: "", role: "all", exp: "", region: "", rating: 0 });
    filters.industries.clear();
    syncControls();
    if (!silent) renderPeople();
  }

  /* Invisible members can only be found by their exact full name. */
  const normName = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
  let lookupTimer = 0;
  let lookedUp = "";
  function lookUpByName() {
    clearTimeout(lookupTimer);
    const q = normName(peopleQ.value);
    if (!N.available() || q.length < 3 || !q.includes(" ") || q === lookedUp) return;
    lookupTimer = setTimeout(() => {
      lookedUp = q;
      Mori.db.findMember(q).then((list) => { if (list.length) { N.remember(list); renderPeople(); } }).catch(() => { lookedUp = ""; });
    }, 350);
  }
  peopleQ.addEventListener("input", () => { filters.q = peopleQ.value.trim().toLowerCase(); renderPeople(); lookUpByName(); });
  const onSelect = (sel, key, cast = (v) => v) => sel.addEventListener("change", () => { filters[key] = cast(sel.value); syncControls(); renderPeople(); });
  onSelect(roleSel, "role");
  onSelect(expSel, "exp");
  onSelect(regionSel, "region");
  onSelect(ratingSel, "rating", (v) => Number(v) || 0);

  /* Industry: a searchable checklist. Industries members have chosen come first. */
  const indFilter = $("#indFilter");
  const indToggle = $("#indToggle");
  const indPanel = $("#indPanel");
  const indQ = $("#indQ");
  const indList = $("#indList");

  function industryCounts() {
    const counts = {};
    discoverable().forEach((m) => m.industries.forEach((x) => { counts[x] = (counts[x] || 0) + 1; }));
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
      case "connected": return `<button class="btn btn--ink" type="button" data-message="${id}">${icon("message")} Message</button>`;
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
    if (m.invisible) return invisibleCard(m);
    const where = [m.region, m.employment].filter(Boolean).map(esc).join(" · ");
    const open = openLabel(m);
    const connected = N.status(m.id) === "connected";
    return `
      <article class="pcard person spotlight" data-person="${esc(m.id)}">
        <button class="person-top" type="button" data-view="${esc(m.id)}" aria-label="View ${esc(m.name)}’s profile">
          ${avatar(m, 52, { ring: m.open })}
          <span class="person-id"><b class="person-name">${esc(m.name)}</b><span class="meta">${where || (m.joinedAt ? `Joined ${esc(new Date(m.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }))}` : roleLabel(m.role))}</span></span>
        </button>
        <div class="chips">${roleChip(m.role, m.specialty)}${connected ? `<span class="chip chip--emerald">${icon("check")} Connected</span>` : open ? `<span class="chip chip--emerald"><i class="live-dot"></i>${esc(open)}</span>` : ""}</div>
        ${m.headline ? `<p class="person-head">${esc(m.headline)}</p>` : ""}
        ${m.limited
          ? `<p class="person-note">${icon("shield")}${esc(first(m.name))} shares their full profile with connections.</p>`
          : `<div class="person-facts">${ratingFact(m)}</div>
             ${m.industries.length ? `<div class="tags">${m.industries.map((x, i) => `<span class="badge badge--${HUES[i % HUES.length]}">${esc(x)}</span>`).join("")}</div>` : ""}`}
        <div class="pcard-actions">
          ${connectButton(m)}
          <button class="btn" type="button" data-view="${esc(m.id)}">View profile</button>
        </div>
      </article>`;
  }
  /** An invisible member: name, when they joined and the default photo. No connecting. */
  function invisibleCard(m) {
    const id = esc(m.id);
    const pending = N.status(m.id) === "pending";
    return `
      <article class="pcard person is-invisible" data-person="${id}">
        <button class="person-top" type="button" data-view="${id}" aria-label="View ${esc(m.name)}’s profile">
          ${avatar({ id: m.id, name: m.name }, 52)}
          <span class="person-id"><b class="person-name">${esc(m.name)}</b><span class="meta">${m.joinedAt ? `Joined SandBox ${esc(new Date(m.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }))}` : "SandBox member"}</span></span>
        </button>
        <p class="person-note">${icon("shield")}Invisible on the MORI Network. You can’t connect with them.</p>
        <div class="pcard-actions">
          ${pending ? `<button class="btn is-pending" type="button" data-withdraw="${id}" title="Withdraw your request">${icon("check")} Pending</button>` : ""}
          <button class="btn" type="button" data-view="${id}">View profile</button>
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
  let optionsFor = null; // the member list the role and region menus were built from
  function renderPeople() {
    const grid = $("#peopleGrid");
    renderActiveFilters();
    const optionsKey = discoverable().map((m) => m.id).join(",");
    if (optionsFor !== optionsKey) { optionsFor = optionsKey; renderRoleOptions(); renderRegionOptions(); }
    const all = N.members();

    if (loadState === "off") {
      grid.innerHTML = "";
      shownIds = null;
      showPeopleEmpty(`<span class="empty-ico">${icon("network")}</span><div>Sign in with Google to meet members</div><div class="meta">Demo accounts stay on this device, so there’s no one else here.</div>`);
      return;
    }
    if (!all.length && loadState === "loading") {
      grid.innerHTML = skeleton() + skeleton() + skeleton();
      shownIds = null;
      showPeopleEmpty("");
      return;
    }
    if (!all.length && loadState === "error") {
      grid.innerHTML = "";
      shownIds = null;
      showPeopleEmpty(`<span class="empty-ico">${icon("refresh")}</span><div>Couldn’t load members</div><div class="meta">${esc((loadError && loadError.message) || "Check your connection and try again.")}</div><button class="btn" type="button" data-retry>${icon("refresh")} Try again</button>`);
      return;
    }

    const pool = discoverable();
    // Someone searched an invisible member's exact full name: show them first, whatever the filters.
    const q = normName(peopleQ.value);
    const found = q ? N.found().filter((m) => normName(m.name) === q && !pool.some((p) => p.id === m.id)) : [];
    const list = found.concat(pool.filter(matches).sort(newestFirst));
    grid.innerHTML = list.map(personCard).join("");
    const ids = list.map((m) => m.id).join(",");
    if (ids !== shownIds) Mori.motion.enter(grid);
    shownIds = ids;

    if (!all.length) {
      showPeopleEmpty(`<span class="empty-ico">${icon("userPlus")}</span><div>You’re one of the first members</div><div class="meta">Founders and specialists appear here as soon as they finish signing up.</div>`);
    } else if (!pool.length) {
      showPeopleEmpty(`<span class="empty-ico">${icon("network")}</span><div>You’re connected with everyone so far</div><div class="meta">New founders and specialists appear here as they join. Your connections are under Manage my network.</div><button class="btn" type="button" data-connections>${icon("network")} See your connections</button>`);
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
    syncControls();
    if (activeTab !== "explore") location.hash = "explore";
    else renderPeople();
    setTimeout(() => $(".explore").scrollIntoView({ behavior: smooth(), block: "start" }), 90);
    toast(`Showing ${want === "founder" ? "founders" : "specialists"}`, { icon: "userPlus" });
  });

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
          <div class="req-title"><button class="req-name" type="button" data-view="${id}">${esc(p.name)}</button>${roleChip(p.role, p.specialty)}</div>
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
          <div class="req-title"><button class="req-name" type="button" data-view="${id}">${esc(p.name)}</button>${roleChip(p.role, p.specialty)}</div>
          <span class="meta">Sent ${esc(ago(x.at).toLowerCase())}</span>
          ${x.note ? `<p class="req-note">“${esc(x.note)}”</p>` : ""}
        </div>
        <div class="req-actions"><span class="chip chip--blue">Pending</span><button class="btn btn--sm" type="button" data-withdraw="${id}">Withdraw</button></div>
      </article>`;
  }
  let showAllRequests = false;
  const REQUESTS_SHOWN = 3;
  function renderRequests() {
    if (holdRequests) return;
    const recv = $("#recvList");
    const more = $("#recvMore");
    const title = $("#recvTitle");
    more.hidden = true;
    if (loadState === "off") {
      title.textContent = "Requests";
      recv.innerHTML = `<p class="meta req-none">Connection requests need a Google sign-in, so demo accounts don’t have any.</p>`;
      return;
    }
    if (loadState === "loading" && !N.links().length) {
      title.textContent = "Requests";
      recv.innerHTML = `<div class="req-loading meta">Loading requests…</div>`;
      return;
    }
    const incoming = N.incoming();
    title.textContent = incoming.length ? `Requests (${incoming.length})` : "Requests";
    const shown = showAllRequests ? incoming : incoming.slice(0, REQUESTS_SHOWN);
    recv.innerHTML = incoming.length ? shown.map(receivedRow).join("") : `<p class="meta req-none">No requests waiting. When founders or specialists want to connect, they’ll show up here.</p>`;
    if (incoming.length > REQUESTS_SHOWN) { more.hidden = false; more.textContent = showAllRequests ? "Show less" : `Show all ${incoming.length}`; }
    const ids = shown.map((x) => x.link.id).join(",");
    if (ids !== shownRequests) Mori.motion.enter(recv);
    shownRequests = ids;
  }
  $("#recvMore").addEventListener("click", () => { showAllRequests = !showAllRequests; renderRequests(); });

  let shownSent = null;
  function renderSent() {
    if (holdRequests) return;
    const sentEl = $("#sentList");
    if (loadState === "off") {
      $("#sentCount").textContent = "";
      sentEl.innerHTML = emptyHTML("network", "Sign in with Google to connect", "Connection requests need a Sandbox account, so demo accounts don’t have any.", "", "req-empty");
      return;
    }
    const sent = N.sent();
    $("#sentCount").textContent = sent.length ? `${sent.length} pending` : "";
    sentEl.innerHTML = sent.length ? sent.map(sentRow).join("") : emptyHTML("userPlus", "No pending requests.", "Find people in Discover and hit Connect.", `<a class="btn btn--sm" href="#explore">${icon("compass")} Discover members</a>`, "req-empty");
    const ids = sent.map((x) => x.link.id).join(",");
    if (ids !== shownSent) Mori.motion.enter(sentEl);
    shownSent = ids;
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
      renderTab();
      if (res.status === "fulfilled") { if (done) done(); } else fail(res.reason);
    });
  }
  // Actions on request rows (everything else is handled by people.js).
  $(".net-main").addEventListener("click", (e) => {
    const t = e.target.closest(".req [data-accept], .req [data-ignore], .req [data-withdraw]");
    if (!t) return;
    const d = t.dataset;
    const id = d.accept || d.ignore || d.withdraw;
    const p = N.member(id);
    const name = p ? p.name : "this member";
    const row = t.closest(".req");
    if (d.accept) leaveRow(row, () => N.accept(id), () => toast(`You’re now connected with ${name}`, { icon: "check" }));
    else if (d.ignore) leaveRow(row, () => N.ignore(id), () => toast("Request ignored", { icon: "x" }));
    else leaveRow(row, () => N.withdraw(id), () => toast("Request withdrawn", { icon: "x" }));
  });

  /* ---------- Messages ---------- */
  const chat = $("#chat");
  let activeChat = null;
  let announcedId = null; // newest incoming message already announced to screen readers

  /** Size the panel to the space under the sticky tab bar; optionally scroll it into place. */
  function fitChat(scroll) {
    const nav = document.getElementById("topNav");
    const top = (nav ? nav.offsetHeight : 72) + 16;
    document.documentElement.style.setProperty("--chatTop", top + "px");
    if (!scroll || activeTab !== "messages") return;
    const y = Math.round(chat.getBoundingClientRect().top + window.scrollY - top);
    if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: y, behavior: smooth() });
  }
  window.addEventListener("resize", () => fitChat(false));

  /** Conversations first (newest on top), then connections you haven't messaged yet. */
  function chatPeople() {
    const threads = C.threads();
    const seen = new Set(threads.map((t) => t.id));
    const fresh = N.connections().filter((p) => !seen.has(p.id)).map((p) => ({ id: p.id, person: p, last: null, unread: 0, at: 0 }));
    return threads.concat(fresh);
  }
  /** Who you're looking at is "read" only while the page is visible. */
  function setViewing(id) {
    C.viewing = id;
    if (id && !document.hidden) C.markRead(id);
  }
  document.addEventListener("visibilitychange", () => {
    if (activeTab === "messages" && activeChat) setViewing(document.hidden ? null : activeChat);
  });

  function renderChatList() {
    const term = $("#chatQ").value.trim().toLowerCase();
    const all = chatPeople();
    const list = all.filter((t) => !term || t.person.name.toLowerCase().includes(term) || (t.last && t.last.body.toLowerCase().includes(term)));
    const preview = (t) => {
      if (!t.last) return esc(t.person.headline || "Say hello");
      const text = (t.last.from === t.id ? "" : "You: ") + t.last.body;
      return esc(text.length > 80 ? text.slice(0, 79) + "…" : text);
    };
    $("#chatList").innerHTML = list.length
      ? list.map((t) => `
          <button class="chat-item ${t.id === activeChat ? "is-on" : ""} ${t.unread ? "is-unread" : ""}" type="button" role="listitem" data-chat="${esc(t.id)}">
            ${avatar(t.person, 42, { ring: t.person.open })}
            <span class="chat-copy"><b>${esc(t.person.name)}</b><span class="preview">${preview(t)}</span></span>
            <span class="chat-meta">${t.last ? esc(shortAgo(t.at)) : "New"}${t.unread ? `<span class="unread-dot" aria-label="${t.unread} unread"></span>` : ""}</span>
          </button>`).join("")
      : `<div class="chat-none meta">${loadState === "off" ? "Sign in with Google to message members." : all.length ? "No conversations match." : "Your connections appear here once a request is accepted."}</div>`;
  }

  function chatIntro() {
    const any = N.connections().length;
    return `<div class="chat-empty"><span class="empty-ico">${icon("message")}</span><p><b>${loadState === "off" ? "Messaging needs a Google sign-in" : any ? "Pick a conversation" : "No connections to message yet"}</b></p><p class="meta">${loadState === "off" ? "Demo accounts can’t message other members." : any ? "Messages arrive here as soon as they’re sent." : "Connect with founders and specialists in Discover, then message them here."}</p>${!any && loadState !== "off" ? `<a class="btn btn--sm" href="#explore">${icon("compass")} Discover members</a>` : ""}</div>`;
  }
  function bubbles(id) {
    const msgs = C.thread(id);
    if (!msgs.length) return "";
    const lastMine = [...msgs].reverse().find((m) => m.from !== id && !m.pending && !m.failed);
    let day = "";
    return msgs.map((m) => {
      const mine = m.from !== id;
      const d = new Date(m.at).toDateString();
      const divider = d !== day ? `<span class="chat-day">${esc(d === new Date().toDateString() ? "Today" : new Date(m.at).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }))}</span>` : "";
      day = d;
      let status = esc(clock(m.at));
      if (m.pending) status = `${icon("clock")} Sending…`;
      else if (m.failed) status = `<span class="cb-failed">${icon("alert")} Not sent</span> · <button class="link-btn" type="button" data-retry-msg="${esc(m.id)}">Try again</button> · <button class="link-btn" type="button" data-discard-msg="${esc(m.id)}">Remove</button>`;
      else if (lastMine && m.id === lastMine.id && m.readAt) status += ` · ${icon("checks")} Seen`;
      return `${divider}<div class="cb-row ${mine ? "me" : ""} ${m.pending ? "is-pending" : ""} ${m.failed ? "is-failed" : ""}" data-mid="${esc(m.id)}"><div class="cb">${esc(m.body)}</div><span class="cb-time">${status}</span></div>`;
    }).join("");
  }
  function renderThread() {
    if (!activeChat) {
      chat.classList.remove("is-thread");
      $("#chatMain").innerHTML = chatIntro();
      return;
    }
    const p = N.member(activeChat);
    if (!p) { closeChat(); return; }
    const sc = $("#chatScroll");
    const nearBottom = !sc || sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80;
    const canSend = N.status(p.id) === "connected";
    const head = $("#chatMain .chat-head");
    const fresh = !head || head.dataset.who !== p.id;
    if (fresh) {
      $("#chatMain").innerHTML = `
        <header class="chat-head" data-who="${esc(p.id)}">
          <button class="icon-btn chat-back" type="button" data-chat-back aria-label="Back to conversations">${icon("chevronLeft")}</button>
          <button class="chat-who" type="button" data-view="${esc(p.id)}" aria-label="View ${esc(p.name)}’s profile">
            ${avatar(p, 40, { ring: p.open })}
            <span class="who"><b>${esc(p.name)}</b><span class="meta">${esc(p.headline || roleLabel(p.role))}</span></span>
          </button>
          ${roleChip(p.role, p.specialty)}
        </header>
        <div class="chat-scroll" id="chatScroll"></div>
        <p class="sr-only" id="chatAnnounce" aria-live="polite"></p>
        <form class="chat-compose" id="chatForm" autocomplete="off">
          <input class="input" id="chatInput" maxlength="2000" aria-label="Message ${esc(p.name)}">
          <button class="btn btn--ink" type="submit" aria-label="Send">${icon("send")}</button>
        </form>`;
      $("#chatForm").addEventListener("submit", onSend);
    }
    const msgs = bubbles(p.id);
    $("#chatScroll").innerHTML = `<span class="chat-note">${msgs ? `Only you and ${esc(first(p.name))} can see these messages.` : `Say hello to ${esc(first(p.name))}. Only the two of you can see this conversation.`}</span>${msgs}`;
    // Screen readers hear new incoming messages only, not the whole conversation again.
    const lastIn = C.thread(p.id).filter((m) => m.from === p.id).pop();
    const lastInId = lastIn ? lastIn.id : null;
    if (!fresh && lastInId && lastInId !== announcedId) $("#chatAnnounce").textContent = `${first(p.name)}: ${lastIn.body}`;
    announcedId = lastInId;
    const input = $("#chatInput");
    input.disabled = !canSend;
    input.placeholder = canSend ? `Message ${first(p.name)}…` : `You’re no longer connected with ${first(p.name)}`;
    $("#chatForm button").disabled = !canSend;
    if (nearBottom) scrollChat(false);
  }
  function scrollChat(animated) {
    const sc = $("#chatScroll");
    if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: animated ? smooth() : "instant" });
  }
  function closeChat() {
    activeChat = null;
    setViewing(null);
    renderChatList();
    renderThread();
  }
  function openChat(id, opts = {}) {
    const p = id && N.member(id);
    if (!p || (N.status(id) !== "connected" && !C.thread(id).length)) {
      if (id && !opts.quiet && loadState === "ready") toast("You can message people once you’re connected", { icon: "message" });
      closeChat();
      return;
    }
    activeChat = id;
    chat.classList.add("is-thread");
    setViewing(id);
    renderChatList();
    renderThread();
    scrollChat(false);
    if (isNarrow() && !opts.quiet) requestAnimationFrame(() => fitChat(true));
    if (!opts.quiet && !isNarrow()) $("#chatInput").focus({ preventScroll: true });
  }

  function onSend(e) {
    e.preventDefault();
    const input = $("#chatInput");
    const text = input.value.trim();
    if (!text || !activeChat) return;
    input.value = "";
    C.send(activeChat, text).catch((err) => {
      if (err && err.code === "signed-out") fail(err);
      else toast(N.status(activeChat) === "connected" ? "Your message wasn’t sent. Try again." : "You’re no longer connected, so the message wasn’t sent.", { icon: "x", duration: 3600 });
    });
    scrollChat(true);
  }

  $("#chatQ").addEventListener("input", renderChatList);
  $("#chatList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-chat]");
    if (!item) return;
    history.replaceState(null, "", "#messages/" + item.dataset.chat);
    openChat(item.dataset.chat);
  });
  $("#chatMain").addEventListener("click", (e) => {
    if (e.target.closest("[data-chat-back]")) {
      history.replaceState(null, "", "#messages");
      closeChat();
      return;
    }
    const retry = e.target.closest("[data-retry-msg]");
    if (retry) { C.retry(retry.dataset.retryMsg).catch(() => toast("Still couldn’t send it. Check your connection.", { icon: "x" })); return; }
    const discard = e.target.closest("[data-discard-msg]");
    if (discard) C.discard(discard.dataset.discardMsg);
  });

  /* ---------- Everything else on the page ---------- */
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-retry]")) { load(true); return; }
    if (e.target.closest("[data-clear-filters]")) clearFilters();
  });

  // New data from Supabase, a live update, or a change you just made.
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (key === "messages") {
      if (activeTab === "messages") {
        if (activeChat && C.viewing === activeChat && !document.hidden) C.markRead(activeChat);
        renderChatList();
        renderThread();
      }
      return;
    }
    if (key !== "network" && key !== "links") return;
    if (key === "network" && loadState !== "off") loadState = "ready";
    renderTab();
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
        if (activeTab === "messages" && !activeChat && parseHash().sub) route();
      },
      (err) => {
        if (err && err.code === "signed-out") { Mori.people.signInAgain(err.message); return; }
        loadError = err;
        loadState = N.members().length ? "ready" : "error";
        renderTab();
        if (loadState === "ready") toast("Couldn’t refresh the network. Showing what was loaded before.", { icon: "x" });
      }
    );
    C.refresh({ force }).catch(() => {});
  }

  /* ---------- Boot ---------- */
  syncControls();
  route();
  load(false);
})();
