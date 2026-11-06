/* ==========================================================================
   Mori: Sandbox — member state
   --------------------------------------------------------------------------
   What the member adds themselves (profile, projects, settings) is stored
   per member in localStorage. For Google members the profile, the other
   members and connection requests live in Supabase; the local copy keeps
   pages rendering instantly and is refreshed in the background.
   Every write dispatches a "mori:change" event so nav badges and open views
   can refresh.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const D = Mori.data;

  const emit = (key) => document.dispatchEvent(new CustomEvent("mori:change", { detail: { key } }));
  const get = (k, fallback) => Mori.store.read(Mori.store.userKey(k), fallback);
  const put = (k, v) => Mori.store.write(Mori.store.userKey(k), v);
  const set = (k, v) => { put(k, v); emit(k); };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const session = () => Mori.auth.session() || { id: "guest", name: "Member", givenName: "Member" };

  // Earlier versions of the concept seeded a sample network and chats: forget them.
  if (get("dataVersion", 0) < 2) {
    ["network", "threads", "seededAt"].forEach((k) => Mori.store.remove(Mori.store.userKey(k)));
    put("dataVersion", 2);
  }

  /* ---------- Profile ----------
     Onboarding answers plus later edits. With Supabase the database is the
     source of truth and this local copy keeps rendering instant. */
  const PROFILE_BLANK = {
    firstName: "", lastName: "", age: null, region: "", role: null, experience: "", employment: "", industries: [],
    linkedin: "", cvPath: "", cvName: "", languages: [], headline: "", bio: "", skills: [], open: true, openType: "",
    visibility: "everyone", rating: null, reviews: 0,
  };
  const remoteEnabled = () => !!(Mori.db && Mori.db.enabled && session().provider === "google" && Mori.auth.isUuid(session().id));

  function profile() {
    const p = Object.assign({}, PROFILE_BLANK, get("profile", {}));
    if (!p.openType) p.openType = p.role === "specialist" ? "join" : "cofound";
    return p;
  }
  /** Save locally, then to Supabase for Google members. Resolves once stored. */
  function saveProfile(patch, opts = {}) {
    set("profile", Object.assign({}, get("profile", {}), patch));
    if (opts.remote === false || !remoteEnabled()) return Promise.resolve();
    const s = session();
    const onboarded = typeof opts.onboarded === "boolean" ? opts.onboarded : !!s.onboarded;
    return Mori.db.saveProfile(Object.assign(profile(), { onboarded, avatarUrl: s.picture }));
  }
  /** Refresh the local copy from Supabase (app pages call this in the background). */
  async function syncProfile() {
    if (!remoteEnabled()) return false;
    const remote = await Mori.db.fetchProfile();
    if (!remote) return false;
    delete remote.onboarded;
    set("profile", Object.assign({}, get("profile", {}), remote));
    return true;
  }

  /* ---------- Settings ---------- */
  const SETTINGS_DEFAULTS = {
    motion: "system",            // system | full | reduced
    aura: true,                  // animated background
    startPage: "home.html",
    showRecord: true,            // show milestone record on the profile
    notify: { messages: true, requests: true, projects: true, announcements: true, digest: false },
  };
  function settings() {
    const s = get("settings", {});
    return Object.assign({}, SETTINGS_DEFAULTS, s, { notify: Object.assign({}, SETTINGS_DEFAULTS.notify, s.notify || {}) });
  }
  function saveSettings(patch) {
    const cur = get("settings", {});
    const next = Object.assign({}, cur, patch);
    if (patch.notify) next.notify = Object.assign({}, cur.notify || {}, patch.notify);
    set("settings", next);
    applyPrefs();
  }
  function applyPrefs() {
    const r = document.documentElement;
    const s = settings();
    if (s.motion === "system") r.removeAttribute("data-motion");
    else r.setAttribute("data-motion", s.motion);
    if (s.aura === false) r.setAttribute("data-aura", "still");
    else r.removeAttribute("data-aura");
  }

  /* ---------- Projects (declared by the member, kept in this browser) ---------- */
  function projects() {
    const overrides = get("projectOverrides", {});
    return get("projectsCreated", []).map((p) => {
      const o = overrides[p.id] || {};
      const milestones = p.milestones.map((m, i) => ({ text: m.text, done: o.done && typeof o.done[i] === "boolean" ? o.done[i] : !!m.done }));
      const touched = o.updatedAt || p.createdAt;
      const doneCount = milestones.filter((m) => m.done).length;
      return Object.assign({}, p, {
        milestones,
        doneCount,
        pinned: typeof o.pinned === "boolean" ? o.pinned : !!p.pinned,
        updated_days: touched ? Math.floor((Date.now() - touched) / 864e5) : 0,
        progress: milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0,
      });
    });
  }
  const project = (id) => projects().find((p) => p.id === id) || null;
  const pinnedProjects = () => projects().filter((p) => p.pinned);
  const allTags = () => Array.from(new Set(projects().flatMap((p) => p.tags))).sort();

  function override(pid, patch) {
    const overrides = get("projectOverrides", {});
    overrides[pid] = Object.assign({}, overrides[pid], patch);
    set("projectOverrides", overrides);
    return project(pid);
  }
  function toggleMilestone(pid, index) {
    const p = project(pid);
    if (!p || !p.milestones[index]) return null;
    const done = p.milestones.map((m) => m.done);
    done[index] = !done[index];
    return override(pid, { done, updatedAt: Date.now() });
  }
  function togglePin(pid) {
    const p = project(pid);
    return p ? override(pid, { pinned: !p.pinned }) : null;
  }

  function createProject({ name, focus, tags, rung }) {
    const r = Math.max(0, Math.min(5, Number(rung) || 0));
    const next = D.ladder[Math.min(r + 1, 5)];
    const p = {
      id: "c" + Date.now().toString(36),
      name: String(name).trim(),
      tags: tags && tags.length ? tags : ["Idea"],
      focus: String(focus || "").trim() || `Working toward ${next.stage}`,
      rung: r,
      owner: true,
      pinned: pinnedProjects().length === 0, // the first project shows on the homepage
      createdAt: Date.now(),
      team: [],
      milestones: D.starterMilestones[r].map((text) => ({ text, done: false })),
    };
    const list = get("projectsCreated", []);
    list.unshift(p);
    set("projectsCreated", list);
    return p.id;
  }

  /* ---------- Network: members who signed up, and connection requests ----------
     Supabase is the source of truth (see member_directory and the connections
     table). Each link is { id, from, to, status: pending|accepted|ignored, note, at }. */
  let inflight = null;
  let refreshedAt = 0;
  const me = () => session().id;

  const network = {
    /** Only Google members have a network; demo accounts stay on this device. */
    available: remoteEnabled,
    members: () => (remoteEnabled() ? get("members", []) : []),
    member: (id) => network.members().find((m) => m.id === id) || null,
    links: () => (remoteEnabled() ? get("links", []) : []),
    refreshedAt: () => refreshedAt,

    /** Load members and requests again. Calls in flight are shared; fresh data is reused unless forced. */
    refresh(opts = {}) {
      if (!remoteEnabled()) return Promise.resolve(false);
      if (inflight) return inflight;
      if (!opts.force && Date.now() - refreshedAt < 15000) return Promise.resolve(false);
      inflight = Promise.all([Mori.db.members(), Mori.db.connections()])
        .then(([members, links]) => {
          put("members", members);
          put("links", links);
          refreshedAt = Date.now();
          emit("network");
          return true;
        })
        .finally(() => { inflight = null; });
      return inflight;
    },

    link(id) { return network.links().find((l) => (l.from === me() && l.to === id) || (l.to === me() && l.from === id)) || null; },
    /** none · pending (you asked) · incoming (they asked) · connected */
    status(id) {
      const l = network.link(id);
      if (!l) return "none";
      if (l.status === "accepted") return "connected";
      return l.from === me() ? "pending" : "incoming"; // an ignored request still looks pending to its sender
    },
    incoming() {
      return network.links()
        .filter((l) => l.to === me() && l.status === "pending")
        .map((l) => ({ link: l, person: network.member(l.from), note: l.note, at: l.at }))
        .filter((x) => x.person);
    },
    sent() {
      return network.links()
        .filter((l) => l.from === me() && l.status !== "accepted")
        .map((l) => ({ link: l, person: network.member(l.to), note: l.note, at: l.at }))
        .filter((x) => x.person);
    },
    connections() {
      return network.links()
        .filter((l) => l.status === "accepted")
        .map((l) => network.member(l.from === me() ? l.to : l.from))
        .filter(Boolean);
    },

    async connect(id, note) {
      if (network.status(id) === "incoming") return network.accept(id);
      if (network.link(id)) return network.link(id);
      try {
        const link = await Mori.db.requestConnection(id, note);
        set("links", network.links().concat(link));
        return link;
      } catch (err) {
        if (err.code !== "23505") throw err;
        // They sent you a request at the same moment: accept theirs instead.
        await network.refresh({ force: true });
        return network.status(id) === "incoming" ? network.accept(id) : network.link(id);
      }
    },
    accept: (id) => answer(id, "accepted"),
    ignore: (id) => answer(id, "ignored"),
    withdraw: (id) => drop(id),
    remove: (id) => drop(id),
  };

  async function answer(id, status) {
    const l = network.link(id);
    if (!l) return null;
    const link = await Mori.db.answerRequest(l.id, status);
    if (!link) {
      await network.refresh({ force: true });
      throw new Error("That request was withdrawn.");
    }
    set("links", network.links().map((x) => (x.id === l.id ? link : x)));
    return link;
  }
  async function drop(id) {
    const l = network.link(id);
    if (!l) return;
    await Mori.db.deleteConnection(l.id);
    set("links", network.links().filter((x) => x.id !== l.id));
  }

  /* ---------- Notifications: built from connection requests ---------- */
  function notifications() {
    if (settings().notify.requests === false) return [];
    const read = get("notifRead", {});
    const out = [];
    network.links().forEach((l) => {
      if (l.to === me() && l.status === "pending") {
        const p = network.member(l.from);
        if (p) out.push({ id: "req:" + l.id, type: "request", at: l.at, link: "network.html#requests",
          text: `<b>${esc(p.name)}</b> wants to connect.${l.note ? ` “${esc(l.note)}”` : ""}` });
      } else if (l.from === me() && l.status === "accepted") {
        const p = network.member(l.to);
        if (p) out.push({ id: "acc:" + l.id, type: "accepted", at: l.respondedAt || l.at, link: "network.html#explore/" + encodeURIComponent(p.id),
          text: `<b>${esc(p.name)}</b> accepted your request. You’re now connected.` });
      }
    });
    return out.map((n) => Object.assign(n, { unread: !read[n.id] })).sort((a, b) => b.at - a.at);
  }
  const unreadNotifications = () => notifications().filter((n) => n.unread).length;
  function markNotificationRead(id) { const r = get("notifRead", {}); r[id] = true; set("notifRead", r); }
  function markAllNotificationsRead() { const r = get("notifRead", {}); notifications().forEach((n) => { r[n.id] = true; }); set("notifRead", r); }

  /** Clear everything stored in this browser for the member and start again. */
  function reset() { Mori.store.clearUser(); emit("reset"); }

  Mori.state = {
    session, ladder: D.ladder,
    profile, saveProfile, syncProfile,
    settings, saveSettings, applyPrefs,
    notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead,
    projects, project, pinnedProjects, allTags, toggleMilestone, togglePin, createProject,
    network, reset,
  };
})();
