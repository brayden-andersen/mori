/* ==========================================================================
   Mori: Sandbox — landing page
   --------------------------------------------------------------------------
   • "Join now" / "Sign in" / any [data-gate] open the auth modal
   • "Continue with Google" signs in through Supabase (or the demo sheet when
     Supabase isn't available) behind a full-screen loading screen
   • New members go to onboarding.html; returning members to their start page
   • Scroll scenes: the hero recedes and "How Sandbox works" pins while its
     three steps play
   • Interactive milestone ladder, section scroll-spy
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
    // Load the sign-in library once the page has settled (or the moment a visitor
    // reaches for a sign-in button), so "Continue with Google" responds instantly
    // without slowing the first paint.
    const warm = () => { db.preload(); document.removeEventListener("pointerover", onIntent); document.removeEventListener("focusin", onIntent); };
    const onIntent = (e) => { if (e.target.closest && e.target.closest("[data-auth], [data-gate]")) warm(); };
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 3500 });
    else setTimeout(warm, 2500);
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

  // The dots travelling along the constellation's lines (SVG animation) only run while it's on screen.
  const constellation = $(".const-lines");
  if (constellation && constellation.pauseAnimations) {
    if (Mori.motion.reduced()) constellation.pauseAnimations();
    else if ("IntersectionObserver" in window) {
      constellation.pauseAnimations();
      new IntersectionObserver(([en]) => (en.isIntersecting ? constellation.unpauseAnimations() : constellation.pauseAnimations()), { rootMargin: "80px 0px" }).observe(constellation);
    }
  }

  /* ---------- Scroll scenes ----------
     One passive scroll listener and at most one update per frame. Positions
     are measured once (and again on resize), so scrolling never forces a
     layout; only transform, opacity and classes change. With reduced motion
     everything shows in its final state and nothing pins. */
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const calm = Mori.motion.reduced();
  const scenes = [];
  let vh = window.innerHeight;
  let queued = false;
  const tick = () => { queued = false; const y = window.scrollY; scenes.forEach((sc) => sc.update(y)); };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  function measure() {
    vh = window.innerHeight;
    const y = window.scrollY;
    scenes.forEach((sc) => { const r = sc.el.getBoundingClientRect(); sc.top = r.top + y; sc.height = r.height; });
    queue();
  }

  // The hero recedes: its words sink and fade (a product preview, if there is one, drifts after them).
  const hero = $(".l-hero");
  const heroCopy = $(".l-hero-copy");
  const heroArt = $(".hero-art");
  if (!calm && hero && heroCopy) scenes.push({
    el: hero, last: -1,
    update(y) {
      const p = Math.round(clamp01(y / (this.height * 0.9)) * 1000) / 1000;
      if (p === this.last) return;
      this.last = p;
      hero.classList.toggle("is-receding", p > 0 && p < 1);
      heroCopy.style.opacity = p ? String(Math.max(0, 1 - p * 1.25)) : "";
      heroCopy.style.transform = p ? `translate3d(0, ${(p * 90).toFixed(1)}px, 0) scale(${(1 - p * 0.06).toFixed(4)})` : "";
      if (heroArt) {
        heroArt.style.opacity = p ? String(Math.max(0, 1 - p * 1.05)) : "";
        heroArt.style.transform = p ? `translate3d(0, ${(p * 40).toFixed(1)}px, 0) scale(${(1 - p * 0.05).toFixed(4)})` : "";
      }
    },
  });

  // "How Sandbox works": the scene pins for three screens of scrolling, one step each.
  const story = $("#story");
  if (story && !calm) {
    const copies = $$(".story-copy", story);
    const screens = $$(".story-screen", story);
    const bars = $$(".story-bar i", story);
    const stage = $(".story-stage", story);
    const n = copies.length;
    let step = 0;
    story.classList.add("is-pinned");
    const scene = {
      el: story, last: "",
      update(y) {
        const span = Math.max(1, this.height - vh);
        const p = clamp01((y - this.top) / span);
        const i = Math.min(n - 1, Math.floor(p * n));
        if (i !== step) {
          step = i;
          copies.forEach((c, k) => c.classList.toggle("is-active", k === i));
          screens.forEach((c, k) => c.classList.toggle("is-active", k === i));
        }
        const arrive = clamp01(1 - (this.top - y) / vh); // the screen rises into place as the scene arrives
        const key = p.toFixed(3) + "|" + arrive.toFixed(3);
        if (key === this.last) return;
        this.last = key;
        bars.forEach((b, k) => b.style.setProperty("--p", clamp01(p * n - k).toFixed(3)));
        stage.style.transform = arrive < 1 ? `translate3d(0, ${((1 - arrive) * 60).toFixed(1)}px, 0) scale(${(0.94 + arrive * 0.06).toFixed(4)})` : "";
      },
    };
    scenes.push(scene);
    // Click a step to scroll to it.
    copies.forEach((c, k) => c.addEventListener("click", () => {
      window.scrollTo({ top: Math.round(scene.top + (k / n) * Math.max(1, scene.height - vh)) + 2, behavior: "smooth" });
    }));
  }

  if (scenes.length) {
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  }

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
