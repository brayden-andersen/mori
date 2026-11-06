/* ==========================================================================
   Mori: Sandbox — onboarding (sign-up questions)
   --------------------------------------------------------------------------
   Six steps: about you · role · experience · industry niche · CV · languages.
   Answers are kept as a draft while the member goes, then saved to their
   profile (Supabase for Google members, this browser in demo mode).
   onboarding.html?edit=1 reopens the same questions to update them.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  if (Mori.redirecting) return;

  const { $, $$, esc, icon, loader } = Mori.ui;
  const D = Mori.data;
  const S = Mori.state;
  const db = Mori.db;
  const editing = new URLSearchParams(location.search).has("edit");
  const session = S.session();
  const saved = S.profile();
  const STEPS = ["About you", "Role", "Experience", "Industries", "CV", "Languages"];
  const MAX_INDUSTRIES = 3;
  const MAX_LANGUAGES = 6;
  const MAX_CV_BYTES = 10 * 1024 * 1024;
  const DRAFT_KEY = Mori.store.userKey("onboardingDraft");
  const ROLE_TONES = { founder: ["#fb923c", "#f97316"], specialist: ["#60a5fa", "#6366f1"] };

  /* ---------- Answers: draft > saved profile > Google name > role picked on the landing page ---------- */
  let joinRole = null;
  try { joinRole = sessionStorage.getItem("mori.joinRole"); } catch (e) { /* ignore */ }
  const [given, ...family] = String(session.name || "").split(/\s+/);
  const a = Object.assign({
    firstName: saved.firstName || (session.provider === "google" ? given : session.name) || "",
    lastName: saved.lastName || (session.provider === "google" ? family.join(" ") : ""),
    age: saved.age || "",
    region: saved.region || "",
    role: saved.role || (D.roles[joinRole] ? joinRole : null),
    experience: saved.experience || "",
    employment: saved.employment || "",
    industries: (saved.industries || []).slice(0, MAX_INDUSTRIES),
    linkedin: saved.linkedin || "",
    languages: saved.languages && saved.languages.length ? saved.languages.map((l) => ({ ...l })) : [{ name: "Bahasa Indonesia", level: "" }],
  }, editing ? {} : Mori.store.read(DRAFT_KEY, null) || Mori.store.read(Mori.auth.PENDING_DRAFT_KEY, {}));
  let file = null;
  let removeCv = false;
  const keepDraft = () => { if (!editing) Mori.store.write(DRAFT_KEY, a); };

  /* ---------- Step markup ---------- */
  const choices = (name, list) =>
    list.map((v) => `<label class="fchip ob-chip" data-active="${a[name] === v}"><input type="radio" name="${name}" value="${esc(v)}" ${a[name] === v ? "checked" : ""}>${esc(v.replace(/(\d)-(\d)/, "$1–$2"))}</label>`).join("");
  const regionOptions = () =>
    `<option value="" disabled ${a.region ? "" : "selected"}>Choose your region</option>` +
    D.regions.map((g) => `<optgroup label="${esc(g.group)}">${g.items.map((r) => `<option ${r === a.region ? "selected" : ""}>${esc(r)}</option>`).join("")}</optgroup>`).join("");

  const STEP_HTML = [
    () => `
      <h1 class="grad-ink" tabindex="-1">${editing ? "Your details" : "Welcome! Tell us about you"}</h1>
      <p class="ob-lead">This is how founders and specialists will see you on Sandbox.</p>
      <div class="ob-grid">
        <label class="field"><span>First name</span><input class="input" name="firstName" value="${esc(a.firstName)}" maxlength="40" autocomplete="given-name"></label>
        <label class="field"><span>Last name <em class="hint">optional</em></span><input class="input" name="lastName" value="${esc(a.lastName)}" maxlength="40" autocomplete="family-name"></label>
        <label class="field"><span>Age</span><input class="input" name="age" type="number" inputmode="numeric" min="16" max="80" value="${esc(a.age)}" placeholder="e.g. 21"></label>
        <label class="field"><span>Region</span><select class="select" name="region">${regionOptions()}</select></label>
      </div>`,
    () => `
      <h1 class="grad-ink" tabindex="-1">You’re joining as…</h1>
      <p class="ob-lead">Sandbox starts with two kinds of members. You can change this later.</p>
      <div class="ob-roles" role="radiogroup" aria-label="Role">
        ${Object.entries(D.roles).map(([k, r]) => `
          <label class="ob-option ${a.role === k ? "is-on" : ""}" style="--c1:${ROLE_TONES[k][0]};--c2:${ROLE_TONES[k][1]}">
            <input type="radio" name="role" value="${k}" ${a.role === k ? "checked" : ""}>
            <span class="ob-option-ico">${icon(r.icon)}</span>
            <b>${r.label}</b>
            <span class="meta">${esc(r.blurb)}</span>
            <span class="ob-tick" aria-hidden="true">${icon("check")}</span>
          </label>`).join("")}
      </div>`,
    () => `
      <h1 class="grad-ink" tabindex="-1">Your experience</h1>
      <p class="ob-lead">Helps founders and specialists find the right match.</p>
      <span class="ob-label" id="expLabel">Years of experience</span>
      <div class="ob-choices" role="radiogroup" aria-labelledby="expLabel">${choices("experience", D.experience)}</div>
      <span class="ob-label" id="empLabel">Status of employment</span>
      <div class="ob-choices" role="radiogroup" aria-labelledby="empLabel">${choices("employment", D.employment)}</div>`,
    () => `
      <h1 class="grad-ink" tabindex="-1">Your industry niche</h1>
      <p class="ob-lead">Pick up to three. Search the full list if yours isn’t in the popular picks.</p>
      <span class="ob-label">Your picks <span class="ob-counter" id="obIndCount"></span></span>
      <div class="ob-picked" id="obPicked"></div>
      <div class="ob-combo">
        <label class="search" aria-label="Search all industries">
          ${icon("search")}
          <input type="text" id="obIndSearch" role="combobox" aria-expanded="false" aria-controls="obIndList" aria-autocomplete="list" placeholder="Search all ${D.industries.length} industries…" autocomplete="off">
        </label>
        <ul class="ob-list" id="obIndList" role="listbox" aria-label="Industries" hidden></ul>
      </div>
      <span class="ob-label">Popular</span>
      <div class="ob-choices" id="obPopular">${D.popularIndustries.map((x) => `<button type="button" class="fchip" data-ind="${esc(x)}" data-active="${a.industries.includes(x)}">${esc(x)}</button>`).join("")}</div>`,
    () => `
      <h1 class="grad-ink" tabindex="-1">Share your CV</h1>
      <p class="ob-lead">Optional, but complete profiles get more replies. Add your LinkedIn page, a CV file, or both.</p>
      <label class="field"><span>LinkedIn profile</span>
        <span class="ob-prefix">${icon("link")}<input class="input" name="linkedin" type="url" inputmode="url" placeholder="linkedin.com/in/your-name" value="${esc(a.linkedin)}" autocomplete="url"></span>
      </label>
      <div class="ob-or"><span>and / or</span></div>
      <label class="ob-drop" id="obDrop" role="button" tabindex="0">
        <input type="file" id="obFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden>
        <span class="ob-drop-ico">${icon("upload")}</span>
        <b>Upload your CV</b>
        <span class="meta">PDF or Word, up to 10 MB. Drop it here or click to browse.${db.enabled ? "" : " (Demo mode keeps the file name only.)"}</span>
      </label>
      <div id="obFileRow"></div>`,
    () => `
      <h1 class="grad-ink" tabindex="-1">Languages you work in</h1>
      <p class="ob-lead">Add each language and how well you speak it.</p>
      <div class="ob-langs" id="obLangs"></div>
      <button type="button" class="btn btn--sm" id="obAddLang">${icon("plus")} Add a language</button>`,
  ];

  /* ---------- Validation (returns [fieldName|null, message] or null) ---------- */
  const isAge = (v) => Number.isInteger(Number(v)) && Number(v) >= 16 && Number(v) <= 80;
  const VALIDATE = [
    () => (!a.firstName.trim() ? ["firstName", "Add your first name."] : !isAge(a.age) ? ["age", "Enter an age between 16 and 80."] : !a.region ? ["region", "Choose your region."] : null),
    () => (!a.role ? [null, "Choose Founder or Specialist."] : null),
    () => (!a.experience ? [null, "Choose your years of experience."] : !a.employment ? [null, "Choose your employment status."] : null),
    () => (!a.industries.length ? [null, "Pick at least one industry."] : null),
    () => (a.linkedin.trim() && !/^(https?:\/\/)?([\w-]+\.)*linkedin\.com\/\S+/i.test(a.linkedin.trim()) ? ["linkedin", "That doesn’t look like a LinkedIn link."] : null),
    () => (a.languages.some((l) => !l.level) ? [null, "Choose a level for each language."] : null),
  ];

  /* ---------- Rendering ---------- */
  const body = $("#obBody");
  const errorEl = $("#obError");
  let step = 0;

  function flash(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("is-on");
    void errorEl.offsetWidth;
    errorEl.classList.add("is-on");
  }

  $("#obSteps").innerHTML = STEPS.map((label, i) => `<li ${editing ? `role="button" tabindex="0" data-goto="${i}"` : ""}>${label}</li>`).join("");

  function show(n, dir = 1) {
    step = n;
    body.innerHTML = `<section class="ob-step ${dir < 0 ? "is-back" : ""}">${STEP_HTML[n]()}</section>`;
    errorEl.textContent = "";
    $("#obBack").hidden = n === 0;
    const last = n === STEPS.length - 1;
    $("#obNext").innerHTML = last ? (editing ? `${icon("check")} Save changes` : `Finish ${icon("arrowRight")}`) : `Continue ${icon("arrowRight")}`;
    $("#obBar").style.setProperty("--p", ((n + 1) / STEPS.length) * 100 + "%");
    $("#obCount").textContent = `Step ${n + 1} of ${STEPS.length}`;
    $$("#obSteps li").forEach((li, i) => { li.classList.toggle("is-on", i === n); li.classList.toggle("is-done", i < n); });
    if (WIRE[n]) WIRE[n]();
    window.scrollTo({ top: 0, behavior: "instant" });
    const first = $(".ob-step input:not([type=radio]):not([type=file]), .ob-step select", body);
    (first && !matchMedia("(pointer: coarse)").matches ? first : $("h1", body)).focus({ preventScroll: true });
  }

  /* ---------- Live answers ---------- */
  const form = $("#obForm");
  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.name && t.name in a && t.type !== "radio") { a[t.name] = t.value; keepDraft(); }
  });
  form.addEventListener("change", (e) => {
    const t = e.target;
    if (!t.name || !(t.name in a)) return;
    a[t.name] = t.value;
    if (t.type === "radio") {
      $$(`input[name="${t.name}"]`, form).forEach((r) => {
        const box = r.closest(".ob-option, .ob-chip");
        box.classList.toggle("is-on", r.checked);
        box.dataset.active = String(r.checked);
      });
    }
    keepDraft();
  });

  /* ---------- Step behaviour ---------- */
  function wireIndustries() {
    const input = $("#obIndSearch");
    const list = $("#obIndList");
    let options = [];
    let active = -1;

    const paint = () => {
      $("#obPicked").innerHTML = a.industries.length
        ? a.industries.map((x) => `<span class="ob-pick">${esc(x)}<button type="button" data-unpick="${esc(x)}" aria-label="Remove ${esc(x)}">${icon("x")}</button></span>`).join("")
        : '<span class="meta">Nothing picked yet.</span>';
      $("#obIndCount").textContent = `${a.industries.length} / ${MAX_INDUSTRIES}`;
      $$("#obPopular [data-ind]").forEach((b) => { b.dataset.active = String(a.industries.includes(b.dataset.ind)); });
      keepDraft();
    };
    const renderList = () => {
      const q = input.value.trim().toLowerCase();
      options = D.industries.filter((x) => !q || x.toLowerCase().includes(q));
      const custom = q && !D.industries.some((x) => x.toLowerCase() === q) ? input.value.trim().slice(0, 40) : null;
      if (custom) options.push(custom);
      active = Math.min(active, options.length - 1);
      list.innerHTML = options.length
        ? options.map((x, i) => {
            const picked = a.industries.includes(x);
            const isCustom = x === custom;
            return `<li role="option" id="ind-${i}" data-ind="${esc(x)}" aria-selected="${picked}" class="${i === active ? "is-active" : ""} ${isCustom ? "ob-custom" : ""}">${isCustom ? `${icon("plus")} Add “${esc(x)}”` : esc(x)}${picked ? icon("check") : ""}</li>`;
          }).join("")
        : '<li class="ob-none">No matches</li>';
      input.setAttribute("aria-activedescendant", active > -1 ? `ind-${active}` : "");
    };
    const open = (on) => {
      list.hidden = !on;
      input.setAttribute("aria-expanded", String(on));
      if (on) renderList();
    };
    const toggle = (x) => {
      const i = a.industries.indexOf(x);
      if (i > -1) a.industries.splice(i, 1);
      else if (a.industries.length >= MAX_INDUSTRIES) { flash("You can pick up to three. Remove one first."); return; }
      else a.industries.push(x);
      errorEl.textContent = "";
      paint();
      if (!list.hidden) renderList();
    };

    // Opens on a click or typing, not on focus, so arriving on this step doesn't cover the popular picks.
    input.addEventListener("click", () => open(true));
    input.addEventListener("input", () => { active = -1; open(true); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (list.hidden) open(true);
        active = Math.max(0, Math.min(options.length - 1, active + (e.key === "ArrowDown" ? 1 : -1)));
        renderList();
        const li = list.children[active];
        if (li) li.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        const pick = options[active] || (options.length === 1 ? options[0] : null);
        if (!pick && !input.value.trim()) return; // empty search: Enter continues to the next step
        e.preventDefault();
        if (pick) { toggle(pick); input.value = ""; active = -1; open(false); }
      } else if (e.key === "Escape") {
        open(false);
      }
    });
    list.addEventListener("mousedown", (e) => {
      e.preventDefault(); // keep focus in the search field
      const li = e.target.closest("[data-ind]");
      if (!li) return;
      toggle(li.dataset.ind);
      input.value = "";
      active = -1;
      open(false); // closed again so the popular picks below stay reachable
    });
    $("#obPopular").addEventListener("click", (e) => { const b = e.target.closest("[data-ind]"); if (b) toggle(b.dataset.ind); });
    $("#obPicked").addEventListener("click", (e) => { const b = e.target.closest("[data-unpick]"); if (b) toggle(b.dataset.unpick); });
    input.addEventListener("blur", () => setTimeout(() => open(false), 120));
    paint();
  }

  function wireCv() {
    const drop = $("#obDrop");
    const input = $("#obFile");
    const okType = (f) => /\.(pdf|docx?)$/i.test(f.name);
    const size = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
    const paint = () => {
      const name = file ? file.name : !removeCv && saved.cvName ? saved.cvName : "";
      $("#obFileRow").innerHTML = name
        ? `<div class="ob-file">${icon("file")}<div><b>${esc(name)}</b><span class="meta">${file ? size(file.size) + " · uploads when you finish" : "Already on your profile"}</span></div><button type="button" class="icon-btn" data-file-remove aria-label="Remove CV">${icon("trash")}</button></div>`
        : "";
      drop.hidden = !!name;
    };
    const take = (f) => {
      if (!f) return;
      if (!okType(f)) { flash("Upload a PDF or Word document."); return; }
      if (f.size > MAX_CV_BYTES) { flash("That file is over 10 MB."); return; }
      file = f;
      removeCv = false;
      errorEl.textContent = "";
      paint();
    };
    input.addEventListener("change", () => take(input.files[0]));
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
    drop.addEventListener("drop", (e) => take(e.dataTransfer.files[0]));
    $("#obFileRow").addEventListener("click", (e) => {
      if (!e.target.closest("[data-file-remove]")) return;
      file = null;
      removeCv = true;
      input.value = "";
      paint();
    });
    paint();
  }

  function wireLanguages() {
    const box = $("#obLangs");
    const addBtn = $("#obAddLang");
    const paint = () => {
      box.innerHTML = a.languages.map((l, i) => {
        const taken = a.languages.filter((_, j) => j !== i).map((x) => x.name);
        return `<div class="ob-lang">
          <select class="select" data-lang="${i}" aria-label="Language">${D.languages.filter((x) => !taken.includes(x)).map((x) => `<option ${x === l.name ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
          <select class="select" data-level="${i}" aria-label="Level for ${esc(l.name)}"><option value="" disabled ${l.level ? "" : "selected"}>Choose level</option>${D.languageLevels.map((x) => `<option ${x === l.level ? "selected" : ""}>${x}</option>`).join("")}</select>
          <button type="button" class="icon-btn" data-lang-remove="${i}" aria-label="Remove ${esc(l.name)}" ${a.languages.length === 1 ? "disabled" : ""}>${icon("trash")}</button>
        </div>`;
      }).join("");
      addBtn.disabled = a.languages.length >= MAX_LANGUAGES;
      keepDraft();
    };
    box.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.lang) { a.languages[Number(t.dataset.lang)].name = t.value; paint(); }
      else if (t.dataset.level) { a.languages[Number(t.dataset.level)].level = t.value; errorEl.textContent = ""; keepDraft(); }
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lang-remove]");
      if (!b || a.languages.length < 2) return;
      a.languages.splice(Number(b.dataset.langRemove), 1);
      paint();
    });
    addBtn.addEventListener("click", () => {
      const next = D.languages.find((x) => !a.languages.some((l) => l.name === x));
      if (!next || a.languages.length >= MAX_LANGUAGES) return;
      a.languages.push({ name: next, level: "" });
      paint();
      box.lastElementChild.querySelector("select").focus();
    });
    paint();
  }

  const WIRE = { 3: wireIndustries, 4: wireCv, 5: wireLanguages };

  /* ---------- Save ---------- */
  const linkedinUrl = (v) => { const t = v.trim(); return t && !/^https?:\/\//i.test(t) ? "https://" + t : t; };

  async function finish() {
    const nextBtn = $("#obNext");
    nextBtn.disabled = true;
    loader.show(editing ? "Saving your changes" : "Setting up your Sandbox", "Saving your answers…");
    try {
      const patch = {
        firstName: a.firstName.trim(),
        lastName: a.lastName.trim(),
        age: Number(a.age),
        region: a.region,
        role: a.role,
        experience: a.experience,
        employment: a.employment,
        industries: a.industries.slice(0, MAX_INDUSTRIES),
        linkedin: linkedinUrl(a.linkedin),
        languages: a.languages.map((l) => ({ name: l.name, level: l.level })),
      };
      if (removeCv) Object.assign(patch, { cvPath: "", cvName: "" });
      if (file) {
        if (db.enabled && session.provider === "google") {
          loader.status("Uploading your CV…");
          const up = await db.uploadCv(file, saved.cvPath);
          Object.assign(patch, { cvPath: up.path, cvName: up.name });
        } else {
          Object.assign(patch, { cvPath: "", cvName: file.name });
        }
      }
      // Starter headline and open-to-build type follow the answers until the member writes their own.
      const starter = (role, industries) => (D.roles[role] ? `${D.roles[role].label} · ${(industries || []).join(", ")}` : "");
      const OLD_DEFAULTS = ["Founder · building something new", "Specialist · ready to join an early-stage team"];
      if (!saved.headline || OLD_DEFAULTS.includes(saved.headline) || saved.headline === starter(saved.role, saved.industries)) {
        patch.headline = starter(a.role, patch.industries);
      }
      if (a.role !== saved.role) patch.openType = a.role === "founder" ? "cofound" : "join";

      await S.saveProfile(patch, { onboarded: true });
      const name = [patch.firstName, patch.lastName].filter(Boolean).join(" ");
      Mori.auth.updateSession({ name, givenName: patch.firstName.split(/\s+/)[0], onboarded: true });
      Mori.store.remove(DRAFT_KEY);
      Mori.store.remove(Mori.auth.PENDING_DRAFT_KEY);
      try { sessionStorage.removeItem("mori.joinRole"); } catch (e) { /* ignore */ }

      loader.show(editing ? "All saved" : `Welcome to Sandbox, ${patch.firstName}`, editing ? "Taking you back…" : "Opening your homepage…");
      location.replace(Mori.auth.nextUrl(editing ? "home.html" : Mori.auth.startPage()));
    } catch (err) {
      if (err.code === "signed-out") {
        // Answers stay saved as a draft; signing in again brings the member back here.
        keepDraft();
        Mori.store.write(Mori.auth.PENDING_DRAFT_KEY, a);
        loader.show("Please sign in again", err.message);
        Mori.auth.clearSession();
        setTimeout(() => location.replace("index.html?next=" + encodeURIComponent("home.html")), 1600);
        return;
      }
      nextBtn.disabled = false;
      loader.hide();
      flash(err.message || "Couldn’t save your answers. Please try again.");
    }
  }

  /* ---------- Navigation ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const problem = VALIDATE[step]();
    if (problem) {
      flash(problem[1]);
      const field = problem[0] && form.elements[problem[0]];
      if (field) field.focus();
      return;
    }
    if (step === STEPS.length - 1) finish();
    else show(step + 1, 1);
  });
  $("#obBack").addEventListener("click", () => { if (step > 0) show(step - 1, -1); });
  $("#obSteps").addEventListener("click", (e) => {
    const li = e.target.closest("[data-goto]");
    if (li) show(Number(li.dataset.goto), Number(li.dataset.goto) < step ? -1 : 1);
  });
  $("#obSignOut").addEventListener("click", async () => {
    loader.show("Signing out", "See you soon…");
    await Promise.race([db.signOut(), new Promise((r) => setTimeout(r, 1500))]);
    Mori.auth.clearSession();
    location.replace("index.html?signedout=1");
  });

  // Start on the first unanswered step (or the first step when editing).
  show(editing ? 0 : Math.max(0, VALIDATE.findIndex((check) => check())));
})();
