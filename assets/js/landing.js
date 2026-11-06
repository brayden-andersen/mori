/* ==========================================================================
   Mori: Sandbox — landing page
   --------------------------------------------------------------------------
   • "Join now" / "Sign in" / any [data-gate] open the auth modal
   • "Continue with Google" signs in through Supabase (or the demo sheet when
     Supabase isn't available) behind a full-screen loading screen
   • New members go to onboarding.html; returning members to their start page
   • Interactive milestone ladder, live message card, section scroll-spy
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const { $, $$, esc, icon, avatar, toast, googleG, loader } = Mori.ui;
  const D = Mori.data;
  const db = Mori.db;
  const params = new URLSearchParams(location.search);

  const track = $("#marqueeTrack");
  if (track) track.innerHTML += track.innerHTML; // second copy for a seamless loop

  /** Go to onboarding (new) or the start page (returning), behind the loading screen. */
  function enter(session) {
    loader.show(
      session.onboarded ? `Welcome back, ${session.givenName}` : `Welcome, ${session.givenName}`,
      session.onboarded ? "Opening your Sandbox…" : "Let’s set up your profile…"
    );
    location.replace(Mori.auth.landingUrl(session));
  }
  const rememberRole = (role) => {
    try { role ? sessionStorage.setItem("mori.joinRole", role) : sessionStorage.removeItem("mori.joinRole"); } catch (e) { /* ignore */ }
  };

  /* ---------- Signed-in visitors ---------- */
  function renderSignedIn(s) {
    const href = esc(Mori.auth.landingUrl(s));
    const you = Object.assign({}, Mori.state.me(), { id: s.id }); // your chosen photo, or the default icon
    $("#navActions").innerHTML = `<a class="btn btn--pill btn--ink" href="${href}">${avatar(you, 22)}Go to Sandbox</a>`;
    $("#heroAuth").innerHTML = `
      <a class="btn-google btn-google--me magnetic" href="${href}">
        ${avatar(you, 38)}
        <span class="me-copy">Continue as ${esc(s.givenName || s.name)}<small>${esc(s.email || "Demo account")}</small></span>
        ${s.provider === "google" ? googleG() : icon("arrowRight")}
      </a>
      <p class="switch-line">Not you? <button class="link-btn" type="button" data-signout>Sign out</button></p>`;
  }
  if (Mori.auth.isSignedIn()) renderSignedIn(Mori.auth.session());

  /* ---------- Auth modal ---------- */
  const views = $$("#authModal .auth-view");
  let mode = "join";
  let gate = "";

  function showView(name) {
    views.forEach((v) => {
      const on = v.dataset.view === name;
      v.hidden = !on;
      if (on) { v.style.animation = "none"; void v.offsetWidth; v.style.animation = ""; }
    });
  }
  function setMode(m) {
    mode = m;
    $("#authTitle").textContent = m === "join" ? "Join Sandbox" : "Welcome back";
    $("#authSub").textContent = gate
      ? `${m === "join" ? "Join" : "Sign in"} to ${gate}.`
      : m === "join" ? "Find your people, build your idea, earn the spotlight." : "Sign in to pick up where you left off.";
    $("#authSwitch").innerHTML = m === "join"
      ? 'Already on Sandbox? <button class="link-btn" type="button" data-auth-switch>Sign in</button>'
      : 'New to Sandbox? <button class="link-btn" type="button" data-auth-switch>Join now</button>';
  }
  function openAuth(m, opts = {}) {
    gate = opts.gate || "";
    setMode(m);
    showView(opts.view || "choose");
    Mori.modal.open("authModal", { opener: opts.opener });
  }

  async function continueWithGoogle(fromEl) {
    if (!db.enabled) {
      // Demo mode (opened from disk, or Supabase not configured)
      if (Mori.modal.isOpen("authModal")) showView("demo");
      else openAuth(mode, { view: "demo", opener: fromEl });
      setTimeout(() => { const f = $('#demoForm input[name="name"]'); if (f) { f.focus(); f.select(); } }, 90);
      return;
    }
    Mori.modal.close({ restoreFocus: false });
    loader.show("Signing you in", "Connecting to Google…");
    try {
      await db.signInWithGoogle(params.get("next")); // the browser now leaves for Google
    } catch (err) {
      loader.hide();
      toast(err.message || "Google sign-in failed.", { icon: "x", duration: 4000 });
    }
  }

  /** Google sent the member back here (index.html?auth=callback&code=…). */
  async function finishRedirect() {
    const problem = params.get("error_description") || params.get("error");
    if (problem) {
      loader.hide();
      history.replaceState(null, "", location.pathname);
      toast(problem.replace(/\+/g, " "), { icon: "x", duration: 4500 });
      return;
    }
    loader.show("Signing you in", "Checking your Google account…");
    try {
      const user = await db.user();
      if (!user) throw new Error("Google sign-in didn’t finish. Please try again.");
      loader.status("Loading your profile…");
      const remote = await db.fetchProfile();
      const session = Mori.auth.completeSignIn(user, { onboarded: !!(remote && remote.onboarded) });
      if (remote) {
        delete remote.onboarded;
        Mori.state.saveProfile(remote, { remote: false });
        const name = [remote.firstName, remote.lastName].filter(Boolean).join(" ");
        if (name) Object.assign(session, Mori.auth.updateSession({ name, givenName: name.split(/\s+/)[0] }));
      }
      enter(session);
    } catch (err) {
      loader.hide();
      history.replaceState(null, "", location.pathname);
      toast(err.message || "Sign-in failed.", { icon: "x", duration: 4500 });
    }
  }

  $("#demoForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(form.elements.name.value || "").trim();
    if (!name) { form.elements.name.focus(); toast("Add a name to continue", { icon: "edit" }); return; }
    Mori.modal.close({ restoreFocus: false });
    enter(Mori.auth.completeSignIn({ provider: "demo", name, email: String(form.elements.email.value || "").trim() }));
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-auth], [data-gate], [data-auth-switch], [data-view-back], [data-signout]");
    if (!el) return;

    if (el.matches("[data-signout]")) {
      loader.show("Signing out", "See you soon…");
      Promise.race([db.signOut(), new Promise((r) => setTimeout(r, 1500))]).then(() => {
        Mori.auth.clearSession();
        location.replace("index.html?signedout=1");
      });
      return;
    }
    if (el.matches("[data-auth-switch]")) { setMode(mode === "join" ? "signin" : "join"); return; }
    if (el.matches("[data-view-back]")) { showView("choose"); return; }

    e.preventDefault();
    if (el.dataset.role) rememberRole(el.dataset.role);
    if (el.dataset.auth === "google") { continueWithGoogle(el); return; }
    if (Mori.auth.isSignedIn()) { enter(Mori.auth.session()); return; }
    openAuth(el.dataset.auth === "signin" ? "signin" : "join", { gate: el.dataset.gate || "", opener: el });
  });

  /* ---------- URL hints ---------- */
  if (params.get("auth") === "callback" || params.has("code")) {
    if (db.enabled) finishRedirect();
    else loader.hide();
  } else {
    db.preload(); // so "Continue with Google" responds instantly
    if (params.has("signedout")) {
      toast("You’ve signed out. See you soon!", { icon: "logout" });
      history.replaceState(null, "", location.pathname + location.hash);
    }
    if (params.has("next") && !Mori.auth.isSignedIn()) setTimeout(() => openAuth("signin", { gate: "continue to your Sandbox" }), 500);
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
    const tr = ladderTrack.getBoundingClientRect();
    if (!btn || !tr.height) return;
    const br = btn.getBoundingClientRect();
    fill.style.setProperty("--fill", Math.max(6, Math.min(100, ((tr.bottom - (br.top + br.height / 2)) / tr.height) * 100)).toFixed(1) + "%");
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
    { name: "Rahul P.", role: "Specialist", initials: "RP", a1: "#34d399", a2: "#22d3ee", text: "Shared notes on the pitch deck v3 — take a look!" },
    { name: "Anna S.", role: "Specialist", initials: "AS", a1: "#60a5fa", a2: "#818cf8", text: "Free later for a 15-min sync about the specialist pool?" },
    { name: "Sari K.", role: "Specialist", initials: "SK", a1: "#818cf8", a2: "#22d3ee", text: "Your pricing page is close. Try anchoring on the annual plan." },
    { name: "Lina W.", role: "Founder", initials: "LW", a1: "#f472b6", a2: "#fb7185", text: "Can you intro me to the Jakarta founders circle?" },
  ];
  let msgIndex = 0;
  function cycleMessage() {
    const card = $("#heroMsg");
    if (!card || document.hidden || card.closest(".is-offscreen")) return;
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
        spyLinks.forEach((a) => a.classList.toggle("is-active", !!en.target.id && a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main > section").forEach((s) => spy.observe(s));
  }
})();
