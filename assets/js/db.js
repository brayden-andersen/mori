/* ==========================================================================
   Mori: Sandbox — Supabase
   --------------------------------------------------------------------------
   Sign-in, profiles (with photo and links), CVs, the member directory,
   connection requests, shared projects, messages and live updates.
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
  const MSG_COLS = "id, sender_id, recipient_id, body, created_at, read_at";
  const PROJECT_COLS = "id, owner_id, name, focus, tags, rung, milestones, created_at, updated_at, project_members(member_id, created_at)";
  const PHOTO_PATH = "/storage/v1/object/public/avatars/";
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
  const LINK_TYPES = new Set(((Mori.data && Mori.data.linkTypes) || []).map((t) => t.id));
  /** Only https links of a known type, at most 8. */
  const cleanLinks = (list) => (Array.isArray(list) ? list : [])
    .map((l) => ({ type: LINK_TYPES.has(l && l.type) ? l.type : "other", url: https(l && l.url) }))
    .filter((l) => l.url)
    .slice(0, 8);

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
  async function signedIn() {
    const c = await client();
    return { c, id: await signedInId(c) };
  }

  /* ---------- Row ↔ object mapping ---------- */
  function fromRow(r) {
    if (!r) return null;
    const role = ROLE_FROM_DB[r.profile_type] || null;
    return {
      firstName: r.first_name || "",
      lastName: r.last_name || "",
      age: r.age,
      birthDate: r.birth_date || "",
      region: r.region || "",
      role,
      specialty: r.specialty || "",
      experience: r.expertise_level || "",
      employment: r.employment_status || "",
      industries: r.business_sector || [],
      linkedin: r.linkedin_url || "",
      links: cleanLinks(r.links),
      photo: https(r.avatar_url),
      cover: https(r.cover_url),
      cvPath: r.cv_path || "",
      cvName: r.cv_name || "",
      languages: Array.isArray(r.languages) ? r.languages : [],
      headline: r.headline || "",
      bio: r.bio || "",
      skills: r.skills || [],
      open: r.open_to_build !== false,
      openType: r.open_type || (role === "founder" ? "cofound" : "join"),
      visibility: r.profile_visibility === "connections" ? "connections" : "everyone",
      invisible: r.invisible === true,
      rating: r.sprint_rating == null ? null : Number(r.sprint_rating),
      reviews: r.sprint_reviews || 0,
      joinedAt: Date.parse(r.created_at) || 0,
      show: { age: r.show_age === true, region: r.show_region !== false, employment: r.show_employment !== false, languages: r.show_languages !== false },
      // Older rows predate the current questions (date of birth, a specialist's role):
      // those members go through onboarding again, with their answers filled in.
      onboarded: !!(r.onboarding_completed && r.birth_date && r.region && (role !== "specialist" || r.specialty)),
    };
  }
  function toRow(id, p) {
    return {
      id,
      first_name: p.firstName || "Member",
      last_name: p.lastName || "",
      age: p.age == null || p.age === "" ? null : Number(p.age),
      birth_date: p.birthDate || null,
      region: p.region || null,
      profile_type: ROLE_TO_DB[p.role] || null,
      specialty: p.role === "specialist" && p.specialty ? String(p.specialty).slice(0, 60) : null,
      expertise_level: p.experience || null,
      employment_status: p.employment || null,
      business_sector: (p.industries || []).slice(0, 3),
      linkedin_url: p.linkedin || null,
      links: cleanLinks(p.links),
      avatar_url: https(p.photo) || null, // demo photos (data: URLs) never leave the browser
      cover_url: https(p.cover) || null,
      cv_path: p.cvPath || null,
      cv_name: p.cvName || null,
      languages: p.languages || [],
      headline: p.headline || null,
      bio: p.bio || null,
      skills: p.skills || [],
      open_to_build: p.open !== false,
      open_type: p.openType || null,
      profile_visibility: p.visibility === "connections" ? "connections" : "everyone",
      invisible: !!p.invisible,
      show_age: !!(p.show && p.show.age),
      show_region: !p.show || p.show.region !== false,
      show_employment: !p.show || p.show.employment !== false,
      show_languages: !p.show || p.show.languages !== false,
      onboarding_completed: !!p.onboarded,
    };
  }

  /** A member as the directory shares them (see public.member_directory). */
  function memberFromRow(r) {
    const name = [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "Member";
    return {
      id: r.id,
      name,
      picture: https(r.avatar_url),
      cover: https(r.cover_url),
      role: ROLE_FROM_DB[r.profile_type] || null,
      specialty: r.specialty || "",
      headline: r.headline || "",
      bio: r.bio || "",
      age: r.age == null ? null : Number(r.age), // only when they show it
      region: r.region || "",
      experience: r.expertise_level || "",
      employment: r.employment_status || "",
      industries: r.business_sector || [],
      languages: Array.isArray(r.languages) ? r.languages : [],
      skills: r.skills || [],
      open: r.open_to_build === true,
      openType: r.open_type || "",
      linkedin: https(r.linkedin_url),
      links: cleanLinks(r.links),
      cvPath: r.cv_path || "",
      cvName: r.cv_name || "",
      rating: r.sprint_rating == null ? null : Number(r.sprint_rating),
      reviews: r.sprint_reviews || 0,
      joinedAt: Date.parse(r.joined_at) || 0,
      limited: !!r.limited, // shares the full profile with connections only
      invisible: !!r.invisible, // invisible on the MORI Network: name and join date only
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
  const messageFromRow = (r) => ({
    id: r.id,
    from: r.sender_id,
    to: r.recipient_id,
    body: r.body,
    at: Date.parse(r.created_at) || Date.now(),
    readAt: Date.parse(r.read_at) || 0,
  });
  const DOC_LIST_COLS = "id, project_id, title, created_by, updated_by, created_at, updated_at";
  const docFromRow = (r) => ({
    id: r.id,
    projectId: r.project_id,
    title: r.title || "Untitled document",
    body: typeof r.body === "string" ? r.body : undefined,
    createdBy: r.created_by || null,
    updatedBy: r.updated_by || null,
    createdAt: Date.parse(r.created_at) || Date.now(),
    updatedAt: Date.parse(r.updated_at) || Date.now(),
  });
  const projectFromRow = (r) => ({
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    focus: r.focus || "",
    tags: r.tags || [],
    rung: r.rung || 0,
    milestones: Array.isArray(r.milestones) ? r.milestones.filter((m) => m && typeof m === "object") : [], // tasks: state.js shapes them
    createdAt: Date.parse(r.created_at) || Date.now(),
    updatedAt: Date.parse(r.updated_at) || 0,
    cofounders: (r.project_members || []).map((x) => x.member_id),
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

    /* ---------- Profile ---------- */
    async fetchProfile() {
      const { c, id } = await signedIn();
      const { data, error } = await c.from("profiles").select("*").eq("id", id).maybeSingle();
      fail(error);
      return fromRow(data);
    },

    async saveProfile(profile) {
      const { c, id } = await signedIn();
      const { error } = await c.from("profiles").upsert(toRow(id, profile), { onConflict: "id" });
      fail(error);
    },

    /** Settings, pins and the theme saved on your account (synced across devices); null if there's no profile row yet. */
    async prefs() {
      const { c, id } = await signedIn();
      const { data, error } = await c.from("profiles").select("prefs").eq("id", id).maybeSingle();
      fail(error);
      return data ? data.prefs || {} : null;
    },
    async savePrefs(prefs) {
      const { c, id } = await signedIn();
      const { error } = await c.from("profiles").update({ prefs }).eq("id", id);
      fail(error);
    },

    /** Upload a square photo to avatars/<user id>/…; returns its public URL. */
    async uploadPhoto(blob, prefix = "") {
      const { c, id } = await signedIn();
      const path = `${id}/${prefix}${Date.now()}.jpg`;
      const { error } = await c.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
      fail(error);
      return c.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    },

    /** Delete a photo this site uploaded (by its public URL); other photos are left alone. */
    async removePhoto(url) {
      if (!url || url.indexOf(PHOTO_PATH) === -1) return;
      const { c } = await signedIn();
      const path = decodeURIComponent(url.split(PHOTO_PATH)[1].split("?")[0]);
      const { error } = await c.storage.from("avatars").remove([path]);
      fail(error);
    },

    /** Upload a CV to cvs/<user id>/…; returns { path, name }. Replaces the previous file. */
    async uploadCv(file, previousPath) {
      const { c, id } = await signedIn();
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

    /* ---------- Members and connection requests ---------- */
    /** Everyone who finished sign-up, except you. */
    async members() {
      const { c } = await signedIn();
      const { data, error } = await c.rpc("member_directory");
      fail(error);
      return (data || []).map(memberFromRow);
    },

    /** Connection requests you sent or received, newest first. */
    async connections() {
      const { c } = await signedIn();
      const { data, error } = await c.from("connections").select(LINK_COLS).order("created_at", { ascending: false });
      fail(error);
      return (data || []).map(linkFromRow);
    },

    /** Invisible members, found only by their exact full name (name and join date only). */
    async findMember(fullName) {
      const { c } = await signedIn();
      const { data, error } = await c.rpc("find_member", { full_name: String(fullName || "").trim() });
      fail(error);
      return (data || []).map(memberFromRow);
    },

    async requestConnection(memberId, note) {
      const { c } = await signedIn();
      const body = { addressee_id: memberId, note: note ? String(note).trim().slice(0, 300) || null : null };
      const { data, error } = await c.from("connections").insert(body).select(LINK_COLS).single();
      fail(error);
      return linkFromRow(data);
    },

    /** Accept or ignore a request sent to you. Resolves null if it was withdrawn meanwhile. */
    async answerRequest(linkId, status) {
      const { c } = await signedIn();
      const { data, error } = await c.from("connections").update({ status }).eq("id", linkId).select(LINK_COLS).maybeSingle();
      fail(error);
      return data ? linkFromRow(data) : null;
    },

    /** Withdraw a request you sent, or remove a connection. */
    async deleteConnection(linkId) {
      const { c } = await signedIn();
      const { error } = await c.from("connections").delete().eq("id", linkId);
      fail(error);
    },

    /* ---------- Projects (shared with co-founders) ---------- */
    /** Projects you own or co-found, newest first. */
    async projects() {
      const { c } = await signedIn();
      const { data, error } = await c.from("projects").select(PROJECT_COLS).order("created_at", { ascending: false });
      fail(error);
      return (data || []).map(projectFromRow);
    },

    /** Create a project; co-founders (connections) are added straight after. */
    async createProject(p, cofounders = []) {
      const { c } = await signedIn();
      const body = { name: p.name, focus: p.focus || "", tags: p.tags || [], rung: p.rung || 0, milestones: p.milestones || [] };
      const { data, error } = await c.from("projects").insert(body).select(PROJECT_COLS).single();
      fail(error);
      const project = projectFromRow(data);
      if (cofounders.length) project.cofounders = await Mori.db.addCofounders(project.id, cofounders);
      return project;
    },

    /** Change a project's name, focus, tags, rung or milestones. Resolves null if you no longer have access. */
    async updateProject(id, patch) {
      const { c } = await signedIn();
      const { data, error } = await c.from("projects").update(patch).eq("id", id).select(PROJECT_COLS).maybeSingle();
      fail(error);
      return data ? projectFromRow(data) : null;
    },

    /**
     * Change one column of a project starting from the latest stored copy:
     * `apply(value)` returns the new value. The write only lands if nobody
     * saved the project since it was read (its updated_at is the version);
     * otherwise it reads again and re-applies, so two people saving at the
     * same moment both keep their change. Resolves the saved row, or null if
     * you no longer have access.
     */
    async changeColumn(id, column, apply, select) {
      const { c } = await signedIn();
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data: cur, error: readError } = await c.from("projects").select(`${column}, updated_at`).eq("id", id).maybeSingle();
        fail(readError);
        if (!cur) return null;
        const { data, error } = await c.from("projects").update({ [column]: apply(cur[column]) }).eq("id", id).eq("updated_at", cur.updated_at).select(select).maybeSingle();
        fail(error);
        if (data) return data;
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 120 * (attempt + 1))); // someone saved in between: try again
      }
      throw Object.assign(new Error("Your teammates are saving a lot right now; please try again."), { code: "busy" });
    },
    /**
     * Change a project's tasks starting from the latest stored copy:
     * `apply(tasks)` returns the new list. Resolves null if you no longer have access.
     */
    async changeTasks(id, apply) {
      const row = await Mori.db.changeColumn(id, "milestones", apply, PROJECT_COLS);
      return row ? projectFromRow(row) : null;
    },

    /* ---------- Project workspace (Mainframe layout + tools) and documents ---------- */
    /** A project's workspace; null if you no longer have access. */
    async workspace(id) {
      const { c } = await signedIn();
      const { data, error } = await c.from("projects").select("workspace").eq("id", id).maybeSingle();
      fail(error);
      return data ? data.workspace || {} : null;
    },
    /** Change the workspace starting from the latest stored copy: `apply(workspace)` returns the new one. */
    async changeWorkspace(id, apply) {
      const row = await Mori.db.changeColumn(id, "workspace", (ws) => apply(ws || {}), "workspace");
      return row ? row.workspace || {} : null;
    },
    /** The team's documents (without their text), latest edit first. */
    async docs(projectId) {
      const { c } = await signedIn();
      const { data, error } = await c.from("project_docs").select(DOC_LIST_COLS).eq("project_id", projectId).order("updated_at", { ascending: false });
      fail(error);
      return (data || []).map(docFromRow);
    },
    async doc(id) {
      const { c } = await signedIn();
      const { data, error } = await c.from("project_docs").select(DOC_LIST_COLS + ", body").eq("id", id).maybeSingle();
      fail(error);
      return data ? docFromRow(data) : null;
    },
    async createDoc(projectId, { title, body }) {
      const { c } = await signedIn();
      const { data, error } = await c.from("project_docs").insert({ project_id: projectId, title, body }).select(DOC_LIST_COLS + ", body").single();
      fail(error);
      return docFromRow(data);
    },
    async saveDoc(id, patch) {
      const { c } = await signedIn();
      const { data, error } = await c.from("project_docs").update(patch).eq("id", id).select(DOC_LIST_COLS + ", body").maybeSingle();
      fail(error);
      return data ? docFromRow(data) : null;
    },
    async deleteDoc(id) {
      const { c } = await signedIn();
      const { error } = await c.from("project_docs").delete().eq("id", id);
      fail(error);
    },

    /** Delete a project you own (its team and tasks go with it). */
    async deleteProject(id) {
      const { c } = await signedIn();
      const { error } = await c.from("projects").delete().eq("id", id);
      fail(error);
    },

    /** Add co-founders to a project you own; returns the ids that were added. */
    async addCofounders(projectId, memberIds) {
      const { c } = await signedIn();
      const rows = memberIds.map((member_id) => ({ project_id: projectId, member_id }));
      const { data, error } = await c.from("project_members").insert(rows).select("member_id");
      fail(error);
      return (data || []).map((r) => r.member_id);
    },

    async removeCofounder(projectId, memberId) {
      const { c } = await signedIn();
      const { error } = await c.from("project_members").delete().eq("project_id", projectId).eq("member_id", memberId);
      fail(error);
    },

    /* ---------- Messages ---------- */
    /** Your most recent messages, sent and received, newest first. */
    async messages(limit = 500) {
      const { c } = await signedIn();
      const { data, error } = await c.from("messages").select(MSG_COLS).order("created_at", { ascending: false }).limit(limit);
      fail(error);
      return (data || []).map(messageFromRow);
    },

    async sendMessage(to, body) {
      const { c } = await signedIn();
      const { data, error } = await c.from("messages").insert({ recipient_id: to, body }).select(MSG_COLS).single();
      fail(error);
      return messageFromRow(data);
    },

    /** Mark everything a member sent you as read. */
    async markRead(fromId) {
      const { c, id } = await signedIn();
      const { error } = await c.from("messages").update({ read_at: new Date().toISOString() })
        .eq("sender_id", fromId).eq("recipient_id", id).is("read_at", null);
      fail(error);
    },

    /* ---------- Live updates ---------- */
    /**
     * Listen for changes that concern you: requests sent to or by you, new
     * messages, and your messages being read. Supabase only delivers rows you
     * may read. handlers: { connection, message, messageRead, status }.
     * Returns a function that stops listening.
     */
    async live(handlers) {
      const { c, id } = await signedIn();
      const call = (name) => (payload) => {
        try { if (handlers[name]) handlers[name](payload); } catch (e) { console.error(e); }
      };
      const ch = c.channel("member-" + id)
        .on("postgres_changes", { event: "*", schema: "public", table: "connections", filter: "addressee_id=eq." + id }, call("connection"))
        .on("postgres_changes", { event: "*", schema: "public", table: "connections", filter: "requester_id=eq." + id }, call("connection"))
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "connections" }, call("connection"))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "recipient_id=eq." + id }, call("message"))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: "sender_id=eq." + id }, call("messageRead"))
        .subscribe((state) => call("status")(state));
      return () => { c.removeChannel(ch); };
    },

    linkFromRow,
    messageFromRow,

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
