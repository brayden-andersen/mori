/* ==========================================================================
   Mori: Sandbox — landing page
   --------------------------------------------------------------------------
   • "Join now" / "Sign in" / any [data-gate] open the auth modal
   • "Continue with Google" runs Google sign-in (or the demo sheet when no
     Client ID is configured) and then moves to the member's start page
   • Signed-in visitors see "Continue as …" instead of the sign-in buttons
   • Interactive milestone ladder, live message card, section scroll-spy
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const { $, $$, esc, icon, avatar, toast, googleG } = Mori.ui;
  const D = Mori.data;

  /* ---------- Icons + marquee ---------- */
  $$("i[data-icon]").forEach((el) => { el.outerHTML = icon(el.dataset.icon); });
  const track = $("#marqueeTrack");
  if (track) track.innerHTML += track.innerHTML; // second copy for a seamless loop

  const destination = (s) => Mori.auth.nextUrl(Mori.auth.startPage(s));

  /* ---------- Signed-in visitors ---------- */
  function renderSignedIn(s) {
    $("#navActions").innerHTML = `<a class="btn btn--pill btn--ink" href="${esc(destination(s))}">${avatar(s, 22)}Go to Sandbox</a>`;
    $("#heroAuth").innerHTML = `
      <a class="btn-google btn-google--me magnetic" href="${esc(destination(s))}">
        ${avatar(s, 38)}
        <span class="me-copy">Continue as ${esc(s.givenName || s.name)}<small>${esc(s.email || "Demo account")}</small></span>
        ${s.provider === "google" ? googleG() : icon("arrowRight")}
      </a>
      <p class="switch-line">Not you? <button class="link-btn" type="button" data-signout>Sign out</button></p>`;
  }
  if (Mori.auth.isSignedIn()) renderSignedIn(Mori.auth.session());

  /* ---------- Auth modal ---------- */
  const modal = $("#authModal");
  const views = $$(".auth-view", modal);
  let mode = "join";
  let role = null;
  let gate = "";

  function showView(name) {
    views.forEach((v) => {
      const on = v.dataset.view === name;
      v.hidden = !on;
      if (on) { v.style.animation = "none"; void v.offsetWidth; v.style.animation = ""; }
    });
  }
  function paintRoles() {
    $$("[data-pick-role]", modal).forEach((b) => { b.dataset.active = String(b.dataset.pickRole === role); });
  }
  function setMode(m) {
    mode = m;
    $("#authTitle").textContent = m === "join" ? "Join Sandbox" : "Welcome back";
    $("#authSub").textContent = gate
      ? `${m === "join" ? "Join" : "Sign in"} to ${gate}.`
      : m === "join" ? "Find your people, build your idea, earn the spotlight." : "Sign in to pick up where you left off.";
    $("#authRoles").hidden = m !== "join";
    $("#authSwitch").innerHTML = m === "join"
      ? 'Already on Sandbox? <button class="link-btn" type="button" data-auth-switch>Sign in</button>'
      : 'New to Sandbox? <button class="link-btn" type="button" data-auth-switch>Join now</button>';
    paintRoles();
  }
  function openAuth(m, opts = {}) {
    gate = opts.gate || "";
    setMode(m);
    showView(opts.view || "choose");
    Mori.modal.open("authModal", { opener: opts.opener });
  }

  function finish(session) {
    $("#successTitle").textContent = session.isNew ? `Welcome to Sandbox, ${session.givenName}` : `Welcome back, ${session.givenName}`;
    if (Mori.modal.isOpen("authModal")) showView("success");
    else openAuth(mode, { view: "success" });
    setTimeout(() => Mori.shell.leave(destination(session)), Mori.motion.reduced() ? 250 : 1300);
  }

  async function continueWithGoogle(fromEl) {
    const inModal = Mori.modal.isOpen("authModal");
    const servedOverHttp = location.protocol === "http:" || location.protocol === "https:";
    if (!Mori.auth.googleEnabled() || !servedOverHttp) {
      if (Mori.auth.googleEnabled()) toast("Google sign-in needs the site served over http(s). Using demo mode.", { duration: 3600 });
      if (inModal) showView("demo");
      else openAuth(mode, { view: "demo", opener: fromEl });
      setTimeout(() => { const f = $('#demoForm input[name="name"]'); if (f) { f.focus(); f.select(); } }, 90);
      return;
    }
    // Open the loading view and start Google in the same click so the pop-up isn't blocked.
    if (inModal) showView("loading");
    else openAuth(mode, { view: "loading", opener: fromEl });
    try {
      const info = await Mori.auth.google.signIn();
      finish(Mori.auth.completeSignIn(info, { role }));
    } catch (err) {
      showView("choose");
      toast(err.message || "Google sign-in failed.", { icon: "x", duration: 4000 });
    }
  }

  $("#demoForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(form.elements.name.value || "").trim();
    if (!name) { form.elements.name.focus(); toast("Add a name to continue", { icon: "edit" }); return; }
    finish(Mori.auth.completeSignIn({ provider: "demo", name, email: String(form.elements.email.value || "").trim() }, { role }));
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-auth], [data-gate], [data-auth-switch], [data-view-back], [data-pick-role], [data-signout]");
    if (!el) return;

    if (el.matches("[data-signout]")) { Mori.auth.signOut({ redirect: false }); Mori.shell.leave("index.html?signedout=1"); return; }
    if (el.matches("[data-pick-role]")) { role = role === el.dataset.pickRole ? null : el.dataset.pickRole; paintRoles(); return; }
    if (el.matches("[data-auth-switch]")) { setMode(mode === "join" ? "signin" : "join"); return; }
    if (el.matches("[data-view-back]")) { showView("choose"); return; }

    e.preventDefault();
    if (el.dataset.auth === "google") { continueWithGoogle(el); return; }
    if (Mori.auth.isSignedIn()) { Mori.shell.leave(destination()); return; }
    role = el.dataset.role || null;
    openAuth(el.dataset.auth === "signin" ? "signin" : "join", { gate: el.dataset.gate || "", opener: el });
  });

  /* ---------- URL hints ---------- */
  const params = new URLSearchParams(location.search);
  if (params.has("signedout")) {
    toast("You’ve signed out. See you soon!", { icon: "logout" });
    history.replaceState(null, "", location.pathname + location.hash);
  }
  if (params.has("next") && !Mori.auth.isSignedIn()) {
    setTimeout(() => openAuth("signin", { gate: "continue to your Sandbox" }), 500);
  }
  if (Mori.auth.googleEnabled() && /^https?:$/.test(location.protocol)) {
    Mori.auth.google.prepare().catch(() => { /* surfaced on click */ });
  }

  /* ---------- Milestone ladder ---------- */
  const select = $("#rungSelect");
  const detail = $("#rungDetail");
  const list = $("#rungList");
  const ladderTrack = $(".ladder-track");
  const fill = $(".ladder-fill");
  let current = 0;
  let timer = null;
  let touched = false;

  function placeFill() {
    const btn = $(`.rung[data-rung="${current}"]`, list);
    if (!btn || !ladderTrack) return;
    const tr = ladderTrack.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    if (!tr.height) return;
    const fromBottom = tr.bottom - (br.top + br.height / 2);
    fill.style.setProperty("--fill", Math.max(6, Math.min(100, (fromBottom / tr.height) * 100)).toFixed(1) + "%");
  }
  function setRung(n, byUser) {
    current = n;
    select.value = String(n);
    const r = D.ladder[n];
    detail.innerHTML = `<h3>Rung ${n} · ${esc(r.stage)}</h3>
      <dl><dt>Proof</dt><dd>${esc(r.proof)}</dd><dt>Typical time</dt><dd>${esc(r.time)}</dd><dt>Toolkit</dt><dd>${esc(r.toolkit)}</dd><dt>Opens</dt><dd>${esc(r.opens)}</dd></dl>`;
    detail.classList.remove("is-swapping");
    void detail.offsetWidth;
    detail.classList.add("is-swapping");
    $$(".rung", list).forEach((b) => {
      const k = Number(b.dataset.rung);
      b.classList.toggle("is-active", k === n);
      b.classList.toggle("is-reached", k < n);
      b.setAttribute("aria-pressed", String(k === n));
    });
    placeFill();
    if (byUser) { touched = true; stop(); }
  }
  const start = () => { if (!timer && !touched && !Mori.motion.reduced()) timer = setInterval(() => setRung((current + 1) % 6), 2800); };
  const stop = () => { clearInterval(timer); timer = null; };

  select.addEventListener("change", () => setRung(Number(select.value), true));
  list.addEventListener("click", (e) => { const b = e.target.closest(".rung"); if (b) setRung(Number(b.dataset.rung), true); });
  window.addEventListener("resize", placeFill);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()), { threshold: 0.35 }).observe($("#ladder-viz"));
  }
  setRung(0);

  /* ---------- Hero: live message card ---------- */
  const MSGS = [
    { name: "Rahul P.", role: "Builder", initials: "RP", a1: "#34d399", a2: "#22d3ee", text: "Shared notes on the pitch deck v3 — take a look!" },
    { name: "Anna S.", role: "Builder", initials: "AS", a1: "#60a5fa", a2: "#818cf8", text: "Free later for a 15-min sync about the mentor pool?" },
    { name: "Sari K.", role: "Mentor", initials: "SK", a1: "#818cf8", a2: "#22d3ee", text: "Your pricing page is close. Try anchoring on the annual plan." },
    { name: "Lina W.", role: "Founder", initials: "LW", a1: "#f472b6", a2: "#fb7185", text: "Can you intro me to the Jakarta Angels room?" },
  ];
  let msgIndex = 0;
  function cycleMessage() {
    const card = $("#heroMsg");
    if (!card || document.hidden) return;
    const bubble = $(".bubble", card);
    const typing = $(".typing", card);
    bubble.classList.add("is-out");
    setTimeout(() => {
      bubble.hidden = true;
      typing.hidden = false;
      msgIndex = (msgIndex + 1) % MSGS.length;
      const m = MSGS[msgIndex];
      $(".msg-name", card).textContent = m.name;
      $(".fc-person .meta", card).textContent = `${m.role} · just now`;
      const av = $(".msg-av", card);
      av.textContent = m.initials;
      av.style.setProperty("--a1", m.a1);
      av.style.setProperty("--a2", m.a2);
      setTimeout(() => {
        typing.hidden = true;
        $(".msg-text", card).textContent = m.text;
        bubble.hidden = false;
        void bubble.offsetWidth;
        bubble.classList.remove("is-out");
      }, 1400);
    }, 320);
  }
  if (!Mori.motion.reduced()) setInterval(cycleMessage, 5200);

  const constellation = $(".const-lines");
  if (constellation && Mori.motion.reduced() && constellation.pauseAnimations) constellation.pauseAnimations();

  /* ---------- Scroll-spy for the section links ---------- */
  const spyLinks = $$(".l-links a");
  if ("IntersectionObserver" in window && spyLinks.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        spyLinks.forEach((a) => a.classList.toggle("is-active", !!id && a.getAttribute("href") === "#" + id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main > section").forEach((s) => spy.observe(s));
  }
})();
