/* ==========================================================================
   Mori: Sandbox — member state
   --------------------------------------------------------------------------
   For Google members the profile, other members, connection requests,
   projects and messages live in Supabase; a local copy keeps pages rendering
   instantly and is refreshed in the background and by live updates. Demo
   accounts keep their profile, projects and settings in this browser.
   Every write dispatches a "mori:change" event (detail.key names what
   changed) so nav badges and open views can refresh. Live events also
   dispatch "mori:live" so the shell can show a toast.
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
  const me = () => session().id;

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
    linkedin: "", links: [], photo: "", cvPath: "", cvName: "", languages: [], headline: "", bio: "", skills: [],
    open: true, openType: "", visibility: "everyone", rating: null, reviews: 0,
    // What the profile shows (age starts hidden, the rest shown)
    show: { age: false, region: true, employment: true, languages: true },
  };
  const SHOW_DEFAULT = PROFILE_BLANK.show;
  const remoteEnabled = () => !!(Mori.db && Mori.db.enabled && session().provider === "google" && Mori.auth.isUuid(session().id));

  function profile() {
    const p = Object.assign({}, PROFILE_BLANK, get("profile", {}));
    if (!p.openType) p.openType = p.role === "specialist" ? "join" : "cofound";
    p.show = Object.assign({}, SHOW_DEFAULT, p.show);
    return p;
  }
  const fullName = (p = profile(), s = session()) => [p.firstName, p.lastName].filter(Boolean).join(" ") || s.name;
  /** You, shaped like a member, for avatars and headers. */
  const self = () => ({ id: me(), name: fullName(), picture: profile().photo || "" });

  /** Save locally, then to Supabase for Google members. Resolves once stored. */
  function saveProfile(patch, opts = {}) {
    set("profile", Object.assign({}, get("profile", {}), patch));
    if (opts.remote === false || !remoteEnabled()) return Promise.resolve();
    const onboarded = typeof opts.onboarded === "boolean" ? opts.onboarded : !!session().onboarded;
    return Mori.db.saveProfile(Object.assign(profile(), { onboarded }));
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
  /**
   * Change your photo: an image Blob (uploaded; demo accounts keep it in this
   * browser), an https URL such as your Google photo, or null for the default icon.
   */
  async function setPhoto(source) {
    const before = profile().photo;
    let photo = "";
    if (source instanceof Blob) photo = remoteEnabled() ? await Mori.db.uploadPhoto(source) : await Mori.ui.blobToDataUrl(source);
    else if (typeof source === "string") photo = source;
    await saveProfile({ photo });
    if (remoteEnabled() && before && before !== photo) Mori.db.removePhoto(before).catch(() => {});
    return photo;
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

  /** Shared refresh helper: one request at a time, reused while fresh unless forced. */
  function refresher(load) {
    let inflight = null;
    let again = null;
    let at = 0;
    const run = (opts = {}) => {
      if (!remoteEnabled()) return Promise.resolve(false);
      if (inflight) {
        if (!opts.force) return inflight;
        // Something changed after the running load started: load once more when it's done.
        if (!again) again = inflight.catch(() => {}).then(() => { again = null; return run({ force: true }); });
        return again;
      }
      if (!opts.force && Date.now() - at < 15000) return Promise.resolve(false);
      inflight = Promise.resolve().then(load).then(() => { at = Date.now(); return true; }).finally(() => { inflight = null; });
      return inflight;
    };
    run.at = () => at;
    return run;
  }

  /* ---------- Network: members who signed up, and connection requests ----------
     Each link is { id, from, to, status: pending|accepted|ignored, note, at }. */
  const network = {
    /** Only Google members have a network; demo accounts stay on this device. */
    available: remoteEnabled,
    members: () => (remoteEnabled() ? get("members", []) : []),
    member: (id) => network.members().find((m) => m.id === id) || null,
    links: () => (remoteEnabled() ? get("links", []) : []),
    refresh: refresher(async () => {
      const [members, links] = await Promise.all([Mori.db.members(), Mori.db.connections()]);
      put("members", members);
      put("links", links);
      emit("network");
    }),
    refreshedAt: () => network.refresh.at(),

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
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
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

  /* ---------- Messages (between connections) ----------
     Each message is { id, from, to, body, at, readAt }; pending/failed mark
     messages still being sent from this browser. */
  const msgs = () => (remoteEnabled() ? get("messages", []) : []);
  const chat = {
    available: remoteEnabled,
    /** The conversation open on screen: its new messages are read straight away. */
    viewing: null,
    refresh: refresher(async () => {
      const list = await Mori.db.messages();
      // Live updates that landed while this was loading are kept: messages newer
      // than anything loaded, and read receipts the loaded copy doesn't have yet.
      const now = new Map(msgs().map((m) => [m.id, m]));
      const ids = new Set(list.map((m) => m.id));
      const newest = list.reduce((t, m) => Math.max(t, m.at), 0);
      const kept = msgs().filter((m) => m.pending || m.failed || (!ids.has(m.id) && m.at > newest));
      const merged = list.map((m) => {
        const cur = now.get(m.id);
        return cur && cur.readAt && !m.readAt ? Object.assign({}, m, { readAt: cur.readAt }) : m;
      });
      set("messages", kept.concat(merged));
    }),
    thread(id) {
      return msgs().filter((m) => (m.from === id && m.to === me()) || (m.to === id && m.from === me())).sort((a, b) => a.at - b.at);
    },
    /** Conversations, newest first: { id, person, last, unread, at }. */
    threads() {
      const byOther = new Map();
      msgs().forEach((m) => {
        const other = m.from === me() ? m.to : m.from;
        const t = byOther.get(other) || { id: other, last: null, unread: 0 };
        if (!t.last || m.at > t.last.at) t.last = m;
        if (m.to === me() && !m.readAt) t.unread++;
        byOther.set(other, t);
      });
      return Array.from(byOther.values())
        .map((t) => Object.assign(t, { person: network.member(t.id), at: t.last ? t.last.at : 0 }))
        .filter((t) => t.person)
        .sort((a, b) => b.at - a.at);
    },
    unreadCount: () => chat.threads().filter((t) => t.unread > 0).length,

    async send(id, body) {
      const text = String(body || "").trim().slice(0, 2000);
      if (!text) return null;
      const tmp = { id: "tmp-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), from: me(), to: id, body: text, at: Date.now(), readAt: 0, pending: true };
      set("messages", [tmp].concat(msgs()));
      try {
        const saved = await Mori.db.sendMessage(id, text);
        set("messages", [saved].concat(msgs().filter((m) => m.id !== tmp.id && m.id !== saved.id)));
        return saved;
      } catch (err) {
        set("messages", msgs().map((m) => (m.id === tmp.id ? Object.assign({}, m, { pending: false, failed: true }) : m)));
        throw err;
      }
    },
    /** Try a failed message again. */
    retry(tmpId) {
      const m = msgs().find((x) => x.id === tmpId);
      if (!m) return Promise.resolve(null);
      set("messages", msgs().filter((x) => x.id !== tmpId));
      return chat.send(m.to, m.body);
    },
    discard(tmpId) { set("messages", msgs().filter((x) => x.id !== tmpId)); },
    /** Mark a conversation as read, here and in Supabase. */
    markRead(id) {
      if (!msgs().some((m) => m.from === id && m.to === me() && !m.readAt)) return;
      set("messages", msgs().map((m) => (m.from === id && m.to === me() && !m.readAt ? Object.assign({}, m, { readAt: Date.now() }) : m)));
      Mori.db.markRead(id).catch(() => { /* retried next time the conversation opens */ });
    },
    receive(m) { if (!msgs().some((x) => x.id === m.id)) set("messages", [m].concat(msgs())); },
    receipt(m) { set("messages", msgs().map((x) => (x.id === m.id ? Object.assign({}, x, { readAt: m.readAt }) : x))); },
  };

  /* ---------- Projects ----------
     Google members: stored in Supabase and shared with co-founders (a local
     copy renders instantly). Demo accounts: kept in this browser.
     Pins are a personal choice, so they stay in this browser either way. */
  const remoteList = () => get("projectsRemote", []);
  const localList = () => get("projectsCreated", []);

  function projects() {
    const overrides = get("projectOverrides", {});
    const remote = remoteEnabled();
    const list = remote ? remoteList() : localList().map((p) => Object.assign({ ownerId: me(), cofounders: [] }, p));
    return list.map((p) => {
      const o = overrides[p.id] || {};
      const milestones = remote ? p.milestones : p.milestones.map((m, i) => ({ text: m.text, done: o.done && typeof o.done[i] === "boolean" ? o.done[i] : !!m.done }));
      const touched = remote ? p.updatedAt || p.createdAt : o.updatedAt || p.createdAt;
      const doneCount = milestones.filter((m) => m.done).length;
      return Object.assign({}, p, {
        milestones,
        doneCount,
        owner: p.ownerId === me(),
        cofounders: p.cofounders || [],
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
  const patchRemote = (pid, patch) => set("projectsRemote", remoteList().map((p) => (p.id === pid ? Object.assign({}, p, patch) : p)));

  /** Projects declared in this browser before projects moved to Supabase: upload them once. */
  async function importLocalProjects() {
    const local = localList();
    if (!local.length) return;
    const overrides = get("projectOverrides", {});
    const keep = [];
    for (const p of local.slice().reverse()) { // oldest first, so the order stays the same
      const o = overrides[p.id] || {};
      try {
        const milestones = p.milestones.map((m, i) => ({ text: m.text, done: o.done && typeof o.done[i] === "boolean" ? o.done[i] : !!m.done }));
        const created = await Mori.db.createProject({ name: p.name, focus: p.focus, tags: p.tags, rung: p.rung, milestones });
        const pinned = typeof o.pinned === "boolean" ? o.pinned : !!p.pinned;
        delete overrides[p.id];
        if (pinned) overrides[created.id] = { pinned: true };
      } catch (err) {
        keep.unshift(p);
      }
    }
    put("projectOverrides", overrides);
    put("projectsCreated", keep);
  }
  const refreshProjects = refresher(async () => {
    await importLocalProjects();
    set("projectsRemote", await Mori.db.projects());
  });

  /** Declare a project; founders can add co-founders (their connections) straight away. */
  async function createProject({ name, focus, tags, rung, cofounders = [] }) {
    const r = Math.max(0, Math.min(5, Number(rung) || 0));
    const next = D.ladder[Math.min(r + 1, 5)];
    const data = {
      name: String(name).trim(),
      focus: String(focus || "").trim() || `Working toward ${next.stage}`,
      tags: tags && tags.length ? tags : ["Idea"],
      rung: r,
      milestones: D.starterMilestones[r].map((text) => ({ text, done: false })),
    };
    const pinFirst = pinnedProjects().length === 0; // the first project shows on the homepage
    let id;
    if (remoteEnabled()) {
      const created = await Mori.db.createProject(data);
      set("projectsRemote", [created].concat(remoteList()));
      id = created.id;
      if (pinFirst) override(id, { pinned: true });
      if (cofounders.length) {
        try {
          await addCofounders(id, cofounders);
        } catch (err) {
          err.projectId = id;
          err.message = "Project created, but the co-founders couldn’t be added: " + err.message;
          throw err;
        }
      }
    } else {
      const p = Object.assign({ id: "c" + Date.now().toString(36), owner: true, createdAt: Date.now(), team: [] }, data);
      set("projectsCreated", [p].concat(localList()));
      id = p.id;
      if (pinFirst) override(id, { pinned: true });
    }
    return id;
  }

  let saveSeq = 0;
  /**
   * Tick or untick a milestone. Returns the updated project straight away;
   * `saved` settles once Supabase has it (it rejects, and the tick is undone, if saving fails).
   */
  function toggleMilestone(pid, index) {
    const p = project(pid);
    if (!p || !p.milestones[index]) return { project: null, saved: Promise.resolve() };
    const milestones = p.milestones.map((m, i) => ({ text: m.text, done: i === index ? !m.done : m.done }));
    if (!remoteEnabled()) {
      override(pid, { done: milestones.map((m) => m.done), updatedAt: Date.now() });
      return { project: project(pid), saved: Promise.resolve() };
    }
    patchRemote(pid, { milestones, updatedAt: Date.now() });
    const seq = ++saveSeq;
    const saved = Mori.db.updateProject(pid, { milestones }).then(
      (row) => { if (row && seq === saveSeq) patchRemote(pid, row); },
      (err) => { if (seq === saveSeq) patchRemote(pid, { milestones: p.milestones }); throw err; }
    );
    return { project: project(pid), saved };
  }
  function togglePin(pid) {
    const p = project(pid);
    return p ? override(pid, { pinned: !p.pinned }) : null;
  }
  async function addCofounders(pid, ids) {
    const added = await Mori.db.addCofounders(pid, ids);
    const p = remoteList().find((x) => x.id === pid);
    if (p) patchRemote(pid, { cofounders: Array.from(new Set(p.cofounders.concat(added))) });
    return added;
  }
  async function removeCofounder(pid, memberId) {
    await Mori.db.removeCofounder(pid, memberId);
    const p = remoteList().find((x) => x.id === pid);
    if (memberId === me()) set("projectsRemote", remoteList().filter((x) => x.id !== pid)); // you left
    else if (p) patchRemote(pid, { cofounders: p.cofounders.filter((x) => x !== memberId) });
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

  /* ---------- Live updates (Supabase Realtime) ---------- */
  const announce = (detail) => document.dispatchEvent(new CustomEvent("mori:live", { detail }));
  let stopLive = null;
  let wasDown = false;
  const live = {
    state: "off",
    async start() {
      if (stopLive || live.state === "starting" || !remoteEnabled()) return;
      live.state = "starting";
      try {
        stopLive = await Mori.db.live({
          connection: onConnection,
          message: (payload) => onMessage(Mori.db.messageFromRow(payload.new)),
          messageRead: (payload) => chat.receipt(Mori.db.messageFromRow(payload.new)),
          status: (state) => {
            live.state = state;
            if (state === "SUBSCRIBED") {
              // Catch up on anything that happened while the connection was down.
              if (wasDown) { network.refresh({ force: true }).catch(() => {}); chat.refresh({ force: true }).catch(() => {}); }
              wasDown = false;
            } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
              wasDown = true;
            }
            emit("live");
          },
        });
      } catch (err) {
        live.state = "off";
      }
    },
  };

  async function onConnection(payload) {
    const row = payload && payload.new && payload.new.id ? Mori.db.linkFromRow(payload.new) : null;
    const before = row ? (network.links().find((l) => l.id === row.id) || {}).status : null;
    await network.refresh({ force: true }).catch(() => {});
    if (!row) return; // a request was withdrawn or a connection removed: the refresh covers it
    if (payload.eventType === "INSERT" && row.to === me() && row.status === "pending") {
      announce({ kind: "request", person: network.member(row.from), note: row.note });
    } else if (row.from === me() && row.status === "accepted" && before !== "accepted") {
      announce({ kind: "accepted", person: network.member(row.to) });
    }
  }
  async function onMessage(m) {
    if (!network.member(m.from)) await network.refresh({ force: true }).catch(() => {});
    chat.receive(m);
    announce({ kind: "message", person: network.member(m.from), message: m });
  }

  /** Forget what this browser cached about other members (on sign-out). */
  function forgetPrivate() {
    ["members", "links", "messages", "projectsRemote"].forEach((k) => Mori.store.remove(Mori.store.userKey(k)));
  }

  /** Clear everything stored in this browser for the member and start again. */
  function reset() { Mori.store.clearUser(); emit("reset"); }

  Mori.state = {
    session, ladder: D.ladder,
    profile, saveProfile, syncProfile, setPhoto, me: self, fullName,
    settings, saveSettings, applyPrefs,
    notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead,
    projects, project, pinnedProjects, allTags, toggleMilestone, togglePin, createProject, refreshProjects, addCofounders, removeCofounder,
    network, chat, live, forgetPrivate, reset,
  };
})();
