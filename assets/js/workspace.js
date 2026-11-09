/* ==========================================================================
   Mori: Sandbox — project workspace
   --------------------------------------------------------------------------
   Everything a project's planner keeps besides its tasks: the Mainframe's
   widget layout, the data behind each tool (finance, marketing, GTM
   checklist, funding, metrics, interviews, lean canvas, ladder proof, roles
   the team needs) and the team's documents.
   Google members: stored in Supabase and shared with the team, with a copy
   in this browser so pages render at once. Demo accounts: kept in this
   browser. Every change applies here straight away and again to the latest
   stored copy, so a teammate's edits made meanwhile aren't overwritten.
   Dispatches "mori:change" with key "workspace" or "docs".
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;
  const S = Mori.state;
  const P = Mori.data.planner;

  const emit = (key) => document.dispatchEvent(new CustomEvent("mori:change", { detail: { key } }));
  const read = (name, fallback) => Mori.store.read(Mori.store.userKey(name), fallback);
  const write = (name, value) => Mori.store.write(Mori.store.userKey(name), value);
  const shared = () => S.network.available();
  const me = () => S.session().id;
  // If the database doesn't have the workspace column or the documents table, keep them in this browser.
  const local = { ws: false, docs: false };
  const missing = (err) => !!err && (["42703", "42P01", "PGRST204", "PGRST205"].includes(err.code) || (/workspace|project_docs/.test(err.message || "") && /column|relation|table|schema cache/i.test(err.message || "")));

  let seq = 0;
  const uid = (prefix = "i") => prefix + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const arr = (v) => (Array.isArray(v) ? v : []);
  const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  const int = (v, lo, hi, fallback) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback; };
  const pad = (n) => String(n).padStart(2, "0");
  const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /* ---------- Shape ---------- */
  const MAX_ROWS = 6;
  function widget(w) {
    const x = int(w.x, 0, 2, 0);
    const width = int(w.w, 1, 3 - x, 1);
    return { id: String(w.id || uid("w")), type: String(w.type || "note"), variant: String(w.variant || ""), x, y: int(w.y, 0, 400, 0), w: width, h: int(w.h, 1, MAX_ROWS, 1), opts: obj(w.opts) };
  }
  /** A workspace in today's shape, whatever was stored. */
  function normalize(raw) {
    const w = obj(raw);
    const fin = obj(w.finance);
    return {
      layout: arr(w.layout).filter((x) => x && typeof x === "object").map(widget),
      roles: arr(w.roles),
      finance: { currency: P.currencies[fin.currency] ? fin.currency : "IDR", start: Number(fin.start) || 0, entries: arr(fin.entries) },
      marketing: { campaigns: arr(obj(w.marketing).campaigns) },
      gtm: { done: obj(obj(w.gtm).done), custom: arr(obj(w.gtm).custom) },
      funding: { items: arr(obj(w.funding).items) },
      metrics: { items: arr(obj(w.metrics).items) },
      interviews: { items: arr(obj(w.interviews).items) },
      canvas: obj(w.canvas),
      ladder: { done: obj(obj(w.ladder).done) },
    };
  }

  /* ---------- Workspace ---------- */
  const wsKey = (pid) => "ws." + pid;
  const get = (pid) => normalize(read(wsKey(pid), {}));
  function store(pid, ws) { write(wsKey(pid), ws); emit("workspace"); }

  const queues = {};
  const saving = {};
  const savedAt = {};
  const queue = (pid, job) => (queues[pid] = (queues[pid] || Promise.resolve()).catch(() => {}).then(job));
  const loading = {};

  /** Bring this browser's copy up to date (a save in flight, or newer than the load, wins). */
  function load(pid) {
    if (!shared() || local.ws) return Promise.resolve(get(pid));
    if (loading[pid]) return loading[pid];
    const sent = Date.now();
    loading[pid] = Mori.db.workspace(pid).then(
      (ws) => {
        if (ws && !saving[pid] && (savedAt[pid] || 0) < sent) {
          const next = normalize(ws);
          if (JSON.stringify(next) !== JSON.stringify(get(pid))) store(pid, next); // only re-draw when a teammate changed something
        }
        return get(pid);
      },
      (err) => { if (missing(err)) { local.ws = true; return get(pid); } throw err; }
    ).finally(() => { delete loading[pid]; });
    return loading[pid];
  }

  /**
   * Change one part of the workspace: `fn(current)` returns its new value. It
   * runs on the copy here straight away and again on the latest stored copy.
   * `fn` must not invent ids or dates itself (it runs twice): make them first.
   */
  function change(pid, part, fn) {
    const before = get(pid);
    const next = normalize(Object.assign({}, before, { [part]: fn(clone(before[part])) }));
    store(pid, next);
    if (!shared() || local.ws) return Promise.resolve(next);
    saving[pid] = (saving[pid] || 0) + 1;
    const settle = () => { saving[pid] -= 1; savedAt[pid] = Date.now(); };
    return queue(pid, () => Mori.db.changeWorkspace(pid, (latest) => { const w = normalize(latest); w[part] = fn(clone(w[part])); return normalize(w); })).then(
      (ws) => { settle(); if (ws && !saving[pid]) store(pid, normalize(ws)); return get(pid); },
      (err) => {
        settle();
        if (missing(err)) { local.ws = true; return get(pid); } // keep it in this browser
        const now = get(pid);
        now[part] = before[part];
        store(pid, now);
        throw err;
      }
    );
  }

  /* ---------- Overall progress: the milestone ladder (worked out in state.js, shared with the homepage) ---------- */
  const progress = (p, ws = get(p.id)) => S.ladderProgress(p, ws);

  /* ---------- Money ---------- */
  function money(ws) {
    const f = ws.finance;
    const entries = f.entries.filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ""));
    const amt = (e) => Math.max(0, Number(e.amount) || 0);
    const sum = (list) => list.reduce((t, e) => t + amt(e), 0);
    const ins = entries.filter((e) => e.kind === "in");
    const outs = entries.filter((e) => e.kind !== "in");
    const balance = (Number(f.start) || 0) + sum(ins) - sum(outs);
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); }
    const byMonth = months.map((m) => ({ m, in: sum(ins.filter((e) => e.date.startsWith(m))), out: sum(outs.filter((e) => e.date.startsWith(m))) }));
    // Burn: the average net spend over the last three full months that had any entries (else this month).
    const full = byMonth.slice(2, 5).filter((x) => x.in || x.out);
    const basis = full.length ? full : [byMonth[5]];
    const burn = Math.max(0, basis.reduce((t, x) => t + (x.out - x.in), 0) / basis.length);
    return { balance, burn, runway: burn > 0 ? balance / burn : null, byMonth, thisMonth: byMonth[5], currency: f.currency };
  }
  function fmtMoney(amount, currency = "IDR", { compact = false } = {}) {
    const cur = P.currencies[currency] || P.currencies.IDR;
    const n = Number(amount) || 0;
    const locale = currency === "IDR" ? "id-ID" : "en-US";
    const opts = compact ? { notation: "compact", maximumFractionDigits: 1 } : { maximumFractionDigits: cur.decimals };
    const text = new Intl.NumberFormat(locale, opts).format(Math.abs(n));
    return `${n < 0 ? "−" : ""}${cur.symbol}${currency === "IDR" ? " " : ""}${text}`;
  }

  /* ---------- Documents ---------- */
  const docsKey = (pid) => "docs." + pid;
  const docLoads = {};
  const allDocs = (pid) => arr(read(docsKey(pid), []));
  function upsert(pid, d) {
    const list = allDocs(pid).filter((x) => x.id !== d.id);
    const old = allDocs(pid).find((x) => x.id === d.id) || {};
    list.push(Object.assign({}, old, d, d.body === undefined && old.body !== undefined && old.updatedAt === d.updatedAt ? { body: old.body } : {}));
    write(docsKey(pid), list);
    emit("docs");
  }
  const docs = {
    /** Newest edit first; the text is kept once a document has been opened. */
    list: (pid) => allDocs(pid).slice().sort((a, b) => b.updatedAt - a.updatedAt),
    get: (pid, id) => allDocs(pid).find((d) => d.id === id) || null,
    /** The team's latest list (one request at a time per project). */
    refresh(pid) {
      if (!shared() || local.docs) return Promise.resolve(docs.list(pid));
      if (docLoads[pid]) return docLoads[pid];
      docLoads[pid] = (async () => {
        try {
          const rows = await Mori.db.docs(pid);
          const cached = new Map(allDocs(pid).map((d) => [d.id, d]));
          const next = rows.map((r) => { const c = cached.get(r.id); return c && c.updatedAt === r.updatedAt && c.body !== undefined ? Object.assign({}, r, { body: c.body }) : r; });
          const same = next.length === cached.size && next.every((d) => { const c = cached.get(d.id); return c && c.updatedAt === d.updatedAt && c.title === d.title; });
          write(docsKey(pid), next);
          if (!same) emit("docs");
        } catch (err) {
          if (missing(err)) local.docs = true; else throw err;
        }
        return docs.list(pid);
      })().finally(() => { delete docLoads[pid]; });
      return docLoads[pid];
    },
    /** The full document, from Supabase when it's shared. */
    async open(pid, id) {
      const cached = docs.get(pid, id);
      if (!shared() || local.docs) return cached;
      const d = await Mori.db.doc(id);
      if (d) upsert(pid, d);
      else if (cached) { write(docsKey(pid), allDocs(pid).filter((x) => x.id !== id)); emit("docs"); }
      return d;
    },
    async create(pid, { title, body }) {
      const fields = { title: String(title || "Untitled document").slice(0, 120) || "Untitled document", body: String(body || "") };
      if (shared() && !local.docs) {
        try { const d = await Mori.db.createDoc(pid, fields); upsert(pid, d); return d; } catch (err) { if (!missing(err)) throw err; local.docs = true; }
      }
      const now = Date.now();
      const d = Object.assign({ id: uid("d"), projectId: pid, createdBy: me(), updatedBy: me(), createdAt: now, updatedAt: now }, fields);
      upsert(pid, d);
      return d;
    },
    /** Save title and/or text: shown here at once, stored in Supabase straight after. */
    async save(pid, id, patch) {
      const cur = docs.get(pid, id);
      if (!cur) return null;
      const clean = {};
      if (typeof patch.title === "string") clean.title = patch.title.trim().slice(0, 120) || "Untitled document";
      if (typeof patch.body === "string") clean.body = patch.body.slice(0, 200000);
      upsert(pid, Object.assign({}, cur, clean, { updatedAt: Date.now(), updatedBy: me() }));
      if (!shared() || local.docs) return docs.get(pid, id);
      const d = await Mori.db.saveDoc(id, clean);
      if (d) upsert(pid, Object.assign(d, { body: d.body !== undefined ? d.body : clean.body }));
      return d;
    },
    async remove(pid, id) {
      const cur = docs.get(pid, id);
      write(docsKey(pid), allDocs(pid).filter((x) => x.id !== id));
      emit("docs");
      if (!shared() || local.docs) return;
      try { await Mori.db.deleteDoc(id); } catch (err) { if (cur) upsert(pid, cur); throw err; }
    },
  };

  Mori.workspace = {
    get, load, change, normalize, progress, money, fmtMoney, docs, uid, isoDay,
    MAX_ROWS,
    isLocal: () => !shared() || local.ws,
  };
})();
