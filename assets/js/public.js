/* ==========================================================================
   Mori: Sandbox — the public pages (contact.html, toolkits.html)
   --------------------------------------------------------------------------
   • Contact: the address comes from config.js (contactEmail). Until it's
     set, the button shows a placeholder instead of a broken mailto link.
   • Toolkits: the planner's templates (data.js), each with its text, so a
     visitor can read them before joining. Members open them in a project.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const { $, esc } = Mori.ui;
  const cfg = window.MORI_CONFIG || {};

  const mail = $("#contactMail");
  if (mail) {
    if (cfg.contactEmail) {
      mail.href = `mailto:${cfg.contactEmail}`;
      mail.textContent = cfg.contactEmail;
    } else {
      mail.setAttribute("aria-disabled", "true");
      mail.title = "The contact address hasn’t been set yet";
      mail.addEventListener("click", (e) => e.preventDefault());
    }
  }

  const list = $("#toolkitList");
  if (list) {
    const templates = Mori.data.planner.templates;
    list.innerHTML = templates.map((t) => `
      <article class="card toolkit-card" data-reveal>
        <h3>${esc(t.name)}</h3>
        <p class="meta">${esc(t.blurb)}${t.toolkit ? ` · From the ${esc(t.toolkit)}` : ""}</p>
        <details>
          <summary>Read the template</summary>
          <div class="toolkit-body">${t.body}</div>
        </details>
      </article>`).join("");
  }
})();
