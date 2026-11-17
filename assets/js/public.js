/* ==========================================================================
   Mori: Sandbox — the public pages (contact.html, toolkits.html, partners.html)
   --------------------------------------------------------------------------
   • Contact: the address comes from config.js (contactEmail). Until it's
     set, the button shows a placeholder instead of a broken mailto link.
   • Toolkits: the planner's templates (data.js), each with its text, so a
     visitor can read them before joining. Members open them in a project.
   • Partners: the partner application. It checks the answers, then shows
     them ready to send and opens an email draft to contactEmail. Nothing is
     stored or sent anywhere by SandBox.
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

  /* ---------- The partner application ---------- */
  const form = $("#applyForm");
  if (form) {
    const KIND = { notary: "Notary", legal: "Lawyer", accounting: "Accountant", tax: "Tax adviser", design: "Designer", mentor: "Mentor", investor: "Investor" };
    const MESSAGES = {
      fullName: "Add your full name.", email: "Add an email address we can reply to.", city: "Add your city.",
      kind: "Choose how you’d partner.", years: "Choose your years in practice.", track: "Tell us about your track record.",
      ref1Name: "Add a reference’s name.", ref1Contact: "Add how we can reach your reference.", services: "Say what you’d offer members.",
      consentVetting: "We need your consent to check your application.", consentAgreement: "Confirm you’d sign the partner agreement.",
    };
    const fieldOf = (name) => form.elements[name];
    function problem(name) {
      const el = fieldOf(name);
      if (el.type === "checkbox") return el.checked ? "" : MESSAGES[name];
      const v = el.value.trim();
      if (el.required && !v) return MESSAGES[name];
      if (name === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "That email address doesn’t look right.";
      if (name === "website" && v && !/^https?:\/\/\S+\.\S+/.test(v)) return "Start the link with https://";
      return "";
    }
    function show(name, msg) {
      const el = fieldOf(name);
      const err = $(`#ap-${name}-err`);
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) { err.textContent = msg; err.hidden = !msg; }
    }
    const names = Array.from(form.elements).filter((el) => el.name).map((el) => el.name);
    form.addEventListener("input", (e) => { if (e.target.name && e.target.getAttribute("aria-invalid") === "true") show(e.target.name, problem(e.target.name)); });
    // Not on blur for text fields: a message disappearing then would move the button being clicked.
    form.addEventListener("change", (e) => { const t = e.target; if (t.name && (t.tagName === "SELECT" || t.type === "checkbox") && t.getAttribute("aria-invalid") === "true") show(t.name, problem(t.name)); });

    const v = (name) => fieldOf(name).value.trim();
    function text() {
      const line = (label, value) => (value ? `${label}: ${value}` : "");
      return [
        "SandBox partner application", "",
        "WHO I AM", line("Name", v("fullName")), line("Email", v("email")), line("Phone", v("phone")), line("City", v("city")), "",
        "FIRM OR TRACK RECORD", line("Partnering as", KIND[v("kind")] || v("kind")), line("Years in practice", v("years")), line("Firm", v("firm")), line("Licence or registration", v("licence")), line("Website", v("website")), "Track record:", v("track"), "",
        "REFERENCES", line("1", [v("ref1Name"), v("ref1Contact")].filter(Boolean).join(", ")), line("2", [v("ref2Name"), v("ref2Contact")].filter(Boolean).join(", ")), "",
        "SERVICES", v("services"), line("Member price in mind", v("price")), "",
        "CONSENT", "I agree SandBox may check my identity, my firm or track record and my references.", "If accepted, I'll sign the partner agreement.",
      ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const bad = names.map((n) => [n, problem(n)]).filter(([, m]) => m);
      names.forEach((n) => show(n, problem(n)));
      const summary = $("#apSummary");
      if (bad.length) {
        summary.textContent = bad.length === 1 ? "One answer needs a look before you send." : `${bad.length} answers need a look before you send.`;
        summary.hidden = false;
        fieldOf(bad[0][0]).focus();
        return;
      }
      summary.hidden = true;
      const body = text();
      const to = cfg.contactEmail || "";
      const subject = `Partner application: ${v("fullName")} (${KIND[v("kind")] || "partner"})`;
      // Long answers can be too much for a mail link: the email gets the start, the box below has it all.
      const mailBody = body.length > 1700 ? body.slice(0, 1680) + "\n\n[The full application is pasted below.]" : body;
      const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
      $("#apText").value = body;
      $("#apMail").href = href;
      $("#apDoneTo").textContent = to
        ? `Your email app should open with it, addressed to ${to}. If it didn’t, use the button below or copy the text.`
        : "The partner address isn’t set yet: copy the application and send it to the address on the Contact page.";
      form.hidden = true;
      const done = $("#applyDone");
      done.hidden = false;
      done.focus();
      if (to) { const a = document.createElement("a"); a.href = href; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
    });
    $("#apCopy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("#apText").value); Mori.ui.toast("Application copied", { icon: "check" }); }
      catch (err) { $("#apText").select(); }
    });
    $("#apEdit").addEventListener("click", () => { $("#applyDone").hidden = true; form.hidden = false; fieldOf("fullName").focus(); });
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
          <div class="toolkit-body">${t.legal ? `<p class="i18n-note"><em>${Mori.i18n.UNOFFICIAL}</em></p>` : ""}${t.body}</div>
        </details>
      </article>`).join("");
  }
})();
