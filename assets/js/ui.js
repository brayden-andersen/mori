/* ==========================================================================
   Mori: Sandbox — UI helpers
   --------------------------------------------------------------------------
   DOM helpers, icon set, avatars, time labels, toasts, the modal/drawer
   manager and the segmented control. Exposed as Mori.ui and Mori.modal.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Icons (24×24 stroke icons) ---------- */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    projects: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    network: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-3.9-3.9"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    ladder: '<path d="M7 2v20M17 2v20M7 6h10M7 11h10M7 16h10"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21.5h11.6a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7 15h10"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.88L18.18 22 12 18.77 5.82 22 7 14.15l-5-4.88 6.91-1.01L12 2z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  };
  const icon = (name, cls = "ico") =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  /* Brand star (same path as the drafts) */
  const brandStar = () =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.88L18.18 22 12 18.77 5.82 22 7 14.15l-5-4.88 6.91-1.01L12 2z"/></svg>';

  /* Google "G" mark for sign-in buttons */
  const googleG = () =>
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

  /* ---------- Avatars (Google photo, else gradient initials) ---------- */
  const PALETTE = [["#60a5fa", "#818cf8"], ["#fb923c", "#f472b6"], ["#34d399", "#22d3ee"], ["#a78bfa", "#f472b6"], ["#f59e0b", "#f97316"], ["#38bdf8", "#34d399"], ["#f472b6", "#fb7185"], ["#818cf8", "#22d3ee"]];
  const hash = (str) => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }; // FNV-1a
  function initials(name) {
    const parts = String(name || "?").replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  function avatar(p, size = 40, opts = {}) {
    const name = (p && p.name) || "Member";
    const tone = p && Number.isInteger(p.tone) ? p.tone : hash((p && p.id) || name);
    const [a1, a2] = PALETTE[tone % PALETTE.length];
    const img = p && p.picture ? `<img src="${esc(p.picture)}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">` : "";
    const av = `<span class="avatar" style="--size:${size}px;--a1:${a1};--a2:${a2}" aria-hidden="true">${esc(initials(name))}${img}</span>`;
    return opts.ring ? `<span class="open-ring">${av}</span>` : av;
  }
  const avatarStack = (people, size = 26) => `<span class="av-stack">${people.map((p) => avatar(p, size)).join("")}</span>`;

  /* ---------- Time labels ---------- */
  function ago(ts) {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d === 1) return "Yesterday";
    if (d < 7) return `${d}d ago`;
    return `${Math.floor(d / 7)}w ago`;
  }
  function humanizeDays(d) {
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7) return `${d}d ago`;
    return `${Math.floor(d / 7)}w ago`;
  }

  /* ---------- Toasts ---------- */
  function toast(msg, opts = {}) {
    let box = document.getElementById("toastbox");
    if (!box) {
      box = document.createElement("div");
      box.id = "toastbox";
      box.className = "toastbox";
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    const n = document.createElement("div");
    n.className = "toast" + (opts.tone ? " toast--" + opts.tone : "");
    n.setAttribute("role", "status");
    n.innerHTML = icon(opts.icon || "sparkle") + `<span>${esc(msg)}</span>`;
    box.appendChild(n);
    requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add("is-in")));
    setTimeout(() => {
      n.classList.remove("is-in");
      setTimeout(() => n.remove(), 300);
    }, opts.duration || 2400);
  }
  const soon = (what) => toast(`${what} — coming soon`, { icon: "sparkle" });

  /* ---------- Modal / drawer manager ---------- */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  /** Create (once) a modal root: <div.modal-root><div.modal-backdrop/><div.modal role=dialog/></div> */
  function createModal(id, { label = "", cls = "", panelCls = "" } = {}) {
    let root = document.getElementById(id);
    if (root) return root;
    root = document.createElement("div");
    root.id = id;
    root.className = "modal-root " + cls;
    root.hidden = true;
    root.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal ${panelCls}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1"></div>`;
    document.body.appendChild(root);
    return root;
  }

  const Modal = {
    current: null,
    open(id, opts = {}) {
      const root = document.getElementById(id);
      if (!root) return;
      if (this.current && this.current.root === root) return;
      const opener = opts.opener || (this.current ? this.current.opener : document.activeElement);
      if (this.current) this.close({ restoreFocus: false });
      root.hidden = false;
      void root.offsetWidth; // flush styles so the opening transition runs
      root.classList.add("is-open");
      document.body.classList.add("is-locked");
      this.current = { root, opener, onClose: opts.onClose };
      const panel = root.querySelector(".modal");
      setTimeout(() => {
        if (!root.classList.contains("is-open")) return;
        const target = root.querySelector("[autofocus]") || panel;
        target && target.focus({ preventScroll: true });
      }, 60);
      if (opts.onOpen) opts.onOpen(root);
      document.dispatchEvent(new CustomEvent("mori:modal", { detail: { id, open: true } }));
    },
    close({ restoreFocus = true } = {}) {
      const c = this.current;
      if (!c) return;
      this.current = null;
      c.root.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      setTimeout(() => { if (!c.root.classList.contains("is-open")) c.root.hidden = true; }, 420);
      if (c.onClose) c.onClose();
      if (restoreFocus && c.opener && c.opener.focus && document.contains(c.opener)) c.opener.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent("mori:modal", { detail: { id: c.root.id, open: false } }));
    },
    isOpen: (id) => !!(Modal.current && (!id || Modal.current.root.id === id)),
  };

  document.addEventListener("click", (e) => {
    if (!Modal.current) return;
    const closer = e.target.closest("[data-close]");
    if (closer && Modal.current.root.contains(closer)) { e.preventDefault(); Modal.close(); }
  });
  document.addEventListener("keydown", (e) => {
    if (!Modal.current) return;
    if (e.key === "Escape") { e.preventDefault(); Modal.close(); return; }
    if (e.key !== "Tab") return;
    const items = $$(FOCUSABLE, Modal.current.root).filter(visible);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !Modal.current.root.contains(document.activeElement))) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });

  /* ---------- Segmented control with a sliding glider ----------
     <div class="seg" data-value="a"><button data-value="a">A</button>…</div> */
  function seg(el, onChange) {
    if (!el) return;
    let glider = el.querySelector(".seg-glider");
    if (!glider) {
      glider = document.createElement("span");
      glider.className = "seg-glider";
      glider.setAttribute("aria-hidden", "true");
      el.prepend(glider);
    }
    const buttons = $$("button[data-value]", el);
    el.setAttribute("role", "radiogroup");
    const place = () => {
      const on = buttons.find((b) => b.dataset.value === el.dataset.value) || buttons[0];
      buttons.forEach((b) => {
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", b === on ? "true" : "false");
        b.classList.toggle("is-on", b === on);
      });
      if (on && on.offsetWidth) {
        glider.style.width = on.offsetWidth + "px";
        glider.style.transform = `translateX(${on.offsetLeft}px)`;
      }
    };
    buttons.forEach((b) =>
      b.addEventListener("click", () => {
        if (el.dataset.value === b.dataset.value) return;
        el.dataset.value = b.dataset.value;
        place();
        if (onChange) onChange(b.dataset.value);
      })
    );
    place();
    requestAnimationFrame(place); // after fonts/layout settle
    return { refresh: place };
  }

  /* Measure the fixed nav so content and sticky bars sit below it */
  function measureNav() {
    const nav = document.getElementById("topNav");
    if (!nav) return;
    document.documentElement.style.setProperty("--navH", Math.ceil(nav.getBoundingClientRect().height) + "px");
  }
  window.addEventListener("resize", measureNav);
  document.addEventListener("DOMContentLoaded", measureNav);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureNav);

  /** Split text into .word spans for the staggered heading entrance. */
  function splitWords(el) {
    if (!el) return;
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="word" style="--i:${i}" aria-hidden="true">${esc(w)}</span>`).join(" ");
    el.classList.add("split-words");
  }

  Mori.ui = { $, $$, esc, icon, brandStar, googleG, avatar, avatarStack, initials, ago, humanizeDays, toast, soon, createModal, seg, measureNav, splitWords };
  Mori.modal = Modal;
})();
