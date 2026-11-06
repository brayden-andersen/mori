/* ==========================================================================
   Mori: Sandbox — homepage
   Greeting, one pinned project with its progress ring, recent messages and
   insights. Clicking through goes to the Projects and Network pages.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, esc, icon, ago, soon, splitWords } = Mori.ui;
  const S = Mori.state;
  const CHIP_HUES = ["orange", "blue", "emerald", "teal", "purple", "gray"];

  /* Greeting — "Welcome back, Brayden" (just "Welcome" on the first visit) */
  const s = S.session();
  const hello = $("#hello");
  hello.innerHTML = `${s.isNew ? "Welcome" : "Welcome back"}, <span id="username">${esc(s.givenName || s.name)}</span>`;
  splitWords(hello);
  if (s.isNew) Mori.auth.updateSession({ isNew: false });

  document.querySelectorAll(".card-go, .panel-link .go").forEach((el) => { el.innerHTML = icon("arrowRight"); });

  /* Pinned project — one wide tile, single tag, caption + ring (draft spec) */
  function renderPinned() {
    const pins = $("#pins");
    const p = S.pinnedProjects()[0];
    if (!p) {
      pins.innerHTML = `<div class="empty"><div>No pinned projects yet.</div><a class="btn" href="projects.html">Browse projects</a></div>`;
      return;
    }
    const tag = p.tags && p.tags.length ? p.tags[0] : "Marketplace";
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

  /* Recent messages — newest three threads */
  function renderMessages() {
    const list = S.threads.list().slice(0, 3);
    $("#msgs").innerHTML = list
      .map((t, i) => {
        const hue = CHIP_HUES[(i + 2) % CHIP_HUES.length];
        const text = t.last ? (t.last.from === "me" ? "You: " : "") + t.last.text : "";
        return `<article class="pin msg spotlight ${t.unread ? "is-unread" : ""}" tabindex="0" role="button" data-chat="${esc(t.id)}" aria-label="Open chat with ${esc(t.person.name)}">
          <h4>${esc(t.person.name)}</h4>
          <div class="meta">${esc(ago(t.at))}</div>
          <div class="chips"><span class="chip chip--${hue}">${esc(text)}</span></div>
        </article>`;
      })
      .join("");
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
  $("#msgs").setAttribute("data-stagger", "90");
  $("#insights").setAttribute("data-stagger", "90");

  /* Click + keyboard */
  document.addEventListener("click", (e) => {
    const pin = e.target.closest(".pin[data-project]");
    if (pin) { location.href = "projects.html?open=" + encodeURIComponent(pin.dataset.project); return; }
    const msg = e.target.closest(".msg[data-chat]");
    if (msg) { location.href = "network.html#messages/" + encodeURIComponent(msg.dataset.chat); return; }
    if (e.target.closest(".news[data-insight]")) soon("Insights reader");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target.closest('[role="button"][tabindex]');
    if (el && e.target === el) { e.preventDefault(); el.click(); }
  });
})();
