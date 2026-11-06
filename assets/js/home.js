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

  const { $, esc, icon, soon, splitWords } = Mori.ui;
  const S = Mori.state;

  const emptyState = (ic, title, sub, action) =>
    `<div class="empty home-empty"><span class="empty-ico">${icon(ic)}</span><div>${title}</div><div class="meta">${sub}</div>${action || ""}</div>`;

  /* Greeting — "Welcome back, Brayden" (just "Welcome" on the first visit) */
  const s = S.session();
  const hello = $("#hello");
  hello.innerHTML = `${s.isNew ? "Welcome" : "Welcome back"}, <span id="username">${esc(s.givenName || s.name)}</span>`;
  splitWords(hello);
  if (s.isNew) Mori.auth.updateSession({ isNew: false });

  /* Pinned project — one wide tile, single tag, caption + ring (draft spec) */
  function renderPinned() {
    const pins = $("#pins");
    const p = S.pinnedProjects()[0];
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
  }

  /* Recent messages — messaging between connections isn't built yet */
  function renderMessages() {
    const waiting = S.network.incoming().length;
    $("#msgs").innerHTML = emptyState(
      "message",
      "No messages yet",
      waiting
        ? `Messaging between connections is coming soon. You have ${waiting} connection request${waiting === 1 ? "" : "s"} waiting.`
        : "Messaging between connections is coming soon. Meanwhile, find founders and specialists to connect with.",
      waiting ? `<a class="btn btn--ink" href="network.html#requests">${icon("inbox")} See requests</a>` : `<a class="btn" href="network.html#explore">${icon("compass")} Explore the network</a>`
    );
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
  document.addEventListener("mori:change", (e) => { if (e.detail && (e.detail.key === "network" || e.detail.key === "links")) renderMessages(); });

  /* Click + keyboard */
  document.addEventListener("click", (e) => {
    const pin = e.target.closest(".pin[data-project]");
    if (pin) { location.href = "projects.html?open=" + encodeURIComponent(pin.dataset.project); return; }
    if (e.target.closest(".news[data-insight]")) soon("Insights reader");
  });
})();
