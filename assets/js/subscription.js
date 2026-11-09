/* ==========================================================================
   Mori: Sandbox — subscription page (subscription.html)
   --------------------------------------------------------------------------
   The plans as a ladder (Explorer → Builder → Founder Pro → Studio), monthly
   or yearly, a comparison table and a few questions. Prices and perks come
   from Mori.data.plans and are placeholders for now. Payments aren't open
   yet, so choosing a plan says so; everyone is on Explorer.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, toast, seg } = Mori.ui;
  const PLANS = Mori.data.plans;
  const CURRENT = "explorer";
  let billing = "monthly";

  const rupiah = (n) => "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));

  function priceHTML(t) {
    if (!t.monthly) return `<span class="plan-price"><b>Free</b></span><span class="plan-per">for as long as you like</span>`;
    if (billing === "yearly") {
      const year = t.monthly * 10;
      return `<span class="plan-price"><b>${rupiah(year)}</b><small>/year</small></span><span class="plan-per">${rupiah(year / 12)} a month, billed yearly</span>`;
    }
    return `<span class="plan-price"><b>${rupiah(t.monthly)}</b><small>/month</small></span><span class="plan-per">billed monthly</span>`;
  }

  function render() {
    $("#plansNote").hidden = !PLANS.placeholder;
    $("#plans").innerHTML = PLANS.tiers.map((t, i) => `
      <article class="plan plan--${esc(t.id)} ${t.popular ? "is-popular" : ""} ${t.id === CURRENT ? "is-current" : ""}" style="--rung:${t.rung}; --i:${i}">
        <span class="plan-rung" aria-hidden="true"><i></i>Rung ${t.rung}</span>
        ${t.popular ? `<span class="plan-flag">Most popular</span>` : ""}
        <h2 class="plan-name">${esc(t.name)}</h2>
        <p class="plan-tagline">${esc(t.tagline)}</p>
        <div class="plan-cost">${priceHTML(t)}</div>
        ${t.id === CURRENT
          ? `<button class="btn plan-cta" type="button" disabled>${icon("check")} Your plan</button>`
          : `<button class="btn ${t.popular ? "btn--ink" : ""} plan-cta" type="button" data-plan="${esc(t.id)}">Choose ${esc(t.name)}</button>`}
        <ul class="plan-perks">${t.perks.map((p) => `<li>${icon("check")}<span>${esc(p)}</span></li>`).join("")}</ul>
      </article>`).join("");
    const names = PLANS.tiers.map((t) => t.name);
    const cell = (v) => (v === true ? `<span class="cmp-yes" aria-label="Included">${icon("check")}</span>` : v === false ? `<span class="cmp-no" aria-label="Not included">–</span>` : esc(v));
    $("#compare").innerHTML = `
      <div class="cmp-row cmp-head" role="row"><span role="columnheader">Feature</span>${names.map((n) => `<span role="columnheader">${esc(n)}</span>`).join("")}</div>
      ${PLANS.compare.map(([feature, vals]) => `<div class="cmp-row" role="row"><span role="rowheader">${esc(feature)}</span>${vals.map((v, i) => `<span role="cell" data-plan="${esc(names[i])}">${cell(v)}</span>`).join("")}</div>`).join("")}`;
  }

  // Switching monthly / yearly changes the prices in place (the cards don't play their entrance again).
  seg($("#billing"), (v) => {
    billing = v;
    PLANS.tiers.forEach((t) => { const el = $(`.plan--${t.id} .plan-cost`); if (el) el.innerHTML = priceHTML(t); });
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-plan]");
    if (!b || b.tagName !== "BUTTON") return;
    const t = PLANS.tiers.find((x) => x.id === b.dataset.plan);
    toast(`Payments open soon: we’ll let you know when you can move up to ${t ? t.name : "this plan"}.`, { icon: "card", duration: 3600 });
  });
  render();
})();
