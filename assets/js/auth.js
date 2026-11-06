/* ==========================================================================
   Mori: Sandbox — storage, session and route guard
   --------------------------------------------------------------------------
   Loaded synchronously in <head> (not deferred) so that:
     • signed-out visitors leave app pages before they paint
     • members who haven't answered the sign-up questions go to onboarding
     • the sign-in loading screen shows instantly when Google redirects back
     • motion / background preferences apply before first paint
   Pages opt in with <html data-auth="required"> or <html data-auth="onboarding">.
   ========================================================================== */
(function () {
  "use strict";

  const Mori = (window.Mori = window.Mori || {});
  const root = document.documentElement;
  root.classList.add("js");

  /* ---------- Storage: localStorage + parsed-value cache + memory fallback ---------- */
  const memory = {};
  const cache = new Map();
  const persistent = (() => {
    try {
      localStorage.setItem("__mori_probe", "1");
      localStorage.removeItem("__mori_probe");
      return true;
    } catch (e) {
      return false;
    }
  })();
  const ls = (fn) => { if (!persistent) return null; try { return fn(); } catch (e) { return null; } };

  Mori.store = {
    persistent,
    read(key, fallback) {
      if (cache.has(key)) return cache.get(key);
      const raw = persistent ? ls(() => localStorage.getItem(key)) : memory[key];
      if (raw == null) return fallback;
      try {
        const value = JSON.parse(raw);
        cache.set(key, value);
        return value;
      } catch (e) {
        return fallback;
      }
    },
    write(key, value) {
      const raw = JSON.stringify(value);
      cache.set(key, JSON.parse(raw));
      if (persistent) ls(() => localStorage.setItem(key, raw));
      else memory[key] = raw;
    },
    remove(key) {
      cache.delete(key);
      if (persistent) ls(() => localStorage.removeItem(key));
      delete memory[key];
    },
    /** Key scoped to the signed-in member, e.g. "mori.<id>.settings" */
    userKey(name) {
      const s = Mori.auth.session();
      return `mori.${s ? s.id : "guest"}.${name}`;
    },
    /** Remove everything stored for the signed-in member (keeps the session). */
    clearUser() {
      const prefix = Mori.store.userKey("");
      [...cache.keys(), ...Object.keys(memory)].forEach((k) => { if (k.startsWith(prefix)) Mori.store.remove(k); });
      ls(() => {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) localStorage.removeItem(k);
        }
      });
    },
  };
  // Another tab changed storage: drop the stale parsed copy.
  window.addEventListener("storage", (e) => { if (e.key) cache.delete(e.key); else cache.clear(); });

  /* ---------- Session ---------- */
  const SESSION_KEY = "mori.session.v1";
  const ACCOUNTS_KEY = "mori.accounts.v1";
  const APP_PAGES = ["home.html", "projects.html", "network.html"];
  const params = new URLSearchParams(location.search);
  const pageName = () => location.pathname.split("/").pop() || "index.html";
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";
  const leave = (url) => {
    Mori.redirecting = true;
    root.style.visibility = "hidden";
    location.replace(url);
  };

  Mori.auth = {
    APP_PAGES,

    session() { return Mori.store.read(SESSION_KEY, null); },
    isSignedIn() { return !!Mori.auth.session(); },

    /** Merge changes into the current session (e.g. a new name, onboarding done). */
    updateSession(patch) {
      const s = Mori.auth.session();
      if (!s) return null;
      const next = Object.assign({}, s, patch);
      Mori.store.write(SESSION_KEY, next);
      if (next.onboarded) {
        const accounts = Mori.store.read(ACCOUNTS_KEY, {});
        accounts[s.id] = Object.assign({}, accounts[s.id], { onboarded: true });
        Mori.store.write(ACCOUNTS_KEY, accounts);
      }
      return next;
    },

    /** Same-site app page from ?next=, else the fallback (or home). */
    nextUrl(fallback) {
      const next = params.get("next");
      if (next && APP_PAGES.includes(next.split(/[?#]/)[0])) return next;
      return APP_PAGES.includes(fallback) ? fallback : "home.html";
    },

    /** Start page chosen in Settings → Preferences. */
    startPage(session) {
      const s = session || Mori.auth.session();
      const st = s ? Mori.store.read(`mori.${s.id}.settings`, {}) : {};
      return APP_PAGES.includes(st && st.startPage) ? st.startPage : "home.html";
    },

    /** Where a member goes right after signing in. */
    landingUrl(session) {
      const s = session || Mori.auth.session();
      if (s && !s.onboarded) {
        const next = params.get("next");
        return "onboarding.html" + (next ? "?next=" + encodeURIComponent(next) : "");
      }
      return Mori.auth.nextUrl(Mori.auth.startPage(s));
    },

    /**
     * Create the session. `profile` is a Supabase user ({ id, name, email, picture })
     * or the demo form ({ name, email }); `onboarded` says whether the sign-up
     * questions are answered (from the database, or remembered for demo accounts).
     */
    completeSignIn(profile, opts = {}) {
      const provider = profile.provider === "google" ? "google" : "demo";
      const id = provider === "google" ? profile.id : "demo_" + slug(profile.email || profile.name);
      const accounts = Mori.store.read(ACCOUNTS_KEY, {});
      const known = accounts[id];
      accounts[id] = Object.assign({ joinedAt: Date.now() }, known);
      const onboarded = typeof opts.onboarded === "boolean" ? opts.onboarded : !!accounts[id].onboarded;
      accounts[id].onboarded = onboarded;
      Mori.store.write(ACCOUNTS_KEY, accounts);

      const name = String(profile.name || "").trim() || "Member";
      const session = {
        id,
        provider,
        name,
        givenName: name.split(/\s+/)[0],
        email: profile.email || "",
        picture: profile.picture || "",
        onboarded,
        isNew: !onboarded,
        signedInAt: Date.now(),
      };
      Mori.store.write(SESSION_KEY, session);
      return session;
    },

    /** Forget the local session (Supabase sign-out is handled by db.js). */
    clearSession() { Mori.store.remove(SESSION_KEY); },

    /** Redirect visitors who shouldn't be on this page yet. */
    guard(kind) {
      let s = Mori.auth.session();
      if (!s && !persistent) {
        // Storage is blocked (private window, sandboxed preview…): keep the concept usable.
        s = Mori.auth.completeSignIn({ provider: "demo", name: "Guest" }, { onboarded: true });
      }
      const here = pageName();
      if (!s) {
        const next = APP_PAGES.includes(here) ? here + location.search + location.hash : "";
        leave("index.html" + (next ? "?next=" + encodeURIComponent(next) : ""));
        return false;
      }
      if (kind === "required" && !s.onboarded) {
        leave("onboarding.html?next=" + encodeURIComponent(here + location.search + location.hash));
        return false;
      }
      if (kind === "onboarding" && s.onboarded && !params.has("edit")) {
        leave(Mori.auth.nextUrl(Mori.auth.startPage(s)));
        return false;
      }
      return true;
    },
  };

  /* ---------- Before first paint ---------- */
  const s = Mori.auth.session();
  if (s) {
    const st = Mori.store.read(`mori.${s.id}.settings`, {}) || {};
    if (st.motion === "reduced" || st.motion === "full") root.setAttribute("data-motion", st.motion);
    if (st.aura === false) root.setAttribute("data-aura", "still");
  }
  // Google is redirecting back: show the sign-in screen, not the landing page.
  if (params.get("auth") === "callback") root.classList.add("is-signing-in");

  const kind = root.getAttribute("data-auth");
  if (kind) Mori.auth.guard(kind);
})();
