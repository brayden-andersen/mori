/* ==========================================================================
   Mori: Sandbox — people (shared by every signed-in page)
   --------------------------------------------------------------------------
   The member profile window, the Connections window, and the connection
   actions behind them. Markup hooks (delegated):
     data-view="<id>"        open a member's profile
     data-connect / data-accept / data-ignore / data-withdraw / data-remove="<id>"
     data-message="<id>"     open the conversation with a connection
     data-member-cv="<id>"   open a connection's CV
     data-connections        open the Connections window
   Rows inside .req (the Requests tab) are animated by network.js instead.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, avatar, ago, toast, roleChip, createModal, loader } = Mori.ui;
  const S = Mori.state;
  const D = Mori.data;
  const N = S.network;
  const HUES = ["orange", "blue", "purple"];
  const LINK_TYPES = Object.fromEntries(D.linkTypes.map((t) => [t.id, t]));

  const first = (name) => String(name || "").split(/\s+/)[0];
  const dash = (s) => String(s || "").replace(/(\d)-(\d)/, "$1–$2");
  const roleLabel = (role) => (D.roles[role] ? D.roles[role].label : "Member");
  const openLabel = (m) => (m.open ? D.openTypes[m.openType] || "Open to build" : "");
  const joined = (ts) => (ts ? new Date(ts).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "");
  const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return "Link"; } };

  /** LinkedIn and extra links as buttons. */
  function linkButtons(p) {
    const out = [];
    if (p.linkedin) out.push(`<a class="btn btn--sm" href="${esc(p.linkedin)}" target="_blank" rel="noopener">${icon("link")} LinkedIn</a>`);
    (p.links || []).forEach((l) => {
      const t = LINK_TYPES[l.type] || LINK_TYPES.other;
      out.push(`<a class="btn btn--sm" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.url)}">${icon(t.icon)} ${esc(t.id === "other" ? host(l.url) : t.label)}</a>`);
    });
    return out.join("");
  }

  /** Region and age, for the small print under the headline (only what the member shows). */
  const whereLine = (p) => [p.region, p.age ? `${p.age} years old` : ""].filter(Boolean);
  /** Bubbles under the actions: sprint rating, employment (if shown), and when they joined. */
  function factPills(p) {
    const rating = p.rating != null
      ? `${Number(p.rating).toFixed(1)} sprint rating · ${p.reviews} review${p.reviews === 1 ? "" : "s"}`
      : "No sprint rating yet";
    return `<div class="fact-pills">
      <span class="fact-pill">${icon("star")}${esc(rating)}</span>
      ${p.employment ? `<span class="fact-pill">${icon("briefcase")}${esc(p.employment)}</span>` : ""}
      ${p.joinedAt ? `<span class="fact-pill">${icon("clock")}Joined ${esc(joined(p.joinedAt))}</span>` : ""}
    </div>`;
  }

  /* ---------- Feedback helpers (also used by network.js) ---------- */
  function signInAgain(message) {
    loader.show("Please sign in again", message || "Your sign-in has expired.");
    Mori.auth.clearSession();
    const here = location.pathname.split("/").pop() || "home.html";
    setTimeout(() => location.replace("index.html?next=" + encodeURIComponent(here + location.hash)), 1500);
  }
  function fail(err) {
    if (err && err.code === "signed-out") { signInAgain(err.message); return; }
    toast((err && err.message) || "Something went wrong. Please try again.", { icon: "x", duration: 3800 });
  }
  /** Disable the button while the change is saved; views re-render when it lands. */
  function busy(btn, work, done) {
    if (!btn || btn.getAttribute("aria-busy") === "true") return;
    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
    Promise.resolve().then(work).then(
      (res) => { if (document.contains(btn)) { btn.disabled = false; btn.removeAttribute("aria-busy"); } if (done) done(res); },
      (err) => { if (document.contains(btn)) { btn.disabled = false; btn.removeAttribute("aria-busy"); } fail(err); }
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

  /** Open the conversation with a connection (on the Network page, or by going there). */
  function message(id) {
    if (Mori.modal.isOpen()) Mori.modal.close({ restoreFocus: false });
    if (document.body.dataset.page === "network") location.hash = "messages/" + encodeURIComponent(id);
    else location.href = "network.html#messages/" + encodeURIComponent(id);
  }

  /* ---------- Member profile ---------- */
  let shownMember = null; // { id, key } of the profile in the window

  function memberHTML(m) {
    const st = N.status(m.id);
    const link = N.link(m.id);
    const id = esc(m.id);
    const list = (items, cls) => items.map((x, i) => `<span class="badge badge--${cls ? cls(i) : "gray"}">${esc(x)}</span>`).join("");
    const open = openLabel(m);

    let action;
    if (st === "connected") {
      action = `
        <div class="mp-status">
          <span class="chip chip--emerald">${icon("check")} Connected</span>
          <button class="btn btn--sm btn--ghost mp-remove" type="button" data-remove="${id}">Remove connection</button>
        </div>
        <button class="btn btn--ink mp-message" type="button" data-message="${id}">${icon("message")} Message</button>`;
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

    const docs = linkButtons(m) + (m.cvPath ? `<button class="btn btn--sm" type="button" data-member-cv="${id}">${icon("file")} ${esc(m.cvName || "CV")}</button>` : "");
    const docsNote = st === "connected"
      ? (docs ? "" : `<span class="meta">${esc(first(m.name))} hasn’t added a CV or links yet.</span>`)
      : `<span class="meta">CVs are shared with connections.</span>`;

    const details = m.limited
      ? `${factPills(m)}<section class="pf-sec"><p class="meta">${esc(first(m.name))} shares their full profile with connections only. Connect to see their industries, languages and links.</p></section>`
      : `
        ${factPills(m)}
        ${m.bio ? `<section class="pf-sec"><h3>About</h3><p>${esc(m.bio)}</p></section>` : ""}
        ${m.industries.length ? `<section class="pf-sec"><h3>Industry</h3><div class="tags">${list(m.industries, (i) => HUES[i % HUES.length])}</div></section>` : ""}
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
        ${whereLine(m).length ? `<p class="meta pf-meta">${icon("pin")} ${whereLine(m).map(esc).join(" · ")}</p>` : ""}
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
  /** Open a member's profile. Resolves false if they can't be found. */
  async function openMember(id, opts = {}) {
    let m = N.member(id);
    if (!m && N.available()) {
      // Not in the local copy: they may have joined since.
      await N.refresh({ force: true }).catch(() => {});
      m = N.member(id);
    }
    if (!m) { toast("That member couldn’t be found", { icon: "x" }); return false; }
    const wasOpen = Mori.modal.isOpen("memberModal");
    renderMember(m);
    $("#memberModal .modal").scrollTop = 0;
    if (!wasOpen) {
      Mori.modal.open("memberModal", {
        opener: opts.opener,
        onClose: () => {
          shownMember = null;
          if (opts.onClose) opts.onClose();
        },
      });
    }
    return true;
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

  /* ---------- Connections window ---------- */
  let cnQuery = "";
  function connectionsHTML() {
    const all = N.connections();
    const term = cnQuery.trim().toLowerCase();
    const list = all.filter((p) => !term || [p.name, p.headline, p.region, roleLabel(p.role)].join(" ").toLowerCase().includes(term));
    const row = (p) => `
      <div class="cn-row" role="listitem">
        <button class="cn-who" type="button" data-view="${esc(p.id)}" aria-label="View ${esc(p.name)}’s profile">
          ${avatar(p, 44, { ring: p.open })}
          <span class="cn-copy"><b>${esc(p.name)}</b><span class="meta">${esc(p.headline || [roleLabel(p.role), p.region].filter(Boolean).join(" · "))}</span></span>
        </button>
        ${roleChip(p.role)}
        <div class="cn-actions">
          <button class="btn btn--sm btn--ink" type="button" data-message="${esc(p.id)}">${icon("message")} Message</button>
          <button class="btn btn--sm" type="button" data-view="${esc(p.id)}">Profile</button>
        </div>
      </div>`;
    let body;
    if (!N.available()) body = Mori.ui.empty("network", "Sign in with Google to connect", "Demo accounts stay on this device, so there’s no one to connect with.");
    else if (!all.length) body = `${Mori.ui.empty("userPlus", "No connections yet", "When someone accepts your request, or you accept theirs, they’ll appear here.")}<p class="cn-cta"><a class="btn" href="network.html#explore">${icon("compass")} Explore members</a></p>`;
    else if (!list.length) body = `<p class="meta cn-none">No connections match “${esc(cnQuery.trim())}”.</p>`;
    else body = `<div class="cn-list" role="list">${list.map(row).join("")}</div>`;
    return `
      <div class="modal-head">
        <div><h2 id="cnTitle">Connections</h2><p class="meta">${all.length ? `${all.length} connection${all.length === 1 ? "" : "s"}` : "Your network on Sandbox"}</p></div>
        <button class="icon-btn modal-x" data-close aria-label="Close connections">${icon("x")}</button>
      </div>
      <div class="modal-body">
        ${all.length > 3 ? `<label class="search cn-search" aria-label="Search your connections">${icon("search")}<input type="search" id="cnQ" placeholder="Search your connections" autocomplete="off" value="${esc(cnQuery)}"></label>` : ""}
        <div id="cnBody">${body}</div>
      </div>`;
  }
  let shownConnections = null; // markup in the window, so refreshes that change nothing leave it alone
  function renderConnections(force) {
    const root = createModal("connectionsModal", { label: "Connections", panelCls: "modal--connections" });
    const panel = $(".modal", root);
    panel.setAttribute("aria-labelledby", "cnTitle");
    const html = connectionsHTML();
    if (!force && html === shownConnections) return root;
    shownConnections = html;
    const hadFocus = document.activeElement && document.activeElement.id === "cnQ";
    panel.innerHTML = html;
    const q = $("#cnQ", panel);
    if (q) {
      q.addEventListener("input", () => {
        cnQuery = q.value;
        shownConnections = connectionsHTML();
        const tmp = document.createElement("div");
        tmp.innerHTML = shownConnections;
        $("#cnBody", panel).innerHTML = $("#cnBody", tmp).innerHTML;
      });
      if (hadFocus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
    Mori.motion.enter($(".cn-list", panel) || panel, ".cn-row");
    return root;
  }
  function openConnections(opener) {
    cnQuery = "";
    if (Mori.shell) Mori.shell.closeMenus();
    renderConnections(true);
    Mori.modal.open("connectionsModal", { opener });
    N.refresh().catch(() => {});
  }

  /* ---------- Actions (delegated) ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-view],[data-connect],[data-withdraw],[data-accept],[data-ignore],[data-remove],[data-member-cv],[data-message],[data-connections]");
    if (!t) return;
    const d = t.dataset;
    if ("connections" in d) { e.preventDefault(); openConnections(t); return; }
    if (d.view) { e.preventDefault(); openMember(d.view, { opener: t }); return; }
    if (d.message) { e.preventDefault(); message(d.message); return; }
    if (d.memberCv) { openCv(d.memberCv); return; }
    if (t.closest(".req")) return; // the Requests tab animates its own rows

    const id = d.connect || d.withdraw || d.accept || d.ignore || d.remove;
    const p = N.member(id);
    const name = p ? p.name : "this member";
    if (d.connect) busy(t, () => N.connect(id), () => toast(N.status(id) === "connected" ? `You’re now connected with ${name}` : `Request sent to ${name}`, { icon: "userPlus" }));
    else if (d.accept) busy(t, () => N.accept(id), () => toast(`You’re now connected with ${name}`, { icon: "check" }));
    else if (d.ignore) busy(t, () => N.ignore(id), () => toast("Request ignored", { icon: "x" }));
    else if (d.withdraw) busy(t, () => N.withdraw(id), () => toast("Request withdrawn", { icon: "x" }));
    else if (d.remove && confirmTap(t, "Tap again to remove")) busy(t, () => N.remove(id), () => toast(`${name} is no longer a connection`, { icon: "x" }));
  });

  // New data from Supabase, or a change you just made.
  document.addEventListener("mori:change", (e) => {
    const key = e.detail && e.detail.key;
    if (key !== "network" && key !== "links") return;
    refreshMember();
    if (Mori.modal.isOpen("connectionsModal")) renderConnections();
  });

  Mori.people = { openMember, openConnections, message, linkButtons, factPills, whereLine, busy, fail, confirmTap, signInAgain };
})();
