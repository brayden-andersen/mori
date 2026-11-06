/* ==========================================================================
   Mori: Sandbox — storage, session and route guard
   --------------------------------------------------------------------------
   Loaded synchronously in <head> (not deferred) so that:
     • signed-out visitors are sent to the landing page before an app page paints
     • motion / background preferences are applied before first paint
   App pages opt in with <html data-auth="required">.
   ========================================================================== */
(function () {
  "use strict";

  const Mori = (window.Mori = window.Mori || {});
  const cfg = window.MORI_CONFIG || {};
  const root = document.documentElement;
  root.classList.add("js");

  /* ---------- Storage: localStorage, with an in-memory fallback ---------- */
  const memory = {};
  const persistent = (() => {
    try {
      localStorage.setItem("__mori_probe", "1");
      localStorage.removeItem("__mori_probe");
      return true;
    } catch (e) {
      return false;
    }
  })();

  const rawGet = (key) => {
    if (persistent) {
      try { return localStorage.getItem(key); } catch (e) { /* fall through */ }
    }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  };
  const rawSet = (key, value) => {
    if (persistent) {
      try { localStorage.setItem(key, value); return; } catch (e) { /* fall through */ }
    }
    memory[key] = value;
  };
  const rawDel = (key) => {
    if (persistent) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
    delete memory[key];
  };

  Mori.store = {
    persistent,
    read(key, fallback) {
      const raw = rawGet(key);
      if (raw == null) return fallback;
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    },
    write(key, value) { rawSet(key, JSON.stringify(value)); },
    remove(key) { rawDel(key); },
    /** Key scoped to the signed-in member, e.g. "mori.g_123.settings" */
    userKey(name) {
      const s = Mori.auth.session();
      return `mori.${s ? s.id : "guest"}.${name}`;
    },
    /** Remove everything stored for the signed-in member (keeps the session). */
    clearUser() {
      const prefix = Mori.store.userKey("");
      Object.keys(memory).forEach((k) => { if (k.startsWith(prefix)) delete memory[k]; });
      if (!persistent) return;
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) localStorage.removeItem(k);
        }
      } catch (e) { /* ignore */ }
    },
  };

  /* ---------- Session ---------- */
  const SESSION_KEY = "mori.session.v1";
  const ACCOUNTS_KEY = "mori.accounts.v1";
  const APP_PAGES = ["home.html", "projects.html", "network.html"];
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";
  const pageName = () => location.pathname.split("/").pop() || "index.html";

  Mori.auth = {
    APP_PAGES,

    session() { return Mori.store.read(SESSION_KEY, null); },
    isSignedIn() { return !!Mori.auth.session(); },
    googleEnabled() { return !!String(cfg.googleClientId || "").trim(); },

    /** Merge changes into the current session (e.g. a new display name). */
    updateSession(patch) {
      const s = Mori.auth.session();
      if (!s) return null;
      const next = Object.assign({}, s, patch);
      Mori.store.write(SESSION_KEY, next);
      return next;
    },

    /** Redirect signed-out visitors of an app page to the landing page. */
    guard() {
      if (Mori.auth.isSignedIn()) return true;
      if (!persistent) {
        // Storage is blocked (private window, sandboxed preview…): a session
        // can't survive a page change, so keep the concept usable with a guest.
        Mori.auth.completeSignIn({ provider: "demo", name: "Guest" });
        return true;
      }
      const here = pageName();
      const next = APP_PAGES.includes(here) ? here + location.search + location.hash : "home.html";
      Mori.redirecting = true;
      root.style.visibility = "hidden";
      location.replace("index.html?next=" + encodeURIComponent(next));
      return false;
    },

    /** Where to go after sign-in: a same-site ?next= app page, else the fallback. */
    nextUrl(fallback) {
      const next = new URLSearchParams(location.search).get("next");
      if (next && APP_PAGES.includes(next.split(/[?#]/)[0])) return next;
      return APP_PAGES.includes(fallback) ? fallback : "home.html";
    },

    /**
     * Create the session from a Google userinfo profile ({sub, name, given_name,
     * email, picture}) or from the demo form ({name, email}).
     */
    completeSignIn(profile, opts = {}) {
      const provider = profile.provider === "google" ? "google" : "demo";
      const id = provider === "google" ? "g_" + profile.sub : "demo_" + slug(profile.email || profile.name);
      const accounts = Mori.store.read(ACCOUNTS_KEY, {});
      const isNew = !accounts[id];
      if (isNew) accounts[id] = { joinedAt: Date.now(), role: opts.role || null };
      Mori.store.write(ACCOUNTS_KEY, accounts);

      const name = String(profile.name || "").trim() || "Member";
      const session = {
        id,
        provider,
        name,
        givenName: profile.given_name || name.split(/\s+/)[0],
        email: profile.email || "",
        picture: profile.picture || "",
        role: accounts[id].role || opts.role || null,
        isNew,
        signedInAt: Date.now(),
      };
      Mori.store.write(SESSION_KEY, session);
      return session;
    },

    /** Start page chosen in Settings → Preferences (read before app scripts load). */
    startPage(session) {
      const s = session || Mori.auth.session();
      const st = s ? Mori.store.read(`mori.${s.id}.settings`, {}) : {};
      return APP_PAGES.includes(st && st.startPage) ? st.startPage : "home.html";
    },

    /** Clear the session. Pass { redirect: false } to handle navigation yourself. */
    signOut({ redirect = true } = {}) {
      Mori.store.remove(SESSION_KEY);
      if (redirect) location.href = "index.html?signedout=1";
    },

    /* ---------- Google Identity Services (OAuth 2.0 token flow) ----------
       A custom "Continue with Google" button calls signIn(), which opens
       Google's account chooser in a pop-up and resolves with the member's
       basic profile from the userinfo endpoint.

       Note: this is client-side only — fine for a concept. Before launch, send
       the credential to a backend (or use Supabase/Firebase Auth) to verify it. */
    google: {
      _client: null,
      _pending: null,
      _loading: null,

      load() {
        if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
        if (this._loading) return this._loading;
        this._loading = new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://accounts.google.com/gsi/client";
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => {
            this._loading = null;
            reject(new Error("Couldn't reach Google. Check your connection and try again."));
          };
          document.head.appendChild(s);
        });
        return this._loading;
      },

      /** Preload so the pop-up can open straight from the click (avoids blockers). */
      prepare() { return this.load().then(() => this._init()); },

      _init() {
        if (this._client) return;
        this._client = google.accounts.oauth2.initTokenClient({
          client_id: String(cfg.googleClientId).trim(),
          scope: "openid email profile",
          prompt: "select_account",
          callback: (resp) => this._settle(resp),
          error_callback: (err) => this._fail(err),
        });
      },

      signIn() {
        return new Promise((resolve, reject) => {
          this._pending = { resolve, reject };
          const open = () => { this._init(); this._client.requestAccessToken(); };
          if (this._client) open();
          else this.prepare().then(open, reject);
        })
          .then((token) =>
            fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: "Bearer " + token.access_token },
            })
          )
          .then((r) => {
            if (!r.ok) throw new Error(`Google didn't return your profile (${r.status}).`);
            return r.json();
          })
          .then((info) => Object.assign(info, { provider: "google" }));
      },

      _settle(resp) {
        const p = this._pending;
        this._pending = null;
        if (!p) return;
        if (resp && resp.access_token) p.resolve(resp);
        else p.reject(new Error((resp && (resp.error_description || resp.error)) || "Google sign-in failed."));
      },

      _fail(err) {
        const p = this._pending;
        this._pending = null;
        if (!p) return;
        const type = err && err.type;
        const msg =
          type === "popup_closed" ? "Google sign-in was closed before it finished."
          : type === "popup_failed_to_open" ? "Your browser blocked the Google pop-up. Allow pop-ups for this site and try again."
          : (err && err.message) || "Google sign-in failed.";
        const e = new Error(msg);
        e.type = type;
        p.reject(e);
      },
    },
  };

  /* ---------- Apply saved preferences before first paint ---------- */
  (function applyPrefs() {
    const s = Mori.auth.session();
    if (!s) return;
    const st = Mori.store.read(`mori.${s.id}.settings`, {}) || {};
    if (st.motion === "reduced" || st.motion === "full") root.setAttribute("data-motion", st.motion);
    if (st.aura === false) root.setAttribute("data-aura", "still");
  })();

  if (root.getAttribute("data-auth") === "required") Mori.auth.guard();
})();
