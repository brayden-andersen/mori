/* ==========================================================================
   Mori: Sandbox — homepage
   Greeting, the member's pinned project with its progress ring, recent
   messages and insights. Clicking through goes to the Projects and Network
   pages. Until the member adds something, each panel says how to start.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, esc, icon, ago, soon, splitWords } = Mori.ui;
  const S = Mori.state;
  const CHIP_HUES = ["emerald", "blue", "purple", "orange", "teal", "gray"];

  const emptyState = (ic, title, sub, action) =>
    `<div class="empty home-empty"><span class="empty-ico">${icon(ic)}</span><div>${title}</div><div class="meta">${sub}</div>${action || ""}</div>`;

  /* Greeting — "Welcome back, Brayden" (just "Welcome" on the first visit) */
  const s = S.session();
  const hello = $("#hello");
  hello.innerHTML = `${s.isNew ? "Welcome" : "Welcome back"}, <span id="username">${esc(s.givenName || s.name)}</span>`;
  splitWords(hello);
  if (s.isNew) Mori.auth.updateSession({ isNew: false });

  /* Pinned project — one wide tile, single tag, caption + ring (draft spec) */
  let pinnedKey = null;
  function renderPinned() {
    const pins = $("#pins");
    const p = S.pinnedProjects()[0];
    const key = p ? [p.id, p.name, p.focus, p.progress, p.tags[0]].join("|") : "none:" + S.projects().length;
    if (key === pinnedKey) return; // nothing changed: keep the ring as it is
    pinnedKey = key;
    if (!p) {
      pins.innerHTML = S.projects().length
        ? emptyState("pin", "No pinned project", "Open a project and choose “Pin to home” to keep it here.", `<a class="btn" href="projects.html">Your projects</a>`)
        : emptyState("projects", "No projects yet", "Declare your first project to track its milestones here.", `<a class="btn btn--ink" href="projects.html?new=1">${icon("plus")} Declare a project</a>`);
      return;
    }
    const tag = p.tags && p.tags.length ? p.tags[0] : "Idea";
    pins.innerHTML = `
      <article class="pin spotlight" tabindex="0" role="button" data-project="${esc(p.id)}" aria-label="Open ${esc(p.name)}">
        <div class="pin-left">
          <h4>${esc(p.name)}</h4>
          <div class="chips"><span class="chip">${esc(tag)}</span></div>
          <div class="caption">${esc(p.focus)}</div>
        </div>
        <div class="pin-separator" aria-hidden="true"></div>
        <div class="progress-wrapper" role="img" aria-label="Project progress ${p.progress}%" title="${p.progress}%">
          <div class="progress-circle" data-percent="${p.progress}">
            <div class="progress-inner" aria-hidden="true"></div>
            <div class="progress-label">0%</div>
          </div>
        </div>
      </article>`;
    Mori.motion.refresh(pins);
  }

  /* Recent messages — the three latest conversations (draft layout) */
  function renderMessages() {
    const box = $("#msgs");
    const threads = S.chat.threads().slice(0, 3);
    if (threads.length) {
      box.innerHTML = threads.map((t, i) => {
        const text = (t.last.from === t.id ? "" : "You: ") + t.last.body;
        return `<article class="pin msg spotlight ${t.unread ? "is-unread" : ""}" tabindex="0" role="button" data-chat="${esc(t.id)}" aria-label="Open your conversation with ${esc(t.person.name)}">
          <h4>${esc(t.person.name)}</h4>
          <div class="meta">${esc(ago(t.at))}</div>
          <div class="chips"><span class="chip chip--${CHIP_HUES[i % CHIP_HUES.length]}">${esc(text.length > 70 ? text.slice(0, 69) + "…" : text)}</span></div>
        </article>`;
      }).join("");
      return;
    }
    const waiting = S.network.incoming().length;
    const connected = S.network.connections().length;
    if (!S.network.available()) {
      box.innerHTML = emptyState("message", "Messaging needs a Google sign-in", "Demo accounts stay on this device, so there’s no one to message.");
    } else if (connected) {
      box.innerHTML = emptyState("message", "No messages yet", `You have ${connected} connection${connected === 1 ? "" : "s"}. Say hello and your conversations will show up here.`, `<a class="btn btn--ink" href="network.html#messages">${icon("message")} Open messages</a>`);
    } else if (waiting) {
      box.innerHTML = emptyState("inbox", "No messages yet", `You have ${waiting} connection request${waiting === 1 ? "" : "s"} waiting. Accept one to start a conversation.`, `<a class="btn btn--ink" href="network.html#requests">${icon("inbox")} See requests</a>`);
    } else {
      box.innerHTML = emptyState("message", "No messages yet", "Connect with founders and specialists, then message them here.", `<a class="btn" href="network.html#explore">${icon("compass")} Explore the network</a>`);
    }
  }

  function renderInsights() {
    $("#insights").innerHTML = Mori.data.insights
      .map((n) => `<article class="news spotlight" tabindex="0" role="button" data-insight="${esc(n.id)}">
        <h4>${esc(n.title)}</h4>
        <div class="meta">${esc(n.team)} • ${esc(n.time)}</div>
        <p>${esc(n.blurb)}</p>
      </article>`)
      .join("");
  }

  renderPinned();
  renderMessages();
  renderInsights();
  $("#insights").setAttribute("data-stagger", "90");
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (["network", "links", "messages"].includes(key)) renderMessages();
    if (["projectsRemote", "projectsCreated", "projectOverrides"].includes(key)) renderPinned();
  });

  /* Click + keyboard */
  document.addEventListener("click", (e) => {
    const pin = e.target.closest(".pin[data-project]");
    if (pin) { location.href = "projects.html?open=" + encodeURIComponent(pin.dataset.project); return; }
    const msg = e.target.closest(".msg[data-chat]");
    if (msg) { location.href = "network.html#messages/" + encodeURIComponent(msg.dataset.chat); return; }
    if (e.target.closest(".news[data-insight]")) soon("Insights reader");
  });
})();
