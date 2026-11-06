/* ==========================================================================
   Mori: Sandbox — Supabase (sign-in, profiles, CVs, members, connections)
   --------------------------------------------------------------------------
   The client library loads on demand and only when the site is served over
   http(s) with keys in config.js. Otherwise Mori.db.enabled is false and the
   rest of the site runs in demo mode on localStorage.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const cfg = window.MORI_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseKey) && /^https?:$/.test(location.protocol);
  const LIB = "assets/vendor/supabase-2.58.0.js";
  const ROLE_TO_DB = { founder: "Founder", specialist: "Specialist" };
  const ROLE_FROM_DB = { Founder: "founder", Specialist: "specialist" };
  const LINK_COLS = "id, requester_id, addressee_id, status, note, created_at, responded_at";
  let clientPromise = null;

  function client() {
    if (!enabled) return Promise.reject(new Error("Supabase isn't configured."));
    clientPromise = clientPromise || new Promise((resolve, reject) => {
      const make = () => resolve(window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }));
      if (window.supabase) { make(); return; }
      const s = document.createElement("script");
      s.src = LIB;
      s.onload = make;
      s.onerror = () => { clientPromise = null; reject(new Error("Couldn't load the sign-in service. Check your connection.")); };
      document.head.appendChild(s);
    });
    return clientPromise;
  }
  const fail = (error) => {
    if (!error) return;
    const e = new Error(error.message || String(error));
    e.code = error.code; // e.g. "23505" when a request between two members already exists
    throw e;
  };
  const https = (url) => (/^https:\/\//i.test(url || "") ? url : "");

  /** Id of the member Supabase has signed in; throws a "signed-out" error if the session is gone. */
  async function signedInId(c) {
    const { data } = await c.auth.getSession();
    const id = data.session && data.session.user && data.session.user.id;
    if (!id) {
      const e = new Error("Your sign-in has expired. Please sign in with Google again.");
      e.code = "signed-out";
      throw e;
    }
    return id;
  }

  /* ---------- Row ↔ profile mapping ---------- */
  function fromRow(r) {
    if (!r) return null;
    const role = ROLE_FROM_DB[r.profile_type] || null;
    return {
      firstName: r.first_name || "",
      lastName: r.last_name || "",
      age: r.age,
      region: r.region || "",
      role,
      experience: r.expertise_level || "",
      employment: r.employment_status || "",
      industries: r.business_sector || [],
      linkedin: r.linkedin_url || "",
      cvPath: r.cv_path || "",
      cvName: r.cv_name || "",
      languages: Array.isArray(r.languages) ? r.languages : [],
      headline: r.headline || "",
      bio: r.bio || "",
      skills: r.skills || [],
      open: r.open_to_build !== false,
      openType: r.open_type || (role === "founder" ? "cofound" : "join"),
      visibility: r.profile_visibility === "connections" ? "connections" : "everyone",
      rating: r.sprint_rating == null ? null : Number(r.sprint_rating),
      reviews: r.sprint_reviews || 0,
      // Older rows predate the current questions: send those members through onboarding once.
      onboarded: !!(r.onboarding_completed && r.age != null && r.region),
    };
  }
  function toRow(id, p) {
    return {
      id,
      first_name: p.firstName || "Member",
      last_name: p.lastName || "",
      age: p.age == null || p.age === "" ? null : Number(p.age),
      region: p.region || null,
      profile_type: ROLE_TO_DB[p.role] || null,
      expertise_level: p.experience || null,
      employment_status: p.employment || null,
      business_sector: (p.industries || []).slice(0, 3),
      linkedin_url: p.linkedin || null,
      cv_path: p.cvPath || null,
      cv_name: p.cvName || null,
      languages: p.languages || [],
      headline: p.headline || null,
      bio: p.bio || null,
      skills: p.skills || [],
      open_to_build: p.open !== false,
      open_type: p.openType || null,
      profile_visibility: p.visibility === "connections" ? "connections" : "everyone",
      onboarding_completed: !!p.onboarded,
      avatar_url: p.avatarUrl || null,
    };
  }

  /** A member as the directory shares them (see public.member_directory). */
  function memberFromRow(r) {
    const name = [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "Member";
    return {
      id: r.id,
      name,
      picture: https(r.avatar_url),
      role: ROLE_FROM_DB[r.profile_type] || null,
      headline: r.headline || "",
      bio: r.bio || "",
      region: r.region || "",
      experience: r.expertise_level || "",
      employment: r.employment_status || "",
      industries: r.business_sector || [],
      languages: Array.isArray(r.languages) ? r.languages : [],
      skills: r.skills || [],
      open: r.open_to_build === true,
      openType: r.open_type || "",
      linkedin: https(r.linkedin_url),
      cvPath: r.cv_path || "",
      cvName: r.cv_name || "",
      rating: r.sprint_rating == null ? null : Number(r.sprint_rating),
      reviews: r.sprint_reviews || 0,
      joinedAt: Date.parse(r.joined_at) || 0,
      limited: !!r.limited, // shares the full profile with connections only
    };
  }
  const linkFromRow = (r) => ({
    id: r.id,
    from: r.requester_id,
    to: r.addressee_id,
    status: r.status,
    note: r.note || "",
    at: Date.parse(r.created_at) || Date.now(),
    respondedAt: Date.parse(r.responded_at) || 0,
  });

  Mori.db = {
    enabled,
    client,

    /** Warm up the library so the sign-in click responds instantly. */
    preload() { if (enabled) client().catch(() => {}); },

    /** Redirects to Google; Supabase sends the member back to index.html?auth=callback. */
    async signInWithGoogle(next) {
      const c = await client();
      const back = new URL("index.html", location.href);
      back.searchParams.set("auth", "callback");
      if (next) back.searchParams.set("next", next);
      const { error } = await c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back.href } });
      fail(error);
    },

    /** The signed-in Supabase user (after Google's redirect this also finishes the code exchange). */
    async user() {
      const c = await client();
      const { data, error } = await c.auth.getSession();
      fail(error);
      const u = data.session && data.session.user;
      if (!u) return null;
      const m = u.user_metadata || {};
      return { provider: "google", id: u.id, email: u.email || m.email || "", name: m.full_name || m.name || "", picture: m.avatar_url || m.picture || "" };
    },

    async fetchProfile() {
      const c = await client();
      const id = await signedInId(c);
      const { data, error } = await c.from("profiles").select("*").eq("id", id).maybeSingle();
      fail(error);
      return fromRow(data);
    },

    async saveProfile(profile) {
      const c = await client();
      const id = await signedInId(c);
      const { error } = await c.from("profiles").upsert(toRow(id, profile), { onConflict: "id" });
      fail(error);
    },

    /** Upload a CV to cvs/<user id>/…; returns { path, name }. Replaces the previous file. */
    async uploadCv(file, previousPath) {
      const c = await client();
      const id = await signedInId(c);
      const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = `${id}/${Date.now()}-${safe}`;
      const { error } = await c.storage.from("cvs").upload(path, file, { contentType: file.type, upsert: false });
      fail(error);
      if (previousPath && previousPath !== path) c.storage.from("cvs").remove([previousPath]).catch(() => {});
      return { path, name: file.name };
    },

    /** Short-lived link to your CV, or a connection's. */
    async cvLink(path) {
      const c = await client();
      const { data, error } = await c.storage.from("cvs").createSignedUrl(path, 300);
      fail(error);
      return data.signedUrl;
    },

    /** Everyone who finished sign-up, except you. */
    async members() {
      const c = await client();
      await signedInId(c);
      const { data, error } = await c.rpc("member_directory");
      fail(error);
      return (data || []).map(memberFromRow);
    },

    /** Connection requests you sent or received, newest first. */
    async connections() {
      const c = await client();
      await signedInId(c);
      const { data, error } = await c.from("connections").select(LINK_COLS).order("created_at", { ascending: false });
      fail(error);
      return (data || []).map(linkFromRow);
    },

    async requestConnection(memberId, note) {
      const c = await client();
      await signedInId(c);
      const body = { addressee_id: memberId, note: note ? String(note).trim().slice(0, 300) || null : null };
      const { data, error } = await c.from("connections").insert(body).select(LINK_COLS).single();
      fail(error);
      return linkFromRow(data);
    },

    /** Accept or ignore a request sent to you. Resolves null if it was withdrawn meanwhile. */
    async answerRequest(linkId, status) {
      const c = await client();
      await signedInId(c);
      const { data, error } = await c.from("connections").update({ status }).eq("id", linkId).select(LINK_COLS).maybeSingle();
      fail(error);
      return data ? linkFromRow(data) : null;
    },

    /** Withdraw a request you sent, or remove a connection. */
    async deleteConnection(linkId) {
      const c = await client();
      await signedInId(c);
      const { error } = await c.from("connections").delete().eq("id", linkId);
      fail(error);
    },

    async signOut() {
      if (!enabled) return;
      if (clientPromise) {
        try { await (await client()).auth.signOut({ scope: "local" }); return; } catch (e) { /* fall through */ }
      }
      // Library not loaded on this page: drop its stored session directly.
      try {
        Object.keys(localStorage).filter((k) => /^sb-.*-auth-token/.test(k)).forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* ignore */ }
    },
  };
})();
