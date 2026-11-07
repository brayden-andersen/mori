/* ==========================================================================
   Mori: Sandbox — UI helpers
   --------------------------------------------------------------------------
   DOM helpers, icons, avatars, time labels, toasts, the modal/drawer manager,
   sliding highlights (nav, tabs, segmented controls), the full-screen
   loading screen and small shared fragments. Exposed as Mori.ui / Mori.modal.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const root = document.documentElement;

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
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    camera: '<path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5z"/><circle cx="12" cy="13" r="3.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    checks: '<path d="m2 12.5 4 4 8.5-8.5"/><path d="m11.5 15.5 1 1 8.5-8.5"/>',
  };
  const icon = (name, cls = "ico") =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  /** Replace <i data-icon="name"> placeholders with SVGs. */
  const hydrateIcons = (scope = document) => $$("i[data-icon]", scope).forEach((el) => { el.outerHTML = icon(el.dataset.icon); });

  /* MORI logo (森, "forest"), traced from the brand file. Takes the text colour. */
  const MORI_PATH = "M65 88.9L65 78.5L64.1 79.6C62.9 80.9 59.9 83.9 58.4 85.2C56 87.3 53 89.7 50.5 91.3C49.2 92.2 46.6 93.8 46.4 93.8C46.4 93.8 46.1 93.4 45.8 93C44.3 90.8 42.5 88.7 40.4 86.5L38.7 84.9L39.4 84.6C40.8 83.9 43.9 82.4 45.3 81.5C49.9 78.8 53.8 75.8 57.7 71.9C59.8 69.8 61 68.4 62.4 66.7L63.1 65.7L56.5 65.7L49.9 65.7L49.9 60.2L49.9 54.8L57.5 54.8L65.1 54.8L65.1 49.4L65.1 44.1L71 44.2L76.9 44.2L77 49.5L77 54.8L86.5 54.8L96.1 54.8L96.1 60.2L96.1 65.7L87.3 65.7L78.5 65.7L79.3 66.6C84.6 72.9 92.2 79.3 98.7 82.9L100.1 83.7L99.3 84.4C96.8 86.6 93.2 90.7 91.7 92.9C91.5 93.2 91.3 93.5 91.3 93.5C91.2 93.6 89 91.7 87.7 90.6C84.7 87.8 81.4 84.1 78.3 80.3L77 78.6L77 88.9L77 99.3L71 99.3L65.1 99.3L65 88.9ZM19.6 88.9L19.6 79.5L18.6 80.7C15.4 84.6 11.9 88 8.8 90.4C7.5 91.4 5.1 93 5 93C4.9 93 4.7 92.5 4.5 91.9C3.8 89.7 2.4 86.4 0.9 83.4L0 81.5L1 81C7 77.6 13.6 71.9 17.9 66.4C18.3 65.9 18.6 65.4 18.6 65.4C18.6 65.3 15.2 65.3 11 65.3L3.4 65.3L3.4 59.8L3.4 54.4L11.5 54.4L19.6 54.4L19.6 49.3L19.6 44.1L25.4 44.1L31.3 44.1L31.3 49.3L31.3 54.4L38.8 54.4L46.3 54.4L46.3 59.8L46.3 65.3L38.8 65.3C31.6 65.3 31.3 65.3 31.3 65.5C31.3 65.6 32 66 33.7 67.1C35 67.8 36.5 68.7 37 69.1C41 71.5 41.9 72.1 43.6 73.1C44.7 73.8 46.1 74.7 46.8 75.2L48.1 76.1L43.5 79C40.9 80.6 38.7 82 38.6 82C38.4 82.2 38.3 82.1 36.8 80.9C34.8 79.3 31.4 76.7 31.4 76.7C31.3 76.7 31.3 81.5 31.3 87.5L31.3 98.4L25.4 98.4L19.6 98.4L19.6 88.9ZM7.2 47C5.7 44.5 3.7 41.8 1.6 39.8C0.9 39 0.2 38.4 0.3 38.4C0.4 38.4 3.8 37.2 5.5 36.6C14.9 33.2 22.9 28.9 29.6 23.5L30.6 22.7L18.9 22.7L7.3 22.7L7.3 17.1L7.3 11.6L25.2 11.6L43.2 11.6L43.2 6.2L43.2 0.8L49.4 0.8C55.3 0.8 55.6 0.8 55.6 1C55.6 1 55.6 3.5 55.6 6.4L55.6 11.6L73.8 11.6L91.9 11.6L91.9 17.1L91.9 22.7L79.6 22.7L67.3 22.7L68 23.3C71.9 26.2 77.5 29.4 82.6 31.7C87.4 33.9 92.9 35.9 97.5 37.1C98 37.2 98.5 37.4 98.6 37.4C98.7 37.4 98.3 37.9 97.6 38.6C95.5 40.8 92.6 44.6 91.1 47.1L90.7 47.7L89.3 47.3C77.6 43.2 65.9 35.9 57.3 27.4C56.4 26.6 55.7 26 55.7 26C55.7 26 55.6 30.8 55.6 36.8C55.6 42.7 55.6 47.7 55.6 47.8L55.6 48L49.4 48L43.2 48L43.2 36.9L43.2 25.7L41.5 27.3C39.5 29.3 38.2 30.5 36 32.4C30.1 37.3 22.9 41.8 15.7 45C13.5 46 8.2 48.1 7.9 48.1C7.9 48.1 7.6 47.6 7.2 47Z";
  // The original logo: the top tree in black, the two lower trees in MORI red (#B80000).
  const [MORI_RIGHT, MORI_LEFT, MORI_TOP] = MORI_PATH.split("ZM").map((d, i, all) => (i ? "M" : "") + d + (i < all.length - 1 ? "Z" : ""));
  const brandMark = (cls = "brand-mark") => `<svg class="${cls}" viewBox="-1 -1 102 102" fill="currentColor" aria-hidden="true"><path d="${MORI_TOP}"/><path class="mark-red" fill="#b80000" d="${MORI_LEFT}${MORI_RIGHT}"/></svg>`;

  /* Google "G" mark for sign-in buttons */
  const googleG = () =>
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

  /* ---------- Avatars: the member's chosen photo, else a plain gray-and-white user icon ---------- */
  const FACE = '<svg class="avatar-face" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9.4" r="4.3"/><path d="M3.2 24c.7-5.4 4.3-8.9 8.8-8.9s8.1 3.5 8.8 8.9z"/></svg>';
  function initials(name) {
    const parts = String(name || "?").replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  function avatar(p, size = 40, opts = {}) {
    // The icon sits underneath, so it shows if the photo is missing or fails to load.
    const img = p && p.picture ? `<img src="${esc(p.picture)}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">` : "";
    const av = `<span class="avatar avatar--face" style="--size:${size}px" aria-hidden="true">${FACE}${img}</span>`;
    return opts.ring ? `<span class="open-ring">${av}</span>` : av;
  }

  /** Centre-crop an image file to a square JPEG, at most `size` pixels wide (profile photos). */
  function squareImage(file, size = 512, quality = 0.86) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        if (!side) { reject(new Error("That image couldn’t be read.")); return; }
        const out = Math.min(size, side);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = out;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("That image couldn’t be processed."))), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn’t an image this browser can open.")); };
      img.src = url;
    });
  }
  /**
   * Crop an image in place: drag to move it, zoom with the slider, the wheel or
   * the arrow keys. `src` is a File/Blob or an image URL (it must allow CORS).
   * Resolves to { toBlob(), destroy() } once the image has loaded.
   * opts: aspect (width / height), round (circular guide), outW (output width).
   */
  function cropper(container, src, opts = {}) {
    const aspect = opts.aspect || 1;
    const outW = opts.outW || 512;
    const outH = Math.round(outW / aspect);
    const objectUrl = src instanceof Blob ? URL.createObjectURL(src) : null;
    container.innerHTML = `
      <div class="crop">
        <div class="crop-stage ${opts.round ? "is-round" : ""}" style="aspect-ratio:${aspect}" tabindex="0" role="application"
          aria-label="Drag to move the image. Arrow keys move it, plus and minus zoom.">
          <img alt="" draggable="false">
          <span class="crop-guide" aria-hidden="true"></span>
        </div>
        <label class="crop-zoom">${icon("search")}<span class="sr-only">Zoom</span>
          <input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom">
        </label>
        <p class="meta crop-hint">Drag to reposition, zoom to resize.</p>
      </div>`;
    const stage = $(".crop-stage", container);
    const img = $("img", stage);
    const zoomEl = $('input[type="range"]', container);
    let nat = { w: 0, h: 0 };
    let zoom = 1;
    let cx = 0.5, cy = 0.5; // the image point at the centre of the frame (0–1)
    const box = () => stage.getBoundingClientRect();

    function layout() {
      const b = box();
      if (!nat.w || !b.width) return;
      const base = Math.max(b.width / nat.w, b.height / nat.h);
      const s = base * zoom;
      const w = nat.w * s, h = nat.h * s;
      // Keep the frame covered: clamp the centre point.
      const hx = b.width / 2 / w, hy = b.height / 2 / h;
      cx = Math.min(1 - hx, Math.max(hx, cx));
      cy = Math.min(1 - hy, Math.max(hy, cy));
      img.style.width = w + "px";
      img.style.height = h + "px";
      img.style.transform = `translate(${b.width / 2 - cx * w}px, ${b.height / 2 - cy * h}px)`;
    }
    function setZoom(z) {
      zoom = Math.min(4, Math.max(1, z));
      zoomEl.value = String(zoom);
      layout();
    }
    let drag = null;
    stage.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, cx, cy };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const w = parseFloat(img.style.width), h = parseFloat(img.style.height);
      cx = drag.cx - (e.clientX - drag.x) / w;
      cy = drag.cy - (e.clientY - drag.y) / h;
      layout();
    });
    const end = () => { drag = null; stage.classList.remove("is-dragging"); };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    stage.addEventListener("wheel", (e) => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06)); }, { passive: false });
    stage.addEventListener("keydown", (e) => {
      const step = 0.02;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) { e.preventDefault(); cx += moves[e.key][0] / zoom; cy += moves[e.key][1] / zoom; layout(); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(zoom + 0.1); }
      else if (e.key === "-") { e.preventDefault(); setZoom(zoom - 0.1); }
    });
    zoomEl.addEventListener("input", () => setZoom(Number(zoomEl.value)));
    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    return new Promise((resolve, reject) => {
      if (!objectUrl) img.crossOrigin = "anonymous";
      img.onload = () => {
        nat = { w: img.naturalWidth, h: img.naturalHeight };
        if (!nat.w) { reject(new Error("That image couldn’t be read.")); return; }
        layout();
        resolve({
          toBlob(quality = 0.86) {
            const b = box();
            const w = parseFloat(img.style.width);
            const scale = w / nat.w; // screen px per image px
            const sw = b.width / scale, sh = b.height / scale;
            const sx = cx * nat.w - sw / 2, sy = cy * nat.h - sh / 2;
            const canvas = document.createElement("canvas");
            // Never upscale beyond the picked area.
            canvas.width = Math.round(Math.min(outW, sw));
            canvas.height = Math.round(canvas.width / aspect) || outH;
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            return new Promise((res, rej) => {
              try {
                canvas.toBlob((blob) => (blob ? res(blob) : rej(new Error("That image couldn’t be processed."))), "image/jpeg", quality);
              } catch (err) {
                rej(new Error("This photo can’t be adjusted here. Upload it again instead."));
              }
            });
          },
          destroy() { window.removeEventListener("resize", onResize); if (objectUrl) URL.revokeObjectURL(objectUrl); },
        });
      };
      img.onerror = () => {
        window.removeEventListener("resize", onResize);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error(objectUrl ? "That file isn’t an image this browser can open." : "This photo can’t be adjusted here. Upload it again instead."));
      };
      img.src = objectUrl || src;
    });
  }
  /** The profile banner: the member's image, or the dark default. */
  const coverHTML = (url, extra = "") => (url && /^(https:|data:image\/)/.test(url)
    ? `<div class="pf-cover has-image" style="background-image:url('${esc(url)}')">${extra}</div>`
    : `<div class="pf-cover"><div class="pf-cover-glow" aria-hidden="true"><span></span><span></span><span></span></div>${extra}</div>`);
  /* ---------- Light / dark mode (the toggle on the right of every nav bar) ---------- */
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
  const themeToggle = () => `<button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-pressed="${isDark()}" aria-label="Dark mode" title="${isDark() ? "Switch to light mode" : "Switch to dark mode"}">${icon("moon")}${icon("sun")}</button>`;
  function syncThemeToggles() {
    const dark = isDark();
    $$("[data-theme-toggle]").forEach((b) => { b.setAttribute("aria-pressed", String(dark)); b.title = dark ? "Switch to light mode" : "Switch to dark mode"; });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#111113" : "#efeff0";
  }
  /**
   * Switch light / dark in one frame: element transitions are paused for the
   * switch, so text, surfaces and borders all change together, straight away,
   * instead of each fading on its own (which was slow on busy pages).
   */
  function setTheme(theme) {
    const root = document.documentElement;
    Mori.store.write("mori.theme", theme);
    root.classList.add("theme-instant");
    if (theme === "dark") root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
    syncThemeToggles();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-instant")));
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-theme-toggle]")) return;
    e.preventDefault();
    setTheme(isDark() ? "light" : "dark");
  });
  window.addEventListener("storage", (e) => { if (e.key === "mori.theme") syncThemeToggles(); });
  document.addEventListener("DOMContentLoaded", syncThemeToggles);

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Couldn’t read that image."));
    r.readAsDataURL(blob);
  });
  const avatarStack = (people, size = 26) => `<span class="av-stack">${people.map((p) => avatar(p, size)).join("")}</span>`;

  /* ---------- Shared fragments ---------- */
  /** "Founder", or "Specialist · UI/UX Designer" when a specialist named their role. */
  const roleChip = (role, specialty) => {
    const r = Mori.data && Mori.data.roles[role];
    if (!r) return "";
    return `<span class="chip chip--${r.hue}">${r.label}${role === "specialist" && specialty ? ` · ${esc(specialty)}` : ""}</span>`;
  };
  const empty = (ic, title, sub, cls = "") =>
    `<div class="empty ${cls}"><span class="empty-ico">${icon(ic)}</span><div>${title}</div>${sub ? `<div class="meta">${sub}</div>` : ""}</div>`;

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
  const humanizeDays = (d) => (d === 0 ? "Today" : d === 1 ? "Yesterday" : d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`);

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
    n.className = "toast";
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

  /* ---------- Full-screen loading screen (sign-in, onboarding, sign-out) ---------- */
  const loader = {
    el() {
      let el = document.getElementById("moriLoader");
      if (!el) {
        el = document.createElement("div");
        el.id = "moriLoader";
        el.className = "loader";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        el.innerHTML = `<div class="loader-card"><span class="loader-mark">${brandMark("loader-logo")}</span><p class="loader-title"></p><p class="loader-sub"></p></div>`;
        document.body.appendChild(el);
      }
      return el;
    },
    show(title, sub) {
      const el = loader.el();
      if (title) $(".loader-title", el).textContent = title;
      loader.status(sub);
      void el.offsetWidth;
      el.classList.add("is-on");
    },
    status(sub) { if (sub != null) $(".loader-sub", loader.el()).textContent = sub; },
    hide() {
      const el = document.getElementById("moriLoader");
      if (el) el.classList.remove("is-on");
      root.classList.remove("is-signing-in");
    },
  };
  /** Show the loading screen, then go to `url`. */
  function go(url, title, sub) {
    loader.show(title, sub);
    location.href = url;
  }

  /* ---------- Modal / drawer manager ---------- */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  /** Create (once) a modal root: <div.modal-root><div.modal-backdrop/><div.modal role=dialog/></div> */
  function createModal(id, { label = "", cls = "", panelCls = "" } = {}) {
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement("div");
    el.id = id;
    el.className = "modal-root " + cls;
    el.hidden = true;
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal ${panelCls}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1"></div>`;
    document.body.appendChild(el);
    return el;
  }

  const Modal = {
    current: null,
    open(id, opts = {}) {
      const el = document.getElementById(id);
      if (!el || (this.current && this.current.root === el)) return;
      const opener = opts.opener || (this.current ? this.current.opener : document.activeElement);
      if (this.current) this.close({ restoreFocus: false });
      el.hidden = false;
      void el.offsetWidth; // flush styles so the opening transition runs
      el.classList.add("is-open");
      document.body.classList.add("is-locked");
      this.current = { root: el, opener, onClose: opts.onClose };
      setTimeout(() => {
        if (!el.classList.contains("is-open")) return;
        const target = el.querySelector("[autofocus]") || el.querySelector(".modal");
        if (target) target.focus({ preventScroll: true });
      }, 60);
      $$(".seg", el).forEach((s) => s._seg && requestAnimationFrame(s._seg.refresh));
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
    // Enter / Space on custom buttons (cards with role="button")
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[role="button"][tabindex]')) {
      e.preventDefault();
      e.target.click();
      return;
    }
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

  /* ---------- Sliding highlight (nav glider, tab glider, segmented control) ---------- */
  function placeGlider(glider, target, { snap = false, height = false } = {}) {
    if (!glider) return;
    if (!target || !target.offsetWidth) { glider.style.opacity = "0"; return; }
    const box = glider.offsetParent || glider.parentElement;
    const b = box.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const x = t.left - b.left - box.clientLeft + box.scrollLeft;
    const y = t.top - b.top - box.clientTop;
    if (snap) glider.style.transition = "none";
    glider.style.width = t.width + "px";
    if (height) glider.style.height = t.height + "px";
    glider.style.transform = height ? `translate(${x}px, ${y}px)` : `translateX(${x}px)`;
    glider.style.opacity = "1";
    if (snap) { void glider.offsetWidth; glider.style.transition = ""; }
  }

  /* Segmented control: <div class="seg" data-value="a"><button data-value="a">A</button>…</div> */
  function seg(el, onChange) {
    if (!el) return null;
    let glider = $(".seg-glider", el);
    if (!glider) {
      glider = document.createElement("span");
      glider.className = "seg-glider";
      glider.setAttribute("aria-hidden", "true");
      el.prepend(glider);
    }
    const buttons = $$("button[data-value]", el);
    el.setAttribute("role", "radiogroup");
    const refresh = () => {
      const on = buttons.find((b) => b.dataset.value === el.dataset.value);
      buttons.forEach((b) => {
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(b === on));
        b.classList.toggle("is-on", b === on);
      });
      placeGlider(glider, on);
    };
    buttons.forEach((b) =>
      b.addEventListener("click", () => {
        if (el.dataset.value === b.dataset.value) return;
        el.dataset.value = b.dataset.value;
        refresh();
        if (onChange) onChange(b.dataset.value);
      })
    );
    refresh();
    requestAnimationFrame(refresh); // after fonts/layout settle
    el._seg = { refresh };
    return el._seg;
  }

  /* Measure the fixed nav so content and sticky bars sit below it */
  function measureNav() {
    const nav = document.getElementById("topNav");
    if (nav) root.style.setProperty("--navH", Math.ceil(nav.getBoundingClientRect().height) + "px");
  }
  window.addEventListener("resize", measureNav);
  document.addEventListener("DOMContentLoaded", measureNav);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureNav);

  /** Split text into .word spans for the staggered heading entrance. */
  function splitWords(el) {
    if (!el) return;
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.innerHTML = text.split(/\s+/).map((w, i) => `<span class="word" style="--i:${i}" aria-hidden="true">${esc(w)}</span>`).join(" ");
    el.classList.add("split-words");
  }

  hydrateIcons();

  Mori.ui = { $, $$, esc, icon, hydrateIcons, brandMark, googleG, avatar, avatarStack, roleChip, empty, initials, ago, humanizeDays, toast, soon, loader, go, createModal, seg, placeGlider, measureNav, splitWords, squareImage, cropper, coverHTML, blobToDataUrl, themeToggle, setTheme, isDark };
  Mori.modal = Modal;
})();
