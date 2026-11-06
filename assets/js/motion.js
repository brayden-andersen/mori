/* ==========================================================================
   Mori: Sandbox — motion layer
   --------------------------------------------------------------------------
   Declarative effects you can add in markup:
     data-reveal="up|scale|left|right|blur|fade"  fade/slide in when scrolled into view
     data-stagger="70"                             children reveal one after another (ms)
     data-count="128" (data-suffix="%")            count up when visible
     .progress-circle[data-percent="75"]           animate the ring when visible
     .spotlight                                    light follows the cursor
     .tilt (data-tilt="5")                         gentle 3D tilt toward the cursor
     .magnetic                                     button leans toward the cursor
     [data-parallax]                               children can use --px/--py (-1…1)
   Everything respects prefers-reduced-motion and Settings → Motion.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const root = document.documentElement;
  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const reduced = () => {
    const m = root.getAttribute("data-motion");
    return m === "reduced" || (m !== "full" && mqReduce.matches);
  };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- Reveal on scroll ---------- */
  let revealIO = null;
  function settle(el) {
    // once revealed, hand transitions back to the element's own styles
    const delay = parseFloat(el.style.getPropertyValue("--reveal-delay")) || 0;
    setTimeout(() => {
      el.removeAttribute("data-reveal");
      el.classList.remove("is-visible");
      el.style.removeProperty("--reveal-delay");
    }, delay + 1100);
  }
  function reveal(el) {
    el.classList.add("is-visible");
    settle(el);
  }
  function observeReveals(scope = document) {
    scope.querySelectorAll("[data-stagger]").forEach((group) => {
      const step = Number(group.dataset.stagger) || 70;
      Array.from(group.children).forEach((child, i) => {
        if (!child.hasAttribute("data-reveal")) child.setAttribute("data-reveal", group.dataset.revealType || "up");
        child.style.setProperty("--reveal-delay", i * step + "ms");
      });
      group.removeAttribute("data-stagger");
    });
    const els = Array.from(scope.querySelectorAll("[data-reveal]:not(.is-visible)"));
    if (scope !== document && scope.hasAttribute && scope.hasAttribute("data-reveal")) els.push(scope);
    if (reduced() || !("IntersectionObserver" in window)) { els.forEach(reveal); return; }
    revealIO = revealIO || new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        revealIO.unobserve(en.target);
        reveal(en.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    els.forEach((el) => revealIO.observe(el));
  }

  /* ---------- Count-ups and progress rings ---------- */
  function format(n) { return Math.round(n).toLocaleString("en-US"); }
  function animateCount(el, to) {
    const target = to != null ? to : parseFloat(el.dataset.count) || 0;
    const from = parseFloat(el.dataset.from || "0") || 0;
    const pre = el.dataset.prefix || "";
    const suf = el.dataset.suffix || "";
    el.dataset.from = target;
    if (reduced()) { el.textContent = pre + format(target) + suf; return; }
    const dur = Number(el.dataset.duration) || 1200;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = pre + format(from + (target - from) * easeOut(t)) + suf;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Animate a .progress-circle to a new value (0–100). */
  function setRing(ring, value) {
    if (!ring) return;
    const target = Math.max(0, Math.min(100, Number(value) || 0));
    const from = parseFloat(ring.style.getPropertyValue("--percent")) || 0;
    const label = ring.querySelector(".progress-label");
    ring.dataset.percent = target;
    const paint = (v) => {
      ring.style.setProperty("--percent", v.toFixed(2));
      if (label) label.textContent = Math.round(v) + "%";
    };
    if (reduced()) { paint(target); return; }
    const dur = 1100;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      paint(from + (target - from) * easeOut(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  let onceIO = null;
  function runOnce(el) {
    if (el.matches(".progress-circle[data-percent]")) setRing(el, el.dataset.percent);
    else if (el.hasAttribute("data-count")) animateCount(el);
    else if (el.hasAttribute("data-draw")) el.classList.add("is-drawn");
  }
  function observeOnce(scope = document) {
    const els = Array.from(scope.querySelectorAll(".progress-circle[data-percent], [data-count], [data-draw]"))
      .filter((el) => !el.dataset.motionBound);
    els.forEach((el) => {
      el.dataset.motionBound = "1";
      if (el.matches(".progress-circle")) el.style.setProperty("--percent", "0");
    });
    if (reduced() || !("IntersectionObserver" in window)) { els.forEach(runOnce); return; }
    onceIO = onceIO || new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        onceIO.unobserve(en.target);
        runOnce(en.target);
      });
    }, { threshold: 0.3 });
    els.forEach((el) => onceIO.observe(el));
  }

  /* ---------- Pointer effects: spotlight, tilt, magnetic, parallax ---------- */
  let lastEvent = null;
  let framePending = false;
  let activeTilt = null;
  let activeMagnet = null;
  let px = 0, py = 0, tx = 0, ty = 0, parallaxRaf = 0;
  let parallaxLayers = [];

  function resetTilt(el) {
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }
  function resetMagnet(el) { if (el) el.style.translate = ""; }

  function parallaxTick() {
    px += (tx - px) * 0.07;
    py += (ty - py) * 0.07;
    parallaxLayers.forEach((el) => {
      el.style.setProperty("--px", px.toFixed(4));
      el.style.setProperty("--py", py.toFixed(4));
    });
    parallaxRaf = Math.abs(tx - px) > 0.0005 || Math.abs(ty - py) > 0.0005 ? requestAnimationFrame(parallaxTick) : 0;
  }

  function onFrame() {
    framePending = false;
    const e = lastEvent;
    if (!e || !e.target || !e.target.closest) return;

    const spot = e.target.closest(".spotlight");
    if (spot) {
      const r = spot.getBoundingClientRect();
      spot.style.setProperty("--mx", e.clientX - r.left + "px");
      spot.style.setProperty("--my", e.clientY - r.top + "px");
    }
    if (reduced() || !finePointer.matches) return;

    const tilt = e.target.closest(".tilt");
    if (tilt !== activeTilt) { resetTilt(activeTilt); activeTilt = tilt; }
    if (tilt) {
      const r = tilt.getBoundingClientRect();
      const max = Number(tilt.dataset.tilt) || 5;
      tilt.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * max).toFixed(2) + "deg");
      tilt.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - 0.5) * max).toFixed(2) + "deg");
    }

    const mag = e.target.closest(".magnetic");
    if (mag !== activeMagnet) { resetMagnet(activeMagnet); activeMagnet = mag; }
    if (mag) {
      const r = mag.getBoundingClientRect();
      mag.style.translate = `${((e.clientX - (r.left + r.width / 2)) * 0.18).toFixed(1)}px ${((e.clientY - (r.top + r.height / 2)) * 0.28).toFixed(1)}px`;
    }

    if (parallaxLayers.length) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!parallaxRaf) parallaxRaf = requestAnimationFrame(parallaxTick);
    }
  }

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    lastEvent = e;
    if (!framePending) { framePending = true; requestAnimationFrame(onFrame); }
  }, { passive: true });
  document.addEventListener("pointerleave", () => { resetTilt(activeTilt); resetMagnet(activeMagnet); activeTilt = activeMagnet = null; });

  /* ---------- Scroll: nav state + progress bar ---------- */
  let scrollPending = false;
  function onScroll() {
    scrollPending = false;
    const nav = document.getElementById("topNav");
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);
    const bar = document.querySelector(".scroll-progress");
    if (bar) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--sp", h > 0 ? (window.scrollY / h).toFixed(4) : "0");
    }
  }
  let settleTimer = 0;
  function revealPassed() {
    const limit = window.innerHeight * 0.94;
    document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if ((r.width || r.height) && r.top < limit) {
        if (revealIO) revealIO.unobserve(el);
        reveal(el);
      }
    });
  }
  window.addEventListener("scroll", () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(onScroll); }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(revealPassed, 160); // safety net for fast jumps / anchor links
  }, { passive: true });

  /* ---------- Re-rendered lists: staggered entrance ---------- */
  function enter(container, selector) {
    if (!container) return;
    const items = selector ? container.querySelectorAll(selector) : container.children;
    Array.from(items).forEach((el, i) => {
      el.style.setProperty("--i", i);
      el.classList.remove("enter");
      void el.offsetWidth;
      el.classList.add("enter");
    });
  }

  function refresh(scope = document) {
    observeReveals(scope);
    observeOnce(scope);
  }

  function init() {
    parallaxLayers = Array.from(document.querySelectorAll("[data-parallax]"));
    refresh(document);
    onScroll();
    root.classList.add("motion-ready");
  }
  document.addEventListener("DOMContentLoaded", init);

  Mori.motion = { reduced, refresh, enter, setRing, animateCount, reveal };
})();
