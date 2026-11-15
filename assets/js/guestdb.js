/* ==========================================================================
   Mori: Sandbox — the guest demo's database
   --------------------------------------------------------------------------
   "Explore the demo" on the landing page opens the app as a guest: a sample
   founder with sample members, connections, conversations, projects and
   documents (sample.js). Nothing is sent anywhere: this file stands in for
   Supabase (db.js) with the same API, keeping everything in this browser
   under the guest's own storage keys. The rest of the site can't tell the
   difference, so every page works as it does for a signed-in member.

   Loads right after db.js. If the session is a guest, Mori.db becomes this
   adapter; otherwise it does nothing. Mori.guest.reset() puts the sample
   data back the way it started.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const session = Mori.auth.session();
  const active = !!(session && session.provider === "guest");
  Mori.guest = { active, reset, seed, SEED_VERSION: 1 };
  if (!active) return;

  const S = Mori.sample;
  const ME = session.id;
  const key = (k) => Mori.store.userKey("gdb." + k);
  const read = (k, fallback) => Mori.store.read(key(k), fallback);
  const write = (k, v) => Mori.store.write(key(k), v);
  const user = (k, v) => Mori.store.write(Mori.store.userKey(k), v);
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const soon = (v) => new Promise((r) => setTimeout(() => r(v), 0)); // async, like the real database
  const err = (message, code) => Object.assign(new Error(message), code ? { code } : {});
  const normName = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

  /** Put the sample data in place (first visit, or after a reset). */
  function seed() {
    write("profile", clone(S.persona));
    write("links", clone(S.links));
    write("messages", clone(S.messages));
    write("projects", clone(S.projects));
    write("workspaces", clone(S.workspaces));
    write("docs", clone(S.docs));
    // The pages' own copies, so the first paint already shows the sample data
    user("profile", clone(S.persona));
    user("members", clone(S.members.filter((m) => !m.invisible)));
    user("links", clone(S.links));
    user("messages", clone(S.messages));
    user("projectsRemote", clone(S.projects));
    Object.keys(S.workspaces).forEach((pid) => user("ws." + pid, clone(S.workspaces[pid])));
    user("projectOverrides", { "p-warungpay": { pinned: true } });
    user("settings", { tour: { site: "done", project: "done" } }); // the tours wait in Settings
    const read0 = {};
    S.links.filter((l) => l.from === ME && l.status === "accepted").forEach((l) => { read0["acc:" + l.id] = true; }); // only the two requests are unread
    user("notifRead", read0);
    write("seededAt", Date.now());
    write("seedVersion", Mori.guest.SEED_VERSION);
    const name = [S.persona.firstName, S.persona.lastName].join(" ");
    Mori.auth.updateSession({ name, givenName: S.persona.firstName });
  }
  /** Forget everything the guest did and start the demo again. */
  function reset() {
    Mori.store.clearUser();
    seed();
    location.href = "home.html";
  }
  if (!read("seededAt", 0) || read("seedVersion", 0) !== Mori.guest.SEED_VERSION) seed();

  /* ---------- Tables ---------- */
  const links = () => read("links", []);
  const messages = () => read("messages", []);
  const projects = () => read("projects", []);
  const workspaces = () => read("workspaces", {});
  const docs = () => read("docs", []);
  const members = () => S.members;
  const member = (id) => members().find((m) => m.id === id) || null;
  const visibleMember = (id) => { const m = member(id); return m && !m.invisible ? m : null; };
  const project = (id) => projects().find((p) => p.id === id) || null;
  const onTeam = (p) => p && (p.ownerId === ME || (p.cofounders || []).includes(ME));
  const connected = (id) => links().some((l) => l.status === "accepted" && ((l.from === ME && l.to === id) || (l.to === ME && l.from === id)));
  const saveProject = (p) => write("projects", projects().map((x) => (x.id === p.id ? p : x)));
  const listDoc = (d) => { const out = Object.assign({}, d); delete out.body; return out; };

  Mori.db = {
    enabled: true,
    guest: true,
    client: () => Promise.reject(err("The demo has no sign-in service.")),
    preload() {},
    async signInWithGoogle() { throw err("Leave the demo to sign in with Google."); },
    async user() { return { provider: "guest", id: ME, email: "", name: session.name, picture: "" }; },

    /* ---------- Profile ---------- */
    async fetchProfile() { return soon(Object.assign({ onboarded: true }, clone(read("profile", S.persona)))); },
    async saveProfile(profile) { write("profile", clone(profile)); return soon(); },
    async prefs() { return soon(null); },   // settings stay in this browser
    async savePrefs() { return soon(); },
    async uploadPhoto(blob) { return Mori.ui.blobToDataUrl(blob); },
    async removePhoto() { return soon(); },
    async uploadCv(file) { return soon({ path: "guest/" + file.name, name: file.name }); },
    async cvLink() { throw err("CVs aren’t stored in the demo. Sign in with an invited account to upload yours."); },

    /* ---------- Members and connection requests ---------- */
    async members() { return soon(clone(members().filter((m) => !m.invisible))); },
    async connections() { return soon(clone(links()).sort((a, b) => b.at - a.at)); },
    async findMember(fullName) {
      const q = normName(fullName);
      return soon(clone(members().filter((m) => m.invisible && normName(m.name) === q).map((m) => ({ id: m.id, name: m.name, joinedAt: m.joinedAt, invisible: true, limited: true, sample: true, picture: "", role: null, headline: "", industries: [], languages: [], skills: [], links: [], open: false, reviews: 0 }))));
    },
    async requestConnection(memberId, note) {
      const m = member(memberId);
      if (!m || m.invisible) throw err("new row violates row-level security policy for table \"connections\"", "42501");
      if (links().some((l) => (l.from === ME && l.to === memberId) || (l.to === ME && l.from === memberId))) throw err("duplicate key value violates unique constraint", "23505");
      const l = { id: uid("l-"), from: ME, to: memberId, status: "pending", note: String(note || "").slice(0, 300), at: Date.now(), respondedAt: 0 };
      write("links", links().concat(l));
      return soon(clone(l));
    },
    async answerRequest(linkId, status) {
      const l = links().find((x) => x.id === linkId);
      if (!l || l.to !== ME) return soon(null);
      const next = Object.assign({}, l, { status, respondedAt: Date.now() });
      write("links", links().map((x) => (x.id === linkId ? next : x)));
      return soon(clone(next));
    },
    async deleteConnection(linkId) { write("links", links().filter((x) => x.id !== linkId)); return soon(); },

    /* ---------- Projects ---------- */
    async projects() { return soon(clone(projects().filter(onTeam)).sort((a, b) => b.createdAt - a.createdAt)); },
    async createProject(p, cofounders = []) {
      const now = Date.now();
      const created = { id: uid("p-"), ownerId: ME, name: p.name, focus: p.focus || "", tags: p.tags || [], rung: p.rung || 0, milestones: p.milestones || [], cofounders: [], createdAt: now, updatedAt: now };
      write("projects", [created].concat(projects()));
      const ws = workspaces(); ws[created.id] = {}; write("workspaces", ws);
      if (cofounders.length) created.cofounders = await Mori.db.addCofounders(created.id, cofounders);
      return soon(clone(created));
    },
    async updateProject(id, patch) {
      const p = project(id);
      if (!onTeam(p)) return soon(null);
      const next = Object.assign({}, p, patch, { updatedAt: Date.now() });
      saveProject(next);
      return soon(clone(next));
    },
    async changeColumn(id, column, apply) {
      const p = project(id);
      if (!onTeam(p)) return soon(null);
      const next = Object.assign({}, p, { [column]: apply(clone(p[column])), updatedAt: Date.now() });
      saveProject(next);
      return soon(clone(next));
    },
    async changeTasks(id, apply) { return Mori.db.changeColumn(id, "milestones", apply); },
    async workspace(id) {
      if (!onTeam(project(id))) return soon(null);
      return soon(clone(workspaces()[id] || {}));
    },
    async changeWorkspace(id, apply) {
      if (!onTeam(project(id))) return soon(null);
      const ws = workspaces();
      ws[id] = apply(clone(ws[id] || {}));
      write("workspaces", ws);
      const p = project(id); if (p) saveProject(Object.assign({}, p, { updatedAt: Date.now() }));
      return soon(clone(ws[id]));
    },
    async docs(projectId) {
      if (!onTeam(project(projectId))) return soon([]);
      return soon(clone(docs().filter((d) => d.projectId === projectId).map(listDoc)).sort((a, b) => b.updatedAt - a.updatedAt));
    },
    async doc(id) {
      const d = docs().find((x) => x.id === id);
      return soon(d && onTeam(project(d.projectId)) ? clone(d) : null);
    },
    async createDoc(projectId, { title, body }) {
      if (!onTeam(project(projectId))) throw err("You’re no longer on this project.");
      const now = Date.now();
      const d = { id: uid("d-"), projectId, title: title || "Untitled document", body: body || "", createdBy: ME, updatedBy: ME, createdAt: now, updatedAt: now };
      write("docs", [d].concat(docs()));
      return soon(clone(d));
    },
    async saveDoc(id, patch) {
      const d = docs().find((x) => x.id === id);
      if (!d || !onTeam(project(d.projectId))) return soon(null);
      const next = Object.assign({}, d, patch, { updatedBy: ME, updatedAt: Date.now() });
      write("docs", docs().map((x) => (x.id === id ? next : x)));
      return soon(clone(next));
    },
    async deleteDoc(id) { write("docs", docs().filter((x) => x.id !== id)); return soon(); },
    async deleteProject(id) {
      const p = project(id);
      if (!p || p.ownerId !== ME) throw err("Only the owner can delete a project.");
      write("projects", projects().filter((x) => x.id !== id));
      write("docs", docs().filter((d) => d.projectId !== id));
      const ws = workspaces(); delete ws[id]; write("workspaces", ws);
      return soon();
    },
    async addCofounders(projectId, memberIds) {
      const p = project(projectId);
      if (!p || p.ownerId !== ME) throw err("new row violates row-level security policy for table \"project_members\"", "42501");
      const ok = memberIds.filter((id) => visibleMember(id) && connected(id) && !p.cofounders.includes(id));
      saveProject(Object.assign({}, p, { cofounders: p.cofounders.concat(ok), updatedAt: Date.now() }));
      return soon(ok.slice());
    },
    async removeCofounder(projectId, memberId) {
      const p = project(projectId);
      if (!p || !(p.ownerId === ME || memberId === ME)) throw err("Only the owner can remove teammates.");
      saveProject(Object.assign({}, p, { cofounders: p.cofounders.filter((x) => x !== memberId), updatedAt: Date.now() }));
      return soon();
    },

    /* ---------- Messages ---------- */
    async messages(limit = 500) { return soon(clone(messages()).sort((a, b) => b.at - a.at).slice(0, limit)); },
    async sendMessage(to, body) {
      if (!connected(to)) throw err("You can message people once you’re connected.", "42501");
      const m = { id: uid("x-"), from: ME, to, body: String(body).slice(0, 2000), at: Date.now(), readAt: 0 };
      write("messages", [m].concat(messages()));
      return soon(clone(m));
    },
    async markRead(fromId) {
      const now = Date.now();
      write("messages", messages().map((m) => (m.from === fromId && m.to === ME && !m.readAt ? Object.assign({}, m, { readAt: now }) : m)));
      return soon();
    },

    /* ---------- Live updates: nothing arrives in the demo ---------- */
    async live(handlers) {
      setTimeout(() => { try { if (handlers.status) handlers.status("SUBSCRIBED"); } catch (e) { /* ignore */ } }, 0);
      return () => {};
    },
    linkFromRow: (r) => r,
    messageFromRow: (r) => r,

    /** Leaving the demo forgets everything the guest did. */
    async signOut() { Mori.store.clearUser(); },
  };
})();
