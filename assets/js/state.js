/* ==========================================================================
   Mori: Sandbox — member state
   --------------------------------------------------------------------------
   Merges the demo seed (data.js) with what the signed-in member has changed,
   stored per member in localStorage. Every write dispatches a "mori:change"
   event so the nav badges and open views can refresh.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const D = Mori.data;

  const emit = (key) => document.dispatchEvent(new CustomEvent("mori:change", { detail: { key } }));
  const get = (k, fallback) => Mori.store.read(Mori.store.userKey(k), fallback);
  const put = (k, v) => Mori.store.write(Mori.store.userKey(k), v);
  const set = (k, v) => { put(k, v); emit(k); };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const without = (arr, id) => arr.filter((x) => x !== id);

  /* Seed timestamps are anchored to the member's first visit so "2m ago"
     ages naturally into "1h ago", "Yesterday"… */
  function seededAt() {
    let t = get("seededAt", null);
    if (!t) { t = Date.now(); put("seededAt", t); }
    return t;
  }
  const agoToTs = (mins) => seededAt() - mins * 60000;

  const session = () => Mori.auth.session() || { id: "guest", name: "Member", givenName: "Member" };
  const person = (id) => D.people.find((p) => p.id === id) || null;

  /* ---------- Profile ----------
     Onboarding answers plus later edits. With Supabase the database is the
     source of truth and this local copy keeps rendering instant. */
  const PROFILE_BLANK = { firstName: "", lastName: "", age: null, region: "", role: null, experience: "", employment: "", industries: [], linkedin: "", cvPath: "", cvName: "", languages: [] };
  const remoteEnabled = () => !!(Mori.db && Mori.db.enabled && session().provider === "google" && Mori.auth.isUuid(session().id));

  function profile() {
    const p = get("profile", {});
    return Object.assign({}, PROFILE_BLANK, clone(D.profileDefaults[p.role] || D.profileDefaults.founder), p);
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
    visibility: "everyone",      // everyone | connections
    showRecord: true,            // show milestone record on startup pages
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

  /* ---------- Notifications ---------- */
  const NOTIFY_GROUP = { request: "requests", message: "messages", mention: "messages", project: "projects", ladder: "projects", sprint: "announcements", insight: "announcements", badge: "announcements" };
  function notifications() {
    const read = get("notifRead", {});
    const on = settings().notify;
    return D.notifications
      .filter((n) => on[NOTIFY_GROUP[n.type]] !== false)
      .map((n) => Object.assign({}, n, { at: agoToTs(n.ago), unread: n.unread && !read[n.id] }))
      .sort((a, b) => b.at - a.at);
  }
  const unreadNotifications = () => notifications().filter((n) => n.unread).length;
  function markNotificationRead(id) { const r = get("notifRead", {}); r[id] = true; set("notifRead", r); }
  function markAllNotificationsRead() { const r = get("notifRead", {}); D.notifications.forEach((n) => { r[n.id] = true; }); set("notifRead", r); }

  /* ---------- Projects ---------- */
  function projects() {
    const created = get("projectsCreated", []);
    const overrides = get("projectOverrides", {});
    return created.concat(clone(D.projects)).map((p) => {
      const o = overrides[p.id] || {};
      const milestones = p.milestones.map((m, i) => ({ text: m.text, done: o.done && typeof o.done[i] === "boolean" ? o.done[i] : !!m.done }));
      const touched = o.updatedAt || p.createdAt;
      const doneCount = milestones.filter((m) => m.done).length;
      return Object.assign({}, p, {
        milestones,
        doneCount,
        updated_days: touched ? Math.floor((Date.now() - touched) / 864e5) : p.updated_days,
        progress: milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0,
      });
    });
  }
  const project = (id) => projects().find((p) => p.id === id) || null;
  const pinnedProjects = () => projects().filter((p) => p.pinned);
  const allTags = () => Array.from(new Set(projects().flatMap((p) => p.tags))).sort();

  function toggleMilestone(pid, index) {
    const p = project(pid);
    if (!p || !p.milestones[index]) return null;
    const overrides = get("projectOverrides", {});
    const done = p.milestones.map((m) => m.done);
    done[index] = !done[index];
    overrides[pid] = Object.assign({}, overrides[pid], { done, updatedAt: Date.now() });
    set("projectOverrides", overrides);
    return project(pid);
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
      pinned: false,
      createdAt: Date.now(),
      team: [],
      milestones: D.starterMilestones[r].map((text) => ({ text, done: false })),
    };
    const list = get("projectsCreated", []);
    list.unshift(p);
    set("projectsCreated", list);
    return p.id;
  }

  /* ---------- Network ---------- */
  function net() {
    let n = get("network", null);
    if (!n) { n = clone(D.networkSeed); put("network", n); }
    return n;
  }
  const network = {
    status(id) {
      const n = net();
      if (n.connected.includes(id)) return "connected";
      if (n.sent.includes(id)) return "pending";
      if (n.incoming.includes(id)) return "incoming";
      return "none";
    },
    connect(id) {
      const n = net();
      if (n.incoming.includes(id)) return network.accept(id);
      if (!n.sent.includes(id) && !n.connected.includes(id)) n.sent.push(id);
      set("network", n);
    },
    withdraw(id) { const n = net(); n.sent = without(n.sent, id); set("network", n); },
    accept(id) {
      const n = net();
      n.incoming = without(n.incoming, id);
      if (!n.connected.includes(id)) n.connected.push(id);
      set("network", n);
    },
    ignore(id) { const n = net(); n.incoming = without(n.incoming, id); n.ignored.push(id); set("network", n); },
    incoming() {
      return net().incoming
        .map((id) => {
          const req = D.requests.find((r) => r.from === id) || { note: "", ago: 0 };
          return { person: person(id), note: req.note, at: agoToTs(req.ago) };
        })
        .filter((x) => x.person);
    },
    sent: () => net().sent.map(person).filter(Boolean),
    connections: () => net().connected.map(person).filter(Boolean),
    isJoined: (roomId) => net().rooms.includes(roomId),
    toggleRoom(roomId) {
      const n = net();
      n.rooms = n.rooms.includes(roomId) ? without(n.rooms, roomId) : n.rooms.concat(roomId);
      set("network", n);
      return n.rooms.includes(roomId);
    },
  };

  /* ---------- Message threads ---------- */
  function threadState() {
    let t = get("threads", null);
    if (!t) {
      t = {};
      D.conversations.forEach((c) => {
        t[c.with] = { unread: c.unread, messages: c.messages.map((m) => ({ from: m.from, text: m.text, at: agoToTs(m.ago) })) };
      });
      put("threads", t);
    }
    return t;
  }
  const threads = {
    list() {
      const t = threadState();
      return Object.keys(t)
        .map((id) => {
          const th = t[id];
          const last = th.messages[th.messages.length - 1] || null;
          return { id, person: person(id), last, unread: th.unread || 0, at: last ? last.at : th.createdAt || 0 };
        })
        .filter((x) => x.person)
        .sort((a, b) => b.at - a.at);
    },
    get: (id) => threadState()[id] || { unread: 0, messages: [] },
    /** Make sure a (possibly empty) conversation exists, e.g. from a "Message" button. */
    ensure(id) {
      const t = threadState();
      if (!t[id] && person(id)) { t[id] = { unread: 0, messages: [], createdAt: Date.now() }; set("threads", t); }
    },
    /** Append a message. Pass { unread: true } for a reply that arrives while the chat isn't open. */
    send(id, text, from = "me", opts = {}) {
      const t = threadState();
      t[id] = t[id] || { unread: 0, messages: [] };
      t[id].messages.push({ from, text: String(text), at: Date.now() });
      if (opts.unread) t[id].unread = (t[id].unread || 0) + 1;
      set("threads", t);
    },
    markRead(id) {
      const t = threadState();
      if (t[id] && t[id].unread) { t[id].unread = 0; set("threads", t); }
    },
    unreadCount: () => Object.values(threadState()).filter((th) => th.unread > 0).length,
  };

  /** Clear everything this member changed and start again from the seed. */
  function reset() { Mori.store.clearUser(); emit("reset"); }

  Mori.state = {
    session, person, people: () => D.people.slice(), rooms: () => D.rooms.slice(), ladder: D.ladder,
    profile, saveProfile, syncProfile,
    settings, saveSettings, applyPrefs,
    notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead,
    projects, project, pinnedProjects, allTags, toggleMilestone, createProject,
    network, threads, reset,
  };
})();
