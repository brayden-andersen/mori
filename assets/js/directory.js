/* ==========================================================================
   Mori: Sandbox — the partner directory (directory)
   --------------------------------------------------------------------------
   Vetted partners by service: notaries, lawyers, accountants, tax advisers
   and designers. The service is in the address (directory#notary), so
   the launch path's "Get help from a vetted partner" opens the right one.
   Only sample entries exist so far, and sample data stays in the guest
   demo: members see that the first partners haven't been listed yet.
   [BRAYDEN: real partners and member prices]
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, esc, icon } = Mori.ui;
  const D = Mori.data;
  const KINDS = D.partnerKinds;
  const all = Mori.auth.isGuest() && Mori.sample ? Mori.sample.partners : [];

  const kindNow = () => { const k = decodeURIComponent(location.hash.replace(/^#/, "")); return KINDS[k] ? k : ""; };

  function card(x) {
    const k = KINDS[x.kind] || { one: x.kind, icon: "shield" };
    return `
      <article class="card dir-card">
        <div class="dir-top"><span class="dir-ico">${icon(k.icon)}</span><span class="chip chip--gray">${esc(k.one)}</span>${x.vetted ? `<span class="chip dir-vetted">${icon("check")} Vetted</span>` : ""}</div>
        <h2 class="dir-name">${esc(x.name)}${x.sample ? Mori.ui.sampleTag("A made-up partner for the demo") : ""}</h2>
        <p class="meta dir-city">${icon("pin")} ${esc(x.city)}</p>
        <ul class="dir-services">${x.services.map((s) => `<li>${icon("check")} ${esc(s)}</li>`).join("")}</ul>
        <p class="dir-price"><b>Member price:</b> ${esc(x.price)}</p>
        <p class="meta dir-fee">You pay the partner directly. SandBox receives a referral fee.</p>
      </article>`;
  }

  function render() {
    const k = kindNow();
    const counts = Object.fromEntries(Object.keys(KINDS).map((id) => [id, all.filter((x) => x.kind === id).length]));
    $("#dirKinds").innerHTML = [["", "All", all.length]].concat(Object.entries(KINDS).map(([id, v]) => [id, v.label, counts[id]]))
      .map(([id, label, n]) => `<a class="fchip dir-chip" href="#${id}" ${id === k ? 'aria-current="true" data-active="true"' : 'data-active="false"'}>${esc(label)}${all.length ? ` <span class="dir-n">${n}</span>` : ""}</a>`).join("");
    const list = all.filter((x) => !k || x.kind === k);
    const label = k ? KINDS[k].label.toLowerCase() : "partners";
    if (!all.length) {
      $("#dirCount").textContent = "";
      $("#dirList").innerHTML = `
        <div class="empty dir-empty empty--none"><span class="empty-ico">${icon("shield")}</span>
          <div>No vetted ${esc(label)} are listed yet</div>
          <div class="meta">The first notaries, lawyers, accountants and tax advisers are being checked. Until they’re here, your launch path’s checklists and templates show what to ask a professional. The guest demo shows the directory with sample partners.</div>
          <a class="btn" href="projects">${icon("briefcase")} Open your launch path</a>
        </div>`;
      return;
    }
    $("#dirCount").innerHTML = `<b>${list.length}</b> ${list.length === 1 ? "partner" : "partners"}${k ? ` · ${esc(KINDS[k].label)}` : ""}`;
    $("#dirList").innerHTML = list.length ? list.map(card).join("")
      : `<div class="empty dir-empty empty--results"><span class="empty-ico">${icon("search")}</span><div>No ${esc(label)} here yet</div><div class="meta">Try another service.</div><a class="btn" href="#">${icon("arrowRight")} All partners</a></div>`;
  }

  window.addEventListener("hashchange", render);
  render();
})();
