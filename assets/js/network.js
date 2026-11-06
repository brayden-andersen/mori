/* ==========================================================================
   Mori: Sandbox — Network page
   --------------------------------------------------------------------------
   Tabs are routed by the hash so the nav dropdown can deep-link:
     #explore · #requests · #messages · #messages/<person id>
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, avatarStack, ago, toast } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const TABS = ["explore", "requests", "messages"];
  const hue = (role) => (D.roles[role] || {}).hue || "gray";
  const label = (role) => (D.roles[role] || {}).label || "Member";
  const first = (name) => String(name).split(/\s+/)[0];
  const isNarrow = () => window.matchMedia("(max-width: 760px)").matches;
  const smooth = () => (Mori.motion.reduced() ? "instant" : "smooth");

  $$("i[data-icon]").forEach((el) => { el.outerHTML = icon(el.dataset.icon); });

  /* ---------- Tabs ---------- */
  const tabs = $$(".net-tab");
  const glider = $(".net-glider");
  let activeTab = null;

  function placeGlider(snap) {
    const on = tabs.find((t) => t.dataset.tab === activeTab);
    if (!on || !on.offsetWidth) return;
    if (snap) glider.style.transition = "none";
    glider.style.width = on.offsetWidth + "px";
    glider.style.transform = `translateX(${on.offsetLeft}px)`;
    if (snap) { void glider.offsetWidth; glider.style.transition = ""; }
  }

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
    placeGlider(initial);
    if (tab === "explore") { renderPeople(); renderRooms(); }
    if (tab === "requests") renderRequests();
    if (tab === "messages") { renderChatList(); requestAnimationFrame(() => fitChat(true)); }
  }

  function parseHash() {
    const [tab, sub] = decodeURIComponent(location.hash.replace(/^#/, "")).split("/");
    return { tab: TABS.includes(tab) ? tab : "explore", sub: sub || null };
  }
  function route() {
    const { tab, sub } = parseHash();
    showTab(tab);
    if (tab !== "messages") return;
    if (sub && S.person(sub)) { S.threads.ensure(sub); openThread(sub); }
    else if (!isNarrow()) openThread(activeThread || (S.threads.list()[0] || {}).id || null, { quiet: true });
    else closeThread();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", () => placeGlider(true));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeGlider(true));

  /* ---------- Explore: people ---------- */
  const peopleQ = $("#peopleQ");
  const openOnly = $("#openOnly");
  let roleFilter = "all";

  function connectButton(p) {
    switch (S.network.status(p.id)) {
      case "connected": return `<span class="btn is-done" role="status">${icon("check")} Connected</span>`;
      case "pending":   return `<button class="btn is-pending" type="button" data-withdraw="${esc(p.id)}" title="Withdraw request">${icon("check")} Pending</button>`;
      case "incoming":  return `<button class="btn btn--ink" type="button" data-accept="${esc(p.id)}">${icon("userPlus")} Accept</button>`;
      default:          return `<button class="btn btn--ink" type="button" data-connect="${esc(p.id)}">${icon("userPlus")} Connect</button>`;
    }
  }
  function personCard(p) {
    return `
      <article class="pcard person spotlight" data-person="${esc(p.id)}">
        <div class="person-top">
          ${avatar(p, 52, { ring: p.open })}
          <div class="person-id"><h4>${esc(p.name)}</h4><div class="meta">${esc(p.title)} · ${esc(p.city)}</div></div>
        </div>
        <span class="chip chip--${hue(p.role)}">${label(p.role)}</span>
        <p class="person-head">${esc(p.headline)}</p>
        <p class="intent">${icon("target")}${esc(p.intent)}</p>
        <div class="tags">${p.skills.map((k) => `<span class="badge badge--gray">${esc(k)}</span>`).join("")}</div>
        <div class="person-mutual">${p.mutual} mutual connection${p.mutual === 1 ? "" : "s"}</div>
        <div class="pcard-actions" data-actions="${esc(p.id)}">
          ${connectButton(p)}
          <button class="btn" type="button" data-message="${esc(p.id)}">${icon("message")} Message</button>
        </div>
      </article>`;
  }
  function filteredPeople() {
    const term = peopleQ.value.trim().toLowerCase();
    return S.people().filter((p) =>
      (roleFilter === "all" || p.role === roleFilter) &&
      (!openOnly.checked || p.open) &&
      (!term || [p.name, p.title, p.headline, p.city, p.intent, ...p.skills].join(" ").toLowerCase().includes(term))
    );
  }
  function renderPeople() {
    const list = filteredPeople();
    const grid = $("#peopleGrid");
    grid.innerHTML = list.map(personCard).join("");
    $("#peopleEmpty").hidden = list.length > 0;
    $("#peopleCount").textContent = `${list.length} ${list.length === 1 ? "person" : "people"}`;
    Mori.motion.enter(grid);
  }
  function refreshPerson(id) {
    const box = document.querySelector(`[data-actions="${CSS.escape(id)}"]`);
    if (!box) return;
    box.firstElementChild.outerHTML = connectButton(S.person(id));
    box.firstElementChild.classList.add("enter");
  }

  $("#roleChips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-role-filter]");
    if (!chip) return;
    roleFilter = chip.dataset.roleFilter;
    $$("[data-role-filter]").forEach((c) => { c.dataset.active = String(c === chip); });
    renderPeople();
  });
  peopleQ.addEventListener("input", renderPeople);
  openOnly.addEventListener("change", renderPeople);

  $("#findCofounder").addEventListener("click", () => {
    roleFilter = "builder";
    $$("[data-role-filter]").forEach((c) => { c.dataset.active = String(c.dataset.roleFilter === "builder"); });
    openOnly.checked = true;
    peopleQ.value = "";
    if (activeTab !== "explore") location.hash = "explore";
    else renderPeople();
    setTimeout(() => $("#peopleGrid").scrollIntoView({ behavior: smooth(), block: "start" }), 90);
    toast("Showing builders who are open to build", { icon: "userPlus" });
  });

  /* ---------- Explore: rooms (live counts tick) ---------- */
  const ROOM_GRAD = { purple: ["#a78bfa", "#8b5cf6"], blue: ["#60a5fa", "#3b82f6"], orange: ["#fb923c", "#f97316"], emerald: ["#34d399", "#10b981"], teal: ["#2dd4bf", "#14b8a6"] };
  const live = {};
  S.rooms().forEach((r) => { live[r.id] = r.online; });

  function renderRooms() {
    $("#rooms").innerHTML = S.rooms()
      .map((r) => {
        const joined = S.network.isJoined(r.id);
        const [c1, c2] = ROOM_GRAD[r.hue] || ROOM_GRAD.blue;
        return `
          <div class="room spotlight" data-room="${esc(r.id)}">
            <span class="room-ico" style="--c1:${c1};--c2:${c2}">${icon(r.lobby ? "zap" : "radio")}</span>
            <div class="room-main"><b>${esc(r.name)}</b><span class="meta">${esc(r.topic)}</span></div>
            <span class="room-live"><i class="live-dot"></i><span class="room-count" data-live="${esc(r.id)}">${live[r.id]}</span> online</span>
            ${avatarStack(r.members.map(S.person).filter(Boolean), 26)}
            <button class="btn btn--sm ${joined ? "is-done" : ""}" type="button" data-join="${esc(r.id)}">${joined ? icon("check") + " Joined" : r.lobby ? "Enter lobby" : "Join room"}</button>
          </div>`;
      })
      .join("");
  }
  setInterval(() => {
    if (document.hidden || activeTab !== "explore" || Mori.motion.reduced()) return;
    const rooms = S.rooms();
    const r = rooms[Math.floor(Math.random() * rooms.length)];
    live[r.id] = Math.max(3, live[r.id] + (Math.random() < 0.55 ? 1 : -1));
    const el = document.querySelector(`[data-live="${r.id}"]`);
    if (!el) return;
    el.textContent = live[r.id];
    el.classList.remove("is-tick");
    void el.offsetWidth;
    el.classList.add("is-tick");
  }, 2600);

  /* ---------- Requests ---------- */
  const emptyBlock = (ic, title, sub) => `<div class="empty req-empty"><span class="empty-ico">${icon(ic)}</span><div>${title}</div><div class="meta">${sub}</div></div>`;

  function receivedRow(x) {
    const p = x.person;
    return `
      <article class="req" data-req="${esc(p.id)}">
        ${avatar(p, 48, { ring: p.open })}
        <div class="req-main">
          <div class="req-title"><b>${esc(p.name)}</b><span class="chip chip--${hue(p.role)}">${label(p.role)}</span></div>
          <span class="meta">${esc(p.title)} · ${esc(p.city)} · ${p.mutual} mutual</span>
          ${x.note ? `<p class="req-note">“${esc(x.note)}”</p>` : ""}
          <span class="meta">${esc(ago(x.at))}</span>
        </div>
        <div class="req-actions">
          <button class="btn btn--sm" type="button" data-ignore="${esc(p.id)}">Ignore</button>
          <button class="btn btn--sm btn--ink" type="button" data-accept="${esc(p.id)}">${icon("check")} Accept</button>
        </div>
      </article>`;
  }
  function sentRow(p) {
    return `
      <article class="req" data-req="${esc(p.id)}">
        ${avatar(p, 44)}
        <div class="req-main">
          <div class="req-title"><b>${esc(p.name)}</b><span class="chip chip--${hue(p.role)}">${label(p.role)}</span></div>
          <span class="meta">${esc(p.title)} · ${esc(p.city)}</span>
        </div>
        <div class="req-actions"><span class="chip chip--blue">Pending</span><button class="btn btn--sm" type="button" data-withdraw="${esc(p.id)}">Withdraw</button></div>
      </article>`;
  }
  function renderRequests() {
    const incoming = S.network.incoming();
    const sent = S.network.sent();
    $("#recvCount").textContent = incoming.length ? `${incoming.length} waiting` : "";
    $("#sentCount").textContent = sent.length ? `${sent.length} pending` : "";
    $("#recvList").innerHTML = incoming.length ? incoming.map(receivedRow).join("") : emptyBlock("inbox", "No requests waiting.", "When founders, builders or mentors want to connect, they’ll show up here.");
    $("#sentList").innerHTML = sent.length ? sent.map(sentRow).join("") : emptyBlock("userPlus", "No pending requests.", "Find people in Explore and hit Connect.");
    Mori.motion.enter($("#recvList"));
    Mori.motion.enter($("#sentList"));
  }
  /** Collapse a request row, then run the state change + re-render. */
  function collapse(row, then) {
    if (!row || Mori.motion.reduced()) { then(); return; }
    row.style.maxHeight = row.offsetHeight + "px";
    void row.offsetWidth;
    row.classList.add("is-leaving");
    setTimeout(then, 430);
  }

  /* ---------- Messages ---------- */
  const chat = $("#chat");
  let activeThread = null;
  const pendingReply = {};

  /** Size the chat to the space under the sticky tab bar; optionally scroll it into place. */
  function fitChat(scroll) {
    const nav = document.getElementById("topNav");
    const top = (nav ? nav.offsetHeight : 72) + 12 + $(".net-bar").offsetHeight + 14;
    document.documentElement.style.setProperty("--chatTop", top + "px");
    if (!scroll || activeTab !== "messages") return;
    const y = Math.round(chat.getBoundingClientRect().top + window.scrollY - top);
    if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: y, behavior: smooth() });
  }
  window.addEventListener("resize", () => fitChat(false));

  const bubble = (m, pop) =>
    `<div class="cb-row ${m.from === "me" ? "me" : ""} ${pop ? "pop" : ""}"><div class="cb">${esc(m.text)}</div><span class="cb-time">${esc(ago(m.at))}</span></div>`;

  function renderChatList() {
    const term = $("#chatQ").value.trim().toLowerCase();
    const list = S.threads.list().filter((t) => !term || t.person.name.toLowerCase().includes(term) || (t.last && t.last.text.toLowerCase().includes(term)));
    $("#chatList").innerHTML = list.length
      ? list.map((t) => `
          <button class="chat-item ${t.id === activeThread ? "is-on" : ""} ${t.unread ? "is-unread" : ""}" type="button" role="listitem" data-thread="${esc(t.id)}">
            ${avatar(t.person, 42, { ring: t.person.open })}
            <span class="chat-copy"><b>${esc(t.person.name)}</b><span class="preview">${t.last ? (t.last.from === "me" ? "You: " : "") + esc(t.last.text) : "Start the conversation"}</span></span>
            <span class="chat-meta">${t.last ? esc(ago(t.at).replace(" ago", "")) : "New"}${t.unread ? '<span class="unread-dot" aria-label="Unread"></span>' : ""}</span>
          </button>`).join("")
      : `<div class="empty"><div class="meta">No conversations match.</div></div>`;
  }
  function scrollChat(animated) {
    const sc = $("#chatScroll");
    if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: animated ? smooth() : "instant" });
  }
  function closeThread() {
    activeThread = null;
    chat.classList.remove("is-thread");
    $("#chatMain").innerHTML = `<div class="chat-empty"><span class="empty-ico">${icon("message")}</span><p>Pick a conversation to start chatting.</p></div>`;
    renderChatList();
  }
  function openThread(id, opts = {}) {
    const p = id && S.person(id);
    if (!p) { closeThread(); return; }
    activeThread = id;
    S.threads.markRead(id);
    const th = S.threads.get(id);
    $("#chatMain").innerHTML = `
      <header class="chat-head">
        <button class="icon-btn chat-back" type="button" data-chat-back aria-label="Back to conversations">${icon("chevronLeft")}</button>
        ${avatar(p, 40, { ring: p.open })}
        <div class="who"><b>${esc(p.name)}</b><span class="meta">${esc(p.title)} · ${esc(p.city)}</span></div>
        <span class="chip chip--${hue(p.role)}">${label(p.role)}</span>
      </header>
      <div class="chat-scroll" id="chatScroll" aria-live="polite">
        <span class="chat-note">${th.messages.length ? `Conversation with ${esc(p.name)}` : `Say hello to ${esc(first(p.name))}. ${esc(p.intent)}.`}</span>
        ${th.messages.map((m) => bubble(m)).join("")}
      </div>
      <form class="chat-compose" id="chatForm" autocomplete="off">
        <input class="input" id="chatInput" placeholder="Write a message…" maxlength="600" aria-label="Message ${esc(p.name)}">
        <button class="btn btn--ink" type="submit" aria-label="Send">${icon("send")}</button>
      </form>`;
    chat.classList.add("is-thread");
    renderChatList();
    scrollChat(false);
    if (isNarrow()) requestAnimationFrame(() => fitChat(true));
    $("#chatForm").addEventListener("submit", onSend);
    if (!opts.quiet && !isNarrow()) $("#chatInput").focus({ preventScroll: true });
  }

  function onSend(e) {
    e.preventDefault();
    const input = $("#chatInput");
    const text = input.value.trim();
    if (!text || !activeThread) return;
    const id = activeThread;
    S.threads.send(id, text, "me");
    input.value = "";
    $("#chatScroll").insertAdjacentHTML("beforeend", bubble({ from: "me", text, at: Date.now() }, true));
    scrollChat(true);
    renderChatList();
    queueReply(id);
  }

  /* A canned reply with a typing indicator, so the concept feels alive */
  function queueReply(id) {
    if (pendingReply[id]) return;
    pendingReply[id] = true;
    const reply = D.replies[(S.threads.get(id).messages.length + id.length) % D.replies.length];
    setTimeout(() => {
      if (activeThread === id && activeTab === "messages") {
        $("#chatScroll").insertAdjacentHTML("beforeend", `<div class="cb-row pop typing-row"><div class="typing" aria-label="${esc(first(S.person(id).name))} is typing"><i></i><i></i><i></i></div></div>`);
        scrollChat(true);
      }
      setTimeout(() => {
        pendingReply[id] = false;
        const viewing = activeThread === id && activeTab === "messages";
        S.threads.send(id, reply, "them", { unread: !viewing });
        const typing = $(".typing-row");
        if (typing) typing.remove();
        if (viewing) {
          $("#chatScroll").insertAdjacentHTML("beforeend", bubble({ from: "them", text: reply, at: Date.now() }, true));
          scrollChat(true);
        } else {
          toast(`${first(S.person(id).name)} replied`, { icon: "message" });
        }
        renderChatList();
      }, 1500 + Math.random() * 900);
    }, 650);
  }

  $("#chatQ").addEventListener("input", renderChatList);
  $("#chatList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-thread]");
    if (!item) return;
    history.replaceState(null, "", "#messages/" + item.dataset.thread);
    openThread(item.dataset.thread);
  });
  $("#chatMain").addEventListener("click", (e) => {
    if (!e.target.closest("[data-chat-back]")) return;
    history.replaceState(null, "", "#messages");
    closeThread();
  });

  /* ---------- Actions (delegated) ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-connect],[data-withdraw],[data-accept],[data-ignore],[data-message],[data-join]");
    if (!t) return;
    const d = t.dataset;

    if (d.connect) {
      S.network.connect(d.connect);
      refreshPerson(d.connect);
      toast(`Request sent to ${S.person(d.connect).name}`, { icon: "userPlus" });
    } else if (d.withdraw) {
      const id = d.withdraw;
      collapse(t.closest(".req"), () => { S.network.withdraw(id); if (activeTab === "requests") renderRequests(); refreshPerson(id); });
      toast("Request withdrawn", { icon: "x" });
    } else if (d.accept) {
      const id = d.accept;
      collapse(t.closest(".req"), () => { S.network.accept(id); if (activeTab === "requests") renderRequests(); refreshPerson(id); });
      toast(`You’re now connected with ${S.person(id).name}`, { icon: "check" });
    } else if (d.ignore) {
      const id = d.ignore;
      collapse(t.closest(".req"), () => { S.network.ignore(id); renderRequests(); refreshPerson(id); });
    } else if (d.message) {
      S.threads.ensure(d.message);
      location.hash = "messages/" + d.message;
    } else if (d.join) {
      const room = S.rooms().find((r) => r.id === d.join);
      const joined = S.network.toggleRoom(d.join);
      renderRooms();
      toast(joined ? `Joined ${room.name}` : `Left ${room.name}`, { icon: joined ? "check" : "x" });
    }
  });

  /* ---------- Boot ---------- */
  route();
})();
