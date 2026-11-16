/* ==========================================================================
   Mori: Sandbox — documents in the project planner
   --------------------------------------------------------------------------
   #docs           the team's documents, latest edit first
   #docs/<id>      the editor: a page with a formatting toolbar (paragraph
                   style, bold, italic, underline, strikethrough, lists,
                   quote, link, clear formatting, undo/redo). Saves as you
                   type; download as a Word document.
   Everything shown or saved goes through clean(): only plain formatting
   tags survive, and links must be http(s) or mailto, so a document can't
   carry scripts or tracking into a teammate's browser.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, ago, toast } = Mori.ui;
  const S = Mori.state;
  const W = Mori.workspace;
  const K = Mori.projectKit;

  /* ---------- Clean HTML ---------- */
  const ALLOWED = { P: [], H1: [], H2: [], H3: [], STRONG: [], B: [], EM: [], I: [], U: [], S: [], STRIKE: [], UL: [], OL: [], LI: [], BLOCKQUOTE: [], BR: [], A: ["href"], HR: [], DIV: [], SPAN: [] };
  const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "SVG", "MATH", "NOSCRIPT", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "VIDEO", "AUDIO", "CANVAS", "IMG", "LINK", "META", "HEAD", "TITLE"]);
  function clean(html) {
    const doc = new DOMParser().parseFromString(`<div>${html || ""}</div>`, "text/html");
    const rootEl = doc.body.firstElementChild;
    if (!rootEl) return "";
    (function walk(node) {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1) { n.remove(); return; }
        const tag = n.tagName.toUpperCase();
        if (DROP.has(tag)) { n.remove(); return; }
        if (!ALLOWED[tag]) { walk(n); n.replaceWith(...Array.from(n.childNodes)); return; }
        Array.from(n.attributes).forEach((a) => { if (!ALLOWED[tag].includes(a.name.toLowerCase())) n.removeAttribute(a.name); });
        if (tag === "A") {
          const href = (n.getAttribute("href") || "").trim();
          if (/^(https?:|mailto:)/i.test(href)) { n.setAttribute("href", href); n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener noreferrer"); } else n.removeAttribute("href");
        }
        walk(n);
      });
    })(rootEl);
    return rootEl.innerHTML;
  }
  const plain = (html) => { const d = document.createElement("div"); d.innerHTML = clean(html); return (d.textContent || "").replace(/\s+/g, " ").trim(); };

  /* ---------- The list ---------- */
  function renderList(view, ctx) {
    const docs = W.docs.list(ctx.pid);
    view.innerHTML = `
      <div class="doc-list-head">
        <p class="meta">Documents the whole team can read and edit: briefs, plans, meeting notes. <button class="link-btn" type="button" data-go="toolkits">Start from a template</button></p>
      </div>
      ${docs.length ? `<ul class="doc-list">${docs.map((d) => `
        <li>
          <button class="doc-row" type="button" data-doc-open="${esc(d.id)}">
            <span class="doc-ico">${icon("file")}</span>
            <span class="doc-copy"><b>${esc(d.title)}</b><span class="meta">Edited ${esc(ago(d.updatedAt).toLowerCase())}${ctx.who(d.updatedBy) ? " by " + esc(ctx.who(d.updatedBy)) : ""}${d.body !== undefined && plain(d.body) ? " · " + esc(plain(d.body).slice(0, 90)) : ""}</span></span>
          </button>
          <button class="icon-btn tool-x" type="button" data-doc-x="${esc(d.id)}" aria-label="Delete ${esc(d.title)}" title="Delete">${icon("trash")}</button>
        </li>`).join("")}</ul>`
      : `<div class="pl-card doc-empty"><span class="mf-empty-ico">${icon("file")}</span><h2>No documents yet</h2><p class="meta">Write a problem brief, a plan or meeting notes. Everyone on the team can edit them.</p><div class="tool-actions"><button class="btn btn--ink" type="button" data-doc-new>${icon("plus")} New document</button><button class="btn" type="button" data-go="toolkits">${icon("layers")} Use a template</button></div></div>`}`;
  }

  /* ---------- The editor ---------- */
  const TOOLS = [
    ["bold", "bold", "Bold (Ctrl+B)"], ["italic", "italic", "Italic (Ctrl+I)"], ["underline", "underline", "Underline (Ctrl+U)"], ["strikeThrough", "strike", "Strikethrough"],
    null, ["insertUnorderedList", "list", "Bulleted list"], ["insertOrderedList", "numbered", "Numbered list"], ["quote", "quote", "Quote"], ["link", "link", "Link"],
    null, ["removeFormat", "x", "Clear formatting"], ["undo", "undo", "Undo"], ["redo", "redo", "Redo"],
  ];
  let editor = null; // { pid, id, page, title, timer, savedHTML, dirty, status }

  function setStatus(text, cls = "") { if (!editor) return; const s = $("#docStatus"); if (s) { s.textContent = text; s.className = "doc-status " + cls; } }
  function flush() {
    if (!editor || !editor.dirty) return Promise.resolve();
    clearTimeout(editor.timer);
    const ed = editor;
    const body = clean(ed.page.innerHTML);
    const title = ed.title.value.trim() || "Untitled document";
    ed.dirty = false;
    setStatus("Saving…");
    return W.docs.save(ed.pid, ed.id, { title, body }).then(
      () => { if (editor === ed && !ed.dirty) setStatus(W.isLocal() ? "Saved on this device" : "Saved", "is-saved"); },
      (err) => { if (editor === ed) { ed.dirty = true; setStatus("Not saved. Retrying when you type…", "is-error"); } Mori.people.fail(err); }
    );
  }
  const schedule = () => { if (!editor) return; editor.dirty = true; setStatus("Editing…"); clearTimeout(editor.timer); editor.timer = setTimeout(flush, 800); };

  function syncToolbar() {
    if (!editor) return;
    $$("[data-cmd]", editor.bar).forEach((b) => {
      const cmd = b.dataset.cmd;
      if (!["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"].includes(cmd)) return;
      let on = false;
      try { on = document.queryCommandState(cmd); } catch (e) { /* not supported */ }
      b.setAttribute("aria-pressed", String(on));
    });
    const sel = $("#docBlock", editor.bar);
    if (!sel) return;
    let block = "";
    try { block = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, ""); } catch (e) { /* fine */ }
    sel.value = ["h1", "h2", "h3", "blockquote"].includes(block) ? block : "p";
  }

  async function renderEditor(view, ctx, id) {
    if (editor && editor.id === id && view.contains(editor.page)) { updateMeta(ctx); return; }
    if (editor && editor.id !== id) await flush();
    const cached = W.docs.get(ctx.pid, id);
    view.innerHTML = `<div class="doc-loading meta">${cached ? "" : "Opening the document…"}</div>`;
    let d = cached;
    try { d = await W.docs.open(ctx.pid, id); } catch (err) { if (!d) { Mori.people.fail(err); ctx.go("docs"); return; } }
    if (!d) { toast("That document isn’t there any more", { icon: "x" }); ctx.go("docs"); return; }
    if (view.dataset.section !== "docs" || ctx.route() !== "docs/" + id) return; // moved on meanwhile
    view.innerHTML = `
      <div class="doc-top">
        <button class="btn btn--sm btn--ghost" type="button" data-go="docs">${icon("chevronLeft")} All documents</button>
        <span class="doc-status is-saved" id="docStatus">${W.isLocal() ? "Saved on this device" : "Saved"}</span>
        <span class="doc-top-actions">
          <button class="btn btn--sm" type="button" data-doc-download>${icon("download")} Word</button>
          <button class="btn btn--sm btn--danger" type="button" data-doc-delete>${icon("trash")} Delete</button>
        </span>
      </div>
      <div class="doc-shell">
        <div class="doc-bar" role="toolbar" aria-label="Formatting">
          <select class="select select--sm" id="docBlock" aria-label="Paragraph style"><option value="p">Normal text</option><option value="h1">Title</option><option value="h2">Heading</option><option value="h3">Subheading</option><option value="blockquote">Quote</option></select>
          ${TOOLS.map((t) => (t ? `<button class="doc-tool" type="button" data-cmd="${t[0]}" aria-label="${t[2]}" title="${t[2]}" aria-pressed="false">${icon(t[1])}</button>` : `<span class="doc-sep" aria-hidden="true"></span>`)).join("")}
          <form class="doc-linkbar" id="docLink" hidden><input class="input input--sm" name="url" type="url" placeholder="https://…" aria-label="Link address"><button class="btn btn--sm" type="submit">Apply</button><button class="btn btn--sm btn--ghost" type="button" data-link-cancel>Cancel</button></form>
        </div>
        <article class="doc-paper">
          <input class="doc-title" id="docTitle" maxlength="120" value="${esc(d.title)}" aria-label="Document title" placeholder="Untitled document">
          <p class="meta doc-meta" id="docMeta"></p>
          <div class="doc-page" id="docPage" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Document text" spellcheck="true"></div>
        </article>
      </div>`;
    const page = $("#docPage", view);
    page.innerHTML = clean(d.body || "");
    editor = { pid: ctx.pid, id, page, title: $("#docTitle", view), bar: $(".doc-bar", view), timer: null, dirty: false, range: null };
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) { /* older browsers */ }
    updateMeta(ctx);
    bindEditor(view, ctx);
    if (!plain(d.body || "")) page.focus();
  }
  function updateMeta(ctx) {
    if (!editor) return;
    const d = W.docs.get(editor.pid, editor.id);
    const m = $("#docMeta");
    if (d && m) m.textContent = `Edited ${ago(d.updatedAt).toLowerCase()}${ctx.who(d.updatedBy) ? " by " + ctx.who(d.updatedBy) : ""} · created ${new Date(d.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}${ctx.who(d.createdBy) ? " by " + ctx.who(d.createdBy) : ""}`;
    // A teammate saved a newer version while this one has no unsaved typing: show theirs.
    if (d && d.body !== undefined && !editor.dirty && document.activeElement !== editor.page && clean(d.body) !== clean(editor.page.innerHTML) && d.updatedBy && d.updatedBy !== S.session().id) {
      editor.page.innerHTML = clean(d.body);
      if (document.activeElement !== editor.title) editor.title.value = d.title;
    }
  }

  function bindEditor(view, ctx) {
    const ed = editor;
    ed.page.addEventListener("input", schedule);
    ed.title.addEventListener("input", schedule);
    ed.title.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); ed.page.focus(); } });
    ed.page.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); ed.dirty = true; flush(); }
    });
    ed.page.addEventListener("paste", (e) => {
      const cd = e.clipboardData;
      if (!cd) return;
      e.preventDefault();
      const html = cd.getData("text/html");
      const text = cd.getData("text/plain");
      const safe = html ? clean(html) : esc(text).replace(/\n/g, "<br>");
      document.execCommand("insertHTML", false, safe);
    });
    ed.page.addEventListener("blur", () => flush());
    ed.title.addEventListener("blur", () => flush());
    const rememberRange = () => { const s = window.getSelection(); if (s && s.rangeCount && ed.page.contains(s.anchorNode)) ed.range = s.getRangeAt(0).cloneRange(); };
    ed.page.addEventListener("keyup", rememberRange);
    ed.page.addEventListener("mouseup", rememberRange);
    const restore = () => { ed.page.focus(); if (ed.range) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(ed.range); } };

    ed.bar.addEventListener("mousedown", (e) => { if (e.target.closest("[data-cmd]")) e.preventDefault(); }); // keep the selection in the page
    ed.bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cmd]");
      if (b) {
        const cmd = b.dataset.cmd;
        if (cmd === "link") {
          rememberRange();
          const form = $("#docLink", ed.bar);
          form.hidden = false;
          form.elements.url.value = "https://";
          form.elements.url.focus();
          return;
        }
        ed.page.focus();
        if (cmd === "quote") document.execCommand("formatBlock", false, "<blockquote>");
        else document.execCommand(cmd, false, null);
        schedule();
        syncToolbar();
        return;
      }
      if (e.target.closest("[data-link-cancel]")) { $("#docLink", ed.bar).hidden = true; restore(); }
    });
    $("#docLink", ed.bar).addEventListener("submit", (e) => {
      e.preventDefault();
      const url = e.target.elements.url.value.trim();
      e.target.hidden = true;
      restore();
      if (!/^(https?:\/\/.+|mailto:.+)/i.test(url)) { toast("Links need to start with https:// or mailto:", { icon: "link" }); return; }
      if (window.getSelection().isCollapsed) document.execCommand("insertHTML", false, `<a href="${esc(url)}">${esc(url)}</a>`);
      else document.execCommand("createLink", false, url);
      schedule();
    });
    $("#docBlock", ed.bar).addEventListener("change", (e) => { restore(); document.execCommand("formatBlock", false, `<${e.target.value}>`); schedule(); });

    view.querySelector("[data-doc-download]").addEventListener("click", () => {
      const title = ed.title.value.trim() || "Untitled document";
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5}</style></head><body><h1>${esc(title)}</h1>${clean(ed.page.innerHTML)}</body></html>`;
      const url = URL.createObjectURL(new Blob(["﻿", html], { type: "application/msword" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = title.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) + ".doc";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    view.querySelector("[data-doc-delete]").addEventListener("click", (e) => {
      const b = e.currentTarget;
      if (!Mori.people.confirmTap(b, "Tap again to delete")) return;
      const id = ed.id;
      ed.dirty = false;
      clearTimeout(ed.timer);
      editor = null;
      W.docs.remove(ctx.pid, id).then(() => toast("Document deleted", { icon: "trash" }), Mori.people.fail);
      ctx.go("docs");
    });
  }

  /* ---------- Section entry ---------- */
  function render(view, ctx, docId) {
    view.dataset.section = "docs";
    if (docId) return renderEditor(view, ctx, docId);
    if (editor) { flush(); editor = null; }
    renderList(view, ctx);
    return null;
  }
  function bind(view, getCtx) {
    view.addEventListener("click", (e) => {
      const ctx = getCtx();
      const open = e.target.closest("[data-doc-open]");
      if (open) { ctx.go("docs/" + open.dataset.docOpen); return; }
      const nw = e.target.closest("[data-doc-new]");
      if (nw) { create(ctx, nw); return; }
      const x = e.target.closest("[data-doc-x]");
      if (x && Mori.people.confirmTap(x, "Tap again")) W.docs.remove(ctx.pid, x.dataset.docX).then(() => toast("Document deleted", { icon: "trash" }), Mori.people.fail);
    });
  }
  function create(ctx, btn) {
    Mori.people.busy(btn, () => W.docs.create(ctx.pid, { title: "Untitled document", body: "" }), (d) => ctx.go("docs/" + d.id));
  }
  /** Is someone typing in the editor right now (so the page shouldn't be re-drawn)? */
  const busy = () => !!(editor && (editor.dirty || document.activeElement === editor.page || document.activeElement === editor.title));
  document.addEventListener("selectionchange", () => { if (editor && document.contains(editor.page)) syncToolbar(); });
  window.addEventListener("beforeunload", (e) => { if (editor && editor.dirty) { flush(); e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });

  Mori.plannerDocs = { render, bind, create, clean, plain, busy, flush, openId: () => (editor ? editor.id : null) };
})();
