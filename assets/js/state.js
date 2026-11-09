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
    firstName: "", lastName: "", age: null, birthDate: "", region: "", role: null, specialty: "", experience: "", employment: "", industries: [],
    linkedin: "", links: [], photo: "", cover: "", cvPath: "", cvName: "", languages: [], headline: "", bio: "", skills: [],
    open: true, openType: "", visibility: "everyone", rating: null, reviews: 0,
    // What the profile shows (age starts hidden, the rest shown)
    show: { age: false, region: true, employment: true, languages: true },
    invisible: false,               // hidden from the MORI Network
  };
  const SHOW_DEFAULT = PROFILE_BLANK.show;
  const remoteEnabled = () => !!(Mori.db && Mori.db.enabled && session().provider === "google" && Mori.auth.isUuid(session().id));

  function profile() {
    const p = Object.assign({}, PROFILE_BLANK, get("profile", {}));
    if (!p.openType) p.openType = p.role === "specialist" ? "join" : "cofound";
    p.show = Object.assign({}, SHOW_DEFAULT, p.show);
    if (p.birthDate) p.age = ageOn(p.birthDate);
    return p;
  }
  /** Age in whole years on a date (today by default) from "YYYY-MM-DD". */
  function ageOn(birthDate, on = new Date()) {
    const [y, m, d] = String(birthDate).split("-").map(Number);
    if (!y || !m || !d) return null;
    let age = on.getFullYear() - y;
    if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age--;
    return age;
  }
  /** Is it their birthday today? */
  const isBirthday = (p = profile(), on = new Date()) => {
    const [, m, d] = String(p.birthDate || "").split("-").map(Number);
    return !!m && on.getMonth() + 1 === m && on.getDate() === d;
  };
  /** Has the member answered the current sign-up questions? */
  const profileComplete = (p = profile()) => !!(p.birthDate && p.region && (p.role !== "specialist" || p.specialty));
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
  /** Change your profile banner: an image Blob, or null for the default. */
  async function setCover(source) {
    const before = profile().cover;
    let cover = "";
    if (source instanceof Blob) cover = remoteEnabled() ? await Mori.db.uploadPhoto(source, "cover-") : await Mori.ui.blobToDataUrl(source);
    await saveProfile({ cover });
    if (remoteEnabled() && before && before !== cover) Mori.db.removePhoto(before).catch(() => {});
    return cover;
  }

  /* ---------- Settings ---------- */
  const SETTINGS_DEFAULTS = {
    motion: "system",            // system | full | reduced
    startPage: "home.html",
    showRecord: true,            // show milestone record on the profile
    projectStart: "mainframe",   // a project opens on: mainframe | tasks
    projectSidebar: true,        // the planner's tools sidebar is shown
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
    touchPref("settings");
  }

  /* ---------- Synced across devices: settings, pinned projects, the theme ----------
     Kept in this browser as before, and on the member's account (profiles.prefs)
     for Google members. Each part carries the time it last changed; whichever
     copy is newer wins, part by part, so a change on the phone shows on the
     laptop the next time a page opens or comes back into view. */
  const PREF_PARTS = ["settings", "pins", "theme"];
  const prefTimes = () => Object.assign({}, get("prefTimes", {}));
  let prefTimer = 0;
  function touchPref(part) {
    const t = prefTimes();
    t[part] = Date.now();
    put("prefTimes", t);
    if (!remoteEnabled()) return;
    clearTimeout(prefTimer);
    prefTimer = setTimeout(() => syncPrefs({ force: true }).catch(() => {}), 800);
  }
  function localPrefs() {
    const overrides = get("projectOverrides", {});
    const pins = {};
    Object.keys(overrides).forEach((id) => { if (typeof overrides[id].pinned === "boolean") pins[id] = overrides[id].pinned; });
    return { settings: get("settings", {}), pins, theme: Mori.store.read("mori.theme", "light") === "dark" ? "dark" : "light", read: readIds(), t: prefTimes() };
  }
  /** Notifications marked read here (the latest 300). */
  const readIds = () => Object.keys(get("notifRead", {})).slice(-300);
  /** Take the parts of `remote` that are newer than this browser's. */
  function takePrefs(remote) {
    const rt = (remote && remote.t) || {};
    const lt = prefTimes();
    let took = false;
    // Read notifications: read on any device means read everywhere (they never go back to unread).
    if (Array.isArray(remote.read)) {
      const read = get("notifRead", {});
      const add = remote.read.filter((id) => typeof id === "string" && !read[id]);
      if (add.length) { add.forEach((id) => { read[id] = true; }); set("notifRead", read); took = true; }
    }
    if (remote.settings && typeof remote.settings === "object" && (rt.settings || 0) > (lt.settings || 0)) {
      set("settings", remote.settings);
      applyPrefs();
      lt.settings = rt.settings;
      took = true;
    }
    if (remote.pins && typeof remote.pins === "object" && ((rt.pins || 0) > (lt.pins || 0) || (!rt.pins && !lt.pins))) {
      // Pins made before syncing existed carry no time on either side: the first
      // sync merges them (nothing pinned on any device is lost), then stamps them.
      const overrides = get("projectOverrides", {});
      const pins = Object.assign({}, remote.pins);
      const legacy = !lt.pins;
      if (legacy) Object.keys(overrides).forEach((id) => { if (overrides[id].pinned === true) pins[id] = true; });
      Object.keys(overrides).forEach((id) => { if (typeof overrides[id].pinned === "boolean" && !(id in pins)) overrides[id] = Object.assign({}, overrides[id], { pinned: false }); });
      Object.keys(pins).forEach((id) => { overrides[id] = Object.assign({}, overrides[id], { pinned: !!pins[id] }); });
      lt.pins = legacy ? Date.now() : rt.pins; // merged here: newer than the account's copy, so it's saved back
      put("prefTimes", lt);
      set("projectOverrides", overrides);
      took = true;
    } else if (!remote.pins && !lt.pins && Object.values(get("projectOverrides", {})).some((o) => typeof o.pinned === "boolean")) {
      lt.pins = Date.now(); // pins from before syncing, and none on the account yet: save them
    }
    if ((remote.theme === "dark" || remote.theme === "light") && (rt.theme || 0) > (lt.theme || 0)) {
      lt.theme = rt.theme;
      put("prefTimes", lt);
      const dark = remote.theme === "dark";
      if (dark !== (document.documentElement.getAttribute("data-theme") === "dark")) {
        if (Mori.ui && Mori.ui.setTheme) Mori.ui.setTheme(remote.theme, true, { synced: true });
        else Mori.store.write("mori.theme", remote.theme);
      } else Mori.store.write("mori.theme", remote.theme);
      took = true;
    }
    put("prefTimes", lt);
    return took;
  }
  let prefsAt = 0;
  let prefsInflight = null;
  /** Bring in newer settings, pins and theme from the account, then save anything newer here. */
  function syncPrefs({ force = false } = {}) {
    if (!remoteEnabled()) return Promise.resolve(false);
    if (prefsInflight) return force ? prefsInflight.then(() => syncPrefs({ force: true })) : prefsInflight;
    if (!force && Date.now() - prefsAt < 4000) return Promise.resolve(false);
    prefsInflight = (async () => {
      const remote = await Mori.db.prefs();
      if (remote === null) return false; // no profile row yet (onboarding saves it)
      const took = takePrefs(remote);
      const mine = localPrefs();
      const rt = remote.t || {};
      const theirsRead = new Set(Array.isArray(remote.read) ? remote.read : []);
      const newRead = mine.read.some((id) => !theirsRead.has(id));
      if (newRead || PREF_PARTS.some((k) => (mine.t[k] || 0) > (rt[k] || 0))) await Mori.db.savePrefs(mine);
      prefsAt = Date.now();
      return took;
    })().catch((err) => {
      if (!(err && (err.code === "42703" || err.code === "PGRST204"))) throw err; // no prefs column yet: stay on this device
      return false;
    }).finally(() => { prefsInflight = null; });
    return prefsInflight;
  }
  function applyPrefs() {
    const r = document.documentElement;
    const s = settings();
    if (s.motion === "system") r.removeAttribute("data-motion");
    else r.setAttribute("data-motion", s.motion);
    r.removeAttribute("data-aura"); // an old setting: the background no longer moves
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
  const foundMembers = new Map(); // invisible members found by full name
  const network = {
    /** Only Google members have a network; demo accounts stay on this device. */
    available: remoteEnabled,
    members: () => (remoteEnabled() ? get("members", []) : []),
    member: (id) => network.members().find((m) => m.id === id) || foundMembers.get(id) || null,
    /** Invisible members someone looked up by full name (kept for this page only). */
    remember(list) { (list || []).forEach((m) => foundMembers.set(m.id, m)); },
    found: () => Array.from(foundMembers.values()),
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
      const who = network.member(id);
      const invisibleError = () => new Error(`${who ? who.name : "This member"} is invisible on the MORI Network, so you can’t connect.`);
      if (who && who.invisible) throw invisibleError();
      // Shown as sent straight away; the database confirms it a moment later.
      const tmp = { id: "tmp-" + Date.now().toString(36), from: me(), to: id, status: "pending", note: String(note || ""), at: Date.now(), respondedAt: 0, pending: true };
      set("links", network.links().concat(tmp));
      const withoutTmp = () => network.links().filter((l) => l.id !== tmp.id);
      try {
        const link = await Mori.db.requestConnection(id, note);
        set("links", withoutTmp().concat(link));
        return link;
      } catch (err) {
        set("links", withoutTmp());
        if (err.code === "42501") throw invisibleError(); // turned invisible since this page loaded
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

  /* Accept / ignore / withdraw / remove show at once and are undone if saving fails. */
  async function answer(id, status) {
    const l = network.link(id);
    if (!l) return null;
    set("links", network.links().map((x) => (x.id === l.id ? Object.assign({}, x, { status, respondedAt: Date.now() }) : x)));
    let link;
    try {
      link = await Mori.db.answerRequest(l.id, status);
    } catch (err) {
      set("links", network.links().map((x) => (x.id === l.id ? l : x)));
      throw err;
    }
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
    set("links", network.links().filter((x) => x.id !== l.id));
    try {
      await Mori.db.deleteConnection(l.id);
    } catch (err) {
      if (!network.links().some((x) => x.id === l.id)) set("links", network.links().concat(l));
      throw err;
    }
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
     A project is a planner: a board of tasks the team shares, and its rung on
     the milestone ladder. Google members: stored in Supabase and shared with
     co-founders (a local copy renders instantly). Demo accounts: kept in this
     browser. Pins are a personal choice, so they stay in this browser either way.
     Tasks are stored in the project's `milestones` list (up to 20), each
     { id, text, status: todo|doing|done, done, assignee, due: "YYYY-MM-DD" }. */
  const TASK_STATUSES = ["todo", "doing", "done"];
  const MAX_TASKS = 100;
  const remoteList = () => get("projectsRemote", []);
  const localList = () => get("projectsCreated", []);
  let taskSeq = 0;
  const taskId = () => "k" + Date.now().toString(36) + (taskSeq++).toString(36) + Math.random().toString(36).slice(2, 5);
  const newTask = (text, extra) => Object.assign({ id: taskId(), text: String(text).trim().slice(0, 200), status: "todo", done: false, assignee: null, due: null }, extra);

  /** A stored task (or an older { text, done } milestone) in today's shape. */
  function toTask(m, i) {
    const t = m && typeof m === "object" ? m : {};
    const status = TASK_STATUSES.includes(t.status) ? t.status : t.done ? "done" : "todo";
    return {
      id: typeof t.id === "string" && t.id ? t.id.slice(0, 40) : "t" + i,
      text: String(t.text || "").slice(0, 200),
      status,
      done: status === "done",
      assignee: typeof t.assignee === "string" && t.assignee ? t.assignee : null,
      due: typeof t.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : null,
    };
  }
  function toTasks(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).map(toTask).map((t, i) => {
      if (seen.has(t.id)) t.id += "-" + i;
      seen.add(t.id);
      return t;
    });
  }
  /** What's stored: the same, without empty fields. */
  const stored = (tasks) => tasks.map((t) => Object.fromEntries(Object.entries(t).filter(([, v]) => v != null)));
  /** A demo project's tasks, including ticks made before tasks had a status. */
  const localTasks = (p, o) => toTasks((p.milestones || []).map((m, i) => (o.done && typeof o.done[i] === "boolean"
    ? Object.assign({}, m, { done: o.done[i], status: o.done[i] ? "done" : m && m.status === "done" ? "todo" : m && m.status })
    : m)));

  function projects() {
    const overrides = get("projectOverrides", {});
    const remote = remoteEnabled();
    const list = remote ? remoteList() : localList().map((p) => Object.assign({ ownerId: me(), cofounders: [] }, p));
    return list.map((p) => {
      const o = overrides[p.id] || {};
      const tasks = remote ? toTasks(p.milestones) : localTasks(p, o);
      const touched = remote ? p.updatedAt || p.createdAt : Math.max(o.updatedAt || 0, p.updatedAt || 0) || p.createdAt;
      const doneCount = tasks.filter((t) => t.done).length;
      const out = Object.assign({}, p, {
        tasks,
        doneCount,
        owner: p.ownerId === me(),
        cofounders: p.cofounders || [],
        pinned: typeof o.pinned === "boolean" ? o.pinned : !!p.pinned,
        updated_days: touched ? Math.floor((Date.now() - touched) / 864e5) : 0,
        progress: tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0, // share of tasks done
      });
      delete out.milestones;
      out.overall = ladderProgress(out).pct; // the project's overall progress, as the planner shows it
      return out;
    });
  }
  /**
   * Overall progress: the rung reached on the milestone ladder plus the share
   * of the next rung's proof steps that are done (rung 1 with one of three
   * steps done is 27%). `ws` is the project's workspace; by default the copy
   * last seen in this browser.
   */
  function ladderProgress(p, ws) {
    const w = ws || get("ws." + p.id, {}) || {};
    const ticked = (w.ladder && w.ladder.done) || {};
    const interviews = w.interviews && Array.isArray(w.interviews.items) ? w.interviews.items.length : 0;
    const rung = Math.max(0, Math.min(5, Number(p.rung) || 0));
    if (rung >= 5) return { pct: 100, rung, next: null, done: 0, total: 0, flags: [] };
    const next = rung + 1;
    const steps = (D.planner && D.planner.ladderSteps[next]) || [];
    // Rung 1's first step ticks itself once eight interviews are logged.
    const flags = steps.map((_, i) => !!ticked[`${next}:${i}`] || (next === 1 && i === 0 && interviews >= 8));
    const done = flags.filter(Boolean).length;
    return { pct: Math.round(((rung + (steps.length ? done / steps.length : 0)) / 5) * 100), rung, next, done, total: steps.length, flags };
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
  /** Change a demo project in this browser. */
  function patchLocal(pid, patch) {
    const overrides = get("projectOverrides", {});
    if (patch.milestones && overrides[pid] && overrides[pid].done) { delete overrides[pid].done; put("projectOverrides", overrides); }
    set("projectsCreated", localList().map((p) => (p.id === pid ? Object.assign({}, p, patch, { updatedAt: Date.now() }) : p)));
  }

  /** Projects declared in this browser before projects moved to Supabase: upload them once. */
  async function importLocalProjects() {
    const local = localList();
    if (!local.length) return;
    const overrides = get("projectOverrides", {});
    const keep = [];
    for (const p of local.slice().reverse()) { // oldest first, so the order stays the same
      const o = overrides[p.id] || {};
      try {
        const created = await Mori.db.createProject({ name: p.name, focus: p.focus, tags: p.tags, rung: p.rung, milestones: stored(localTasks(p, o)) });
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
  /* A save in flight, or one that finished after a refresh was sent, is newer
     than what that refresh brings back: keep the copy here for those projects. */
  const saving = {};
  const savedAt = {};
  const refreshProjects = refresher(async () => {
    await importLocalProjects();
    const sent = Date.now();
    const rows = await Mori.db.projects();
    const here = remoteList();
    set("projectsRemote", rows.map((r) => (saving[r.id] || (savedAt[r.id] || 0) >= sent ? here.find((x) => x.id === r.id) || r : r)));
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
      milestones: stored(D.starterTasks[r].map((text) => newTask(text))),
    };
    const pinFirst = pinnedProjects().length === 0; // the first project shows on the homepage
    let id;
    if (remoteEnabled()) {
      const created = await Mori.db.createProject(data);
      set("projectsRemote", [created].concat(remoteList()));
      id = created.id;
      if (pinFirst) { override(id, { pinned: true }); touchPref("pins"); }
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
      if (pinFirst) { override(id, { pinned: true }); touchPref("pins"); }
    }
    return id;
  }

  /* Saves to one project run one after another, so each starts from the last. */
  const queues = {};
  const queue = (pid, job) => (queues[pid] = (queues[pid] || Promise.resolve()).catch(() => {}).then(job));
  let saveSeq = 0;
  /**
   * Save a change to a project. The copy here changes straight away (the
   * updated project is returned at once); `saved` settles once Supabase has it
   * and rejects, undoing the change, if saving fails.
   *   remotely(pid): the request that stores it.
   */
  function commit(pid, patch, remotely) {
    const p = project(pid);
    if (!p) return { project: null, saved: Promise.resolve(null) };
    if (!remoteEnabled()) {
      patchLocal(pid, patch);
      return { project: project(pid), saved: Promise.resolve(project(pid)) };
    }
    const before = remoteList().find((x) => x.id === pid);
    const undo = {};
    Object.keys(patch).forEach((k) => { undo[k] = before[k]; });
    undo.updatedAt = before.updatedAt;
    patchRemote(pid, Object.assign({}, patch, { updatedAt: Date.now() }));
    const seq = ++saveSeq;
    saving[pid] = (saving[pid] || 0) + 1;
    const done = () => { saving[pid] -= 1; savedAt[pid] = Date.now(); };
    const saved = queue(pid, remotely).then(
      (row) => { done(); if (row && seq === saveSeq) patchRemote(pid, row); return project(pid); },
      (err) => {
        done();
        if (seq === saveSeq) { patchRemote(pid, undo); refreshProjects({ force: true }).catch(() => {}); }
        throw err;
      }
    );
    return { project: project(pid), saved };
  }

  /**
   * Change a project's tasks: `change(tasks)` returns the new list. It runs on
   * the copy here at once and again on the latest copy in Supabase, so a
   * co-founder's edits made in the meantime aren't overwritten.
   */
  function changeTasks(pid, change) {
    const p = project(pid);
    if (!p) return { project: null, saved: Promise.resolve(null) };
    const apply = (list) => {
      const next = toTasks(change(toTasks(list).map((t) => Object.assign({}, t))));
      if (next.length > MAX_TASKS) throw Object.assign(new Error(`A project holds up to ${MAX_TASKS} tasks for now.`), { code: "too-many" });
      return stored(next);
    };
    let milestones;
    try { milestones = apply(p.tasks); } catch (err) { return { project: p, saved: Promise.reject(err) }; }
    return commit(pid, { milestones }, () => Mori.db.changeTasks(pid, apply));
  }
  const addTask = (pid, text, extra) => {
    const t = newTask(text, extra);
    return Object.assign(changeTasks(pid, (ts) => ts.concat([t])), { task: t });
  };
  const updateTask = (pid, id, patch) => changeTasks(pid, (ts) => ts.map((t) => (t.id === id ? Object.assign(t, patch, patch.status ? { done: patch.status === "done" } : {}) : t)));
  const removeTask = (pid, id) => changeTasks(pid, (ts) => ts.filter((t) => t.id !== id));
  /** Move a task to a column, before the task `beforeId` (or to the end). */
  const moveTask = (pid, id, status, beforeId) => changeTasks(pid, (ts) => {
    const t = ts.find((x) => x.id === id);
    if (!t) return ts;
    const rest = ts.filter((x) => x.id !== id);
    Object.assign(t, { status, done: status === "done" });
    const at = beforeId ? rest.findIndex((x) => x.id === beforeId) : -1;
    if (at < 0) {
      // the end of that column: just after its last task
      let last = -1;
      rest.forEach((x, i) => { if (x.status === status) last = i; });
      rest.splice(last < 0 ? rest.length : last + 1, 0, t);
    } else rest.splice(at, 0, t);
    return rest;
  });
  /** Tick or untick a task (the tick box on a task card). */
  const toggleTask = (pid, id) => {
    const t = (project(pid) || { tasks: [] }).tasks.find((x) => x.id === id);
    return t ? updateTask(pid, id, { status: t.done ? "todo" : "done" }) : { project: null, saved: Promise.resolve(null) };
  };

  /** Change a project's name, focus, tags or rung. */
  function updateProject(pid, patch) {
    const clean = {};
    if (typeof patch.name === "string" && patch.name.trim()) clean.name = patch.name.trim().slice(0, 60);
    if (typeof patch.focus === "string") clean.focus = patch.focus.trim().slice(0, 80);
    if (Array.isArray(patch.tags)) clean.tags = patch.tags.map((t) => String(t).trim().slice(0, 20)).filter(Boolean).slice(0, 10);
    if (patch.rung != null) clean.rung = Math.max(0, Math.min(5, Number(patch.rung) || 0));
    return commit(pid, clean, () => Mori.db.updateProject(pid, clean));
  }
  function togglePin(pid) {
    const p = project(pid);
    if (!p) return null;
    const u = override(pid, { pinned: !p.pinned });
    touchPref("pins");
    return u;
  }
  /** Delete a project you own, with its tasks, for everyone on the team. */
  async function deleteProject(pid) {
    if (remoteEnabled()) {
      await queue(pid, () => Mori.db.deleteProject(pid));
      set("projectsRemote", remoteList().filter((x) => x.id !== pid));
    } else {
      set("projectsCreated", localList().filter((x) => x.id !== pid));
    }
    const overrides = get("projectOverrides", {});
    if (overrides[pid]) { delete overrides[pid]; put("projectOverrides", overrides); }
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
    else if (p) {
      // Their tasks go back to the team.
      patchRemote(pid, { cofounders: p.cofounders.filter((x) => x !== memberId) });
      if (toTasks(p.milestones).some((t) => t.assignee === memberId)) {
        changeTasks(pid, (ts) => ts.map((t) => (t.assignee === memberId ? Object.assign(t, { assignee: null }) : t))).saved.catch(() => {});
      }
    }
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
  function markNotificationRead(id) { const r = get("notifRead", {}); r[id] = true; set("notifRead", r); touchPref("read"); }
  function markAllNotificationsRead() { const r = get("notifRead", {}); notifications().forEach((n) => { r[n.id] = true; }); set("notifRead", r); touchPref("read"); }

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
    profile, saveProfile, syncProfile, setPhoto, setCover, me: self, fullName, ageOn, isBirthday, profileComplete,
    settings, saveSettings, applyPrefs, syncPrefs, touchPref,
    notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead,
    projects, project, pinnedProjects, allTags, togglePin, createProject, refreshProjects, addCofounders, removeCofounder,
    updateProject, deleteProject, changeTasks, addTask, updateTask, removeTask, moveTask, toggleTask, MAX_TASKS, ladderProgress,
    network, chat, live, forgetPrivate, reset,
  };
})();
