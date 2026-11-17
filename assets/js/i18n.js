/* ==========================================================================
   Mori: Sandbox — languages: English, Bahasa Indonesia, 简体中文
   --------------------------------------------------------------------------
   The site is written in English. In another language this swaps each
   English phrase on the page for its translation, once when the page is
   drawn and again whenever something new appears (lists, windows, toasts,
   the tours), from a dictionary in assets/i18n/<lang>.js. That file is
   built by tools/i18n/build.py from tools/i18n/translations.json.

   • A phrase is matched whole: the text between two tags, a placeholder, an
     aria-label, a title or an alt text.
   • Numbers carry over: "Updated 2h ago" matches "Updated {#}h ago".
   • A name or other value inside a phrase matches "{1}", "{2}"…, and the
     value itself is translated too when it's a known phrase.
   • What members write is never touched: it doesn't match a phrase, and
     form fields, the document editor and anything marked translate="no"
     are skipped.

   Loaded synchronously in <head>. English (the default) costs nothing. For
   another language the page stays hidden until it has been translated
   (2.5 s at most), so English never flashes. The choice is kept in this
   browser (mori.lang) and, for members, with their synced settings
   (state.js copies it across and reloads when it changes).
   ========================================================================== */
(function () {
  "use strict";
  const Mori = (window.Mori = window.Mori || {});
  const LANGS = {
    en: { label: "English", locale: "en-GB", html: "en" },
    id: { label: "Bahasa Indonesia", locale: "id-ID", html: "id" },
    zh: { label: "简体中文", locale: "zh-CN", html: "zh-CN" },
  };
  const KEY = "mori.lang";
  const readLang = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "\"en\"");
      return LANGS[v] ? v : "en";
    } catch (e) {
      return "en";
    }
  };
  const lang = readLang();
  const root = document.documentElement;
  root.setAttribute("lang", LANGS[lang].html);

  let exact = null;
  let digits = null;
  let patterns = [];
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const NUM = /\d+(?:[.,]\d+)*/g;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  /** Whether a pattern's values look like values (a name, a date), not part of a longer sentence. */
  function fits(p, m) {
    for (let i = 0; i < p.slots.length; i++) {
      if (p.slots[i] === "#") continue;
      const v = m[i + 1] || "";
      if (v.length > 120) return false;
      if (p.weak && (v.length > 32 || v.split(" ").length > 4 || /[.,;:!?“”"]/.test(v))) return false;
    }
    return true;
  }

  /** The translation of one phrase, or null. */
  function lookup(text) {
    if (!exact) return null;
    const key = norm(text);
    if (!key || !/[A-Za-z]/.test(key)) return null;
    const out = exact.get(key);
    if (out != null) return out;
    const nums = key.match(NUM);
    if (nums) {
      const tpl = digits.get(key.replace(NUM, "{#}"));
      if (tpl != null) { let i = 0; return tpl.replace(/\{#\}/g, () => nums[i++] || ""); }
    }
    for (const p of patterns) {
      const m = p.re.exec(key);
      if (!m || !fits(p, m)) continue;
      const values = {};
      const found = [];
      p.slots.forEach((slot, i) => { if (slot === "#") found.push(m[i + 1]); else values[slot] = m[i + 1]; });
      let i = 0;
      return p.out.replace(/\{(#|\d)\}/g, (_, slot) => {
        if (slot === "#") return found[i++] || "";
        const v = values[slot] || "";
        const t = v ? lookup(v) : null; // a value that is itself a known phrase ("2d ago") is translated too (values are shorter, so this ends)
        return t != null ? t : v;
      });
    }
    // A line made of parts ("Fintech · Starts in 3 days · teams of 3 to 4"): translate each part.
    for (const sep of [" · ", " • "]) {
      if (!key.includes(sep)) continue;
      let any = false;
      const parts = key.split(sep).map((part) => { const t = part ? lookup(part) : null; if (t != null) any = true; return t != null ? t : part; });
      if (any) return parts.join(sep);
    }
    return null;
  }
  /** Translate a phrase for code that shows text outside the page (prompts), or that builds a label. */
  function t(text) {
    const out = lookup(text);
    return out == null ? text : out;
  }

  /** The locale for dates and numbers: English keeps the format a call already uses ("en-US", or the
   *  browser's own with []); another language uses its own. */
  const loc = (en) => (lang === "en" ? en : LANGS[lang].locale);

  /** The notice shown above legal text in another language. */
  const UNOFFICIAL = "This is an unofficial translation, not checked by a lawyer. The English version is the one that counts.";

  /** Translate a piece of markup, such as a template's text before it's copied into a document
   *  (documents are what members write, so the page itself never translates them). */
  function html(markup) {
    if (lang === "en" || !exact) return markup;
    const tpl = document.createElement("template");
    tpl.innerHTML = markup;
    const w = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const out = lookup(n.nodeValue);
      if (out != null) n.nodeValue = n.nodeValue.match(/^\s*/)[0] + out + n.nodeValue.match(/\s*$/)[0];
    }
    return tpl.innerHTML;
  }

  const api = {
    LANGS,
    loc,
    lang,
    locale: LANGS[lang].locale,
    t,
    html,
    UNOFFICIAL,
    /** Switch language: kept in this browser, then the page reloads in it. */
    set(next) {
      if (!LANGS[next]) return;
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* storage blocked */ }
      if (next !== lang) location.reload();
    },
    ready: Promise.resolve(),
  };
  Mori.i18n = api;
  if (lang === "en") return;

  /* ---------- Another language ---------- */
  root.classList.add("i18n-pending");
  const hide = document.createElement("style");
  hide.textContent = "html.i18n-pending body{visibility:hidden}";
  document.head.appendChild(hide);
  const show = () => root.classList.remove("i18n-pending");
  const fallback = setTimeout(show, 2500);

  const NO = "script,style,noscript,textarea,code,pre,[translate='no'],[contenteditable='true'],[contenteditable=''],.doc-page";
  const ATTRS = ["placeholder", "aria-label", "title", "alt", "data-tip"];
  const doneText = new WeakMap();
  const doneAttr = new WeakMap();

  function textNode(n) {
    const v = n.nodeValue;
    if (!v || doneText.get(n) === v) return;
    const p = n.parentElement;
    if (!p || p.closest(NO)) { doneText.set(n, v); return; }
    const out = lookup(v);
    if (out != null) {
      const lead = v.match(/^\s*/)[0];
      const trail = v.match(/\s*$/)[0];
      n.nodeValue = lead + out + trail;
    }
    doneText.set(n, n.nodeValue);
  }
  function attr(el, name) {
    const v = el.getAttribute(name);
    if (!v) return;
    const done = doneAttr.get(el) || {};
    if (done[name] === v) return;
    if (el.closest("[translate='no'],[contenteditable='true']")) return;
    const out = lookup(v);
    if (out != null) el.setAttribute(name, out);
    done[name] = el.getAttribute(name);
    doneAttr.set(el, done);
  }
  function attrs(el) { for (const a of ATTRS) if (el.hasAttribute(a)) attr(el, a); }
  function walk(node) {
    if (node.nodeType === 3) { textNode(node); return; }
    if (node.nodeType !== 1) return;
    if (node.matches(NO)) { if (node.matches("textarea")) attrs(node); return; }
    attrs(node);
    const tw = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 1 && n.matches(NO)) { if (n.matches("textarea")) attrs(n); return NodeFilter.FILTER_REJECT; }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (n.nodeType === 3) textNode(n); else attrs(n); }
  }

  function load(dict) {
    exact = new Map();
    digits = new Map();
    patterns = [];
    Object.keys(dict || {}).forEach((en) => {
      const out = dict[en];
      if (typeof out !== "string" || !out) return;
      if (/\{\d\}/.test(en)) {
        const slots = [];
        // A value right after a letter is a word ending ("project{2}" → "projects"), so it may be empty.
        const re = new RegExp("^" + esc(en).replace(/\\\{(#|\d)\\\}/g, (_, s, at, str) => {
          slots.push(s);
          return s === "#" ? "(\\d+(?:[.,]\\d+)*)" : /[A-Za-z]/.test(str[at - 1] || "") ? "(.*?)" : "(.+?)";
        }) + "$");
        // A pattern with little fixed text ("{1} to {2}", "With {1}") could match an ordinary
        // sentence, so its values have to be short, like a name or a date.
        const fixed = en.replace(/\{(#|\d)\}/g, " ");
        const weak = (fixed.match(/[A-Za-z]+/g) || []).length <= 2 && !/[:“”·•()…→!%]/.test(fixed);
        patterns.push({ re, slots, out, len: en.length, weak });
      } else if (en.includes("{#}")) digits.set(en, out);
      else exact.set(en, out);
    });
    patterns.sort((a, b) => b.len - a.len); // the most specific pattern first
  }

  api.ready = new Promise((resolve) => {
    const src = (document.currentScript && document.currentScript.src) || "";
    const v = (src.match(/[?&]v=([^&]+)/) || [])[1] || "";
    const s = document.createElement("script");
    s.src = `assets/i18n/${lang}.js${v ? "?v=" + v : ""}`;
    s.onload = () => {
      load((window.MORI_I18N || {})[lang]);
      walk(root);
      new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === "childList") m.addedNodes.forEach(walk);
          else if (m.type === "characterData") textNode(m.target);
          else if (m.type === "attributes") attr(m.target, m.attributeName);
        }
      }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      clearTimeout(fallback);
      show();
      resolve();
    };
    s.onerror = () => { clearTimeout(fallback); show(); resolve(); };
    document.head.appendChild(s);
  });
})();
