/* ==========================================================================
   Mori: Sandbox — sample data for the guest demo
   --------------------------------------------------------------------------
   Everything here is fictional: the people, their companies, the partners,
   the programmes and the sprints. Each record carries `sample: true`, which
   the pages show as a "Sample" label. Only the guest demo (guestdb.js) uses
   this file. Signed-in members never see any of it: they see real members
   and their own data, as before.
   ========================================================================== */
(function () {
  "use strict";
  const Mori = window.Mori;
  const DAY = 864e5;
  const ago = (days, hours = 10) => Date.now() - days * DAY - hours * 36e5;
  const inDays = (days) => { const d = new Date(Date.now() + days * DAY); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const ID = "guest"; // the guest's own id (Mori.auth gives a guest session this id)
  const langs = (...names) => names.map((n, i) => ({ name: n, level: i === 0 ? "Native" : "Fluent" }));

  /* ---------- You: a sample founder the guest explores as ---------- */
  const persona = {
    firstName: "Nadia", lastName: "Pratiwi", birthDate: "2003-04-18", region: "DKI Jakarta",
    role: "founder", specialty: "", experience: "0-2 years", employment: "Student",
    industries: ["FinTech", "MSME (UMKM) Services"],
    headline: "Founder · Payments and bookkeeping for warung owners",
    bio: "Final-year student building WarungPay with two friends from campus. This is a sample profile: change anything you like, it stays in this browser.",
    skills: ["Customer interviews", "Sales", "Spreadsheets"],
    languages: langs("Bahasa Indonesia", "English"),
    linkedin: "", links: [], photo: "", cover: "", cvPath: "", cvName: "",
    open: true, openType: "cofound", visibility: "everyone", invisible: false,
    show: { age: false, region: true, employment: true, languages: true },
  };

  /* ---------- Members (as public.member_directory() shares them) ---------- */
  const member = (id, o) => Object.assign({
    id: "m-" + id, sample: true, picture: "", cover: "", bio: "", age: null, region: "", experience: "", employment: "",
    industries: [], languages: langs("Bahasa Indonesia", "English"), skills: [], open: true, openType: "join", linkedin: "", links: [],
    cvPath: "", cvName: "", rating: null, reviews: 0, joinedAt: ago(40), limited: false, invisible: false,
  }, o);
  const members = [
    member("dewi", { name: "Dewi Saraswati", role: "specialist", specialty: "UI/UX Designer", headline: "Product designer for small-shop fintech", bio: "I design for people who run a business from a phone. Two years in payments, one in retail.", region: "West Java", experience: "3-5 years", employment: "Freelance / self-employed", industries: ["FinTech", "Design"], skills: ["Figma", "Design systems", "User research"], reviews: 3, joinedAt: ago(60) }),
    member("raka", { name: "Raka Pratama", role: "founder", headline: "Founder · Fintech for warung owners", bio: "Building a credit ledger for small shops. Looking for a second technical co-founder.", region: "DKI Jakarta", experience: "3-5 years", employment: "Building a startup full-time", industries: ["FinTech", "Payments", "MSME (UMKM) Services"], skills: ["Sales", "Partnerships"], openType: "cofound", reviews: 2, joinedAt: ago(55) }),
    member("arif", { name: "Arif Rahman", role: "specialist", specialty: "Graphic Designer", headline: "Brand designer for food and drink brands", region: "DI Yogyakarta", experience: "0-2 years", employment: "Student", industries: ["Design", "Food & Beverage"], skills: ["Branding", "Packaging", "Illustration"], reviews: 1, joinedAt: ago(33) }),
    member("maya", { name: "Maya Indah", role: "specialist", specialty: "UI/UX Designer", headline: "UI/UX designer, final-year student", region: "DKI Jakarta", experience: "0-2 years", employment: "Student", industries: ["EdTech", "Design"], skills: ["Figma", "Prototyping"], reviews: 0, joinedAt: ago(12) }),
    member("yusuf", { name: "Yusuf Taufik", role: "specialist", specialty: "Software Engineer", headline: "Full-stack developer · Node and React", bio: "I ship payment integrations by day and side projects by night.", region: "East Java", experience: "3-5 years", employment: "Employed full-time", industries: ["SaaS", "Developer Tools", "Payments"], skills: ["Node.js", "React", "PostgreSQL"], reviews: 4, joinedAt: ago(70) }),
    member("sari", { name: "Sari Kusuma", role: "specialist", specialty: "Product Manager", headline: "Product strategist for marketplaces", bio: "Eight years building two-sided marketplaces. Happy to talk pricing and first hires.", region: "Bali", experience: "6-10 years", employment: "Freelance / self-employed", industries: ["Marketplaces", "SaaS"], skills: ["Pricing", "Hiring", "Roadmaps"], reviews: 6, joinedAt: ago(90) }),
    member("kevin", { name: "Kevin Tanuwijaya", role: "specialist", specialty: "Data Scientist", headline: "Data and ML engineer", region: "DKI Jakarta", experience: "3-5 years", employment: "Employed full-time", industries: ["Artificial Intelligence", "Data & Analytics"], skills: ["Python", "ML", "dbt"], reviews: 2, joinedAt: ago(48) }),
    member("lina", { name: "Lina Wijaya", role: "founder", headline: "Founder · Field data for smallholder farmers", bio: "Agronomy student. Kebun Data helps farmer groups record yields and prices.", region: "DI Yogyakarta", experience: "0-2 years", employment: "Student", industries: ["AgriTech", "Agriculture"], skills: ["Field research", "Grant writing"], openType: "cofound", reviews: 1, joinedAt: ago(80) }),
    member("dimas", { name: "Dimas Ardi", role: "specialist", specialty: "Mobile Developer", headline: "Flutter developer", region: "", experience: "", employment: "", industries: [], languages: [], skills: [], limited: true, reviews: 0, joinedAt: ago(20) }),
    member("putri", { name: "Putri Anggraini", role: "founder", headline: "Founder · Healthy lunchboxes for offices", region: "DKI Jakarta", experience: "0-2 years", employment: "Building a startup full-time", industries: ["Food & Beverage", "FoodTech"], skills: ["Operations", "Food safety"], openType: "cofound", reviews: 0, joinedAt: ago(9) }),
    member("rani", { name: "Rani Halim", role: "specialist", specialty: "Finance & Accounting", headline: "Accountant who sets up first-time founders’ books", region: "DKI Jakarta", experience: "6-10 years", employment: "Employed full-time", industries: ["Banking", "Consulting"], skills: ["Bookkeeping", "Tax filing", "Cash-flow planning"], reviews: 1, joinedAt: ago(25) }),
    // Invisible on the MORI Network: found only by exact full name, and only their name and join date show
    member("bagus", { name: "Bagus Setiawan", role: null, headline: "", invisible: true, limited: true, languages: [], joinedAt: ago(15) }),
  ];
  const m = (id) => "m-" + id;

  /* ---------- Connections: accepted, waiting for you, and sent by you ---------- */
  const link = (id, from, to, status, days, note = "") => ({ id: "l-" + id, from, to, status, note, at: ago(days), respondedAt: status === "accepted" ? ago(days - 1) : 0, sample: true });
  const links = [
    link("dewi", ID, m("dewi"), "accepted", 21),
    link("raka", ID, m("raka"), "accepted", 18),
    link("sari", m("sari"), ID, "accepted", 9),
    link("yusuf", m("yusuf"), ID, "pending", 1, "Saw WarungPay in Discover. I build payment integrations for a living and would be happy to help with the first version."),
    link("lina", m("lina"), ID, "pending", 2, "Co-founder on Kebun Data here. Want to swap notes on customer interviews?"),
    link("kevin", ID, m("kevin"), "pending", 3, "Hi Kevin, we’re starting to collect transaction data from warungs and could use advice on what to keep."),
  ];

  /* ---------- Conversations (between connections only) ---------- */
  const msg = (id, from, to, body, days, hours = 10, read = true) => ({ id: "x-" + id, from, to, body, at: ago(days, hours), readAt: read ? ago(days, hours - 1) : 0, sample: true });
  const messages = [
    msg(1, m("dewi"), ID, "Had a look at the WarungPay sign-up flow. Three of the screens could be one. Mind if I sketch it?", 2, 14),
    msg(2, ID, m("dewi"), "Please do! The owners we interviewed got stuck on the second screen every time.", 2, 11),
    msg(3, m("dewi"), ID, "The sketch is in the project’s documents. Can we go through it on Thursday?", 0, 3, false),
    msg(4, m("raka"), ID, "Thanks for connecting. Coffee near campus this week?", 6, 15),
    msg(5, ID, m("raka"), "Yes! Thursday at 10 works for me.", 5, 9),
    msg(6, ID, m("sari"), "Thanks for accepting. Could I ask how you priced your first marketplace?", 8, 16),
    msg(7, m("sari"), ID, "Happy to. Start from what the warung owner saves in a week, not from what the app costs you to run.", 7, 12),
  ];

  /* ---------- Projects, their workspaces and documents ---------- */
  const task = (id, text, status, extra = {}) => Object.assign({ id: "t-" + id, text, status, done: status === "done", assignee: null, due: null }, extra);
  const projects = [
    { id: "p-warungpay", sample: true, ownerId: ID, name: "WarungPay", focus: "Interview 10 warung owners", tags: ["FinTech", "Payments"], rung: 1, cofounders: [m("dewi")], createdAt: ago(30), updatedAt: ago(1),
      milestones: [
        task("w1", "Write the one-page problem brief", "done"),
        task("w2", "Book 8–10 problem interviews", "done"),
        task("w3", "Summarise what you learned", "doing", { assignee: ID, due: inDays(0) }),
        task("w4", "Sketch the riskiest user flow", "todo", { assignee: m("dewi"), due: inDays(6) }),
        task("w5", "Build a clickable prototype", "todo"),
        task("w6", "Sign the founders’ agreement", "todo", { due: inDays(10) }),
        task("w7", "Test it with five users", "todo"),
      ] },
    { id: "p-rantang", sample: true, ownerId: ID, name: "Rantang Kita", focus: "Decide whether to keep going", tags: ["Food & Beverage", "Idea"], rung: 0, cofounders: [], createdAt: ago(12), updatedAt: ago(4),
      milestones: [
        task("r1", "Write the one-page problem brief", "todo"),
        task("r2", "Book 8–10 problem interviews", "todo"),
        task("r3", "Summarise what you learned", "todo"),
      ] },
    { id: "p-kebundata", sample: true, ownerId: m("lina"), name: "Kebun Data", focus: "Launch the pre-order page", tags: ["AgriTech"], rung: 2, cofounders: [ID], createdAt: ago(45), updatedAt: ago(2),
      milestones: [
        task("k1", "Set a sign-up target", "done"),
        task("k2", "Launch a landing page", "doing", { assignee: m("lina"), due: inDays(5) }),
        task("k3", "Share it with three communities", "todo", { assignee: ID }),
      ] },
  ];

  const widget = (id, type, variant, x, y, w, h, opts = {}) => ({ id: "wg-" + id, type, variant, x, y, w, h, opts });
  const workspaces = {
    "p-warungpay": {
      layout: [
        widget("a", "tasks", "today", 0, 0, 1, 2), widget("b", "ladder", "next", 1, 0, 1, 1), widget("c", "finance", "runway", 2, 0, 1, 1),
        widget("d", "people", "team", 3, 0, 1, 1), widget("e", "tasks", "progress", 1, 1, 3, 1), widget("f", "metrics", "row", 0, 2, 3, 1),
        widget("g", "interviews", "count", 3, 2, 1, 1), widget("h", "doc", "recent", 0, 3, 1, 2), widget("i", "finance", "chart", 1, 3, 2, 2), widget("j", "funding", "pipeline", 3, 3, 1, 2),
        widget("k", "launch", "next", 0, 5, 2, 1),
      ],
      roles: [
        { id: "ro-1", title: "Mobile developer", note: "10 hours a week, equity", filled: false },
        { id: "ro-2", title: "Product designer", note: "", filled: true },
      ],
      finance: { currency: "IDR", start: 15000000, entries: [
        { id: "f-1", date: inDays(-40), label: "Campus competition prize", kind: "in", amount: 5000000, category: "Competition prize" },
        { id: "f-2", date: inDays(-25), label: "Domain and hosting", kind: "out", amount: 450000, category: "Tools & software" },
        { id: "f-3", date: inDays(-20), label: "Interview vouchers", kind: "out", amount: 600000, category: "Operations" },
        { id: "f-4", date: inDays(-8), label: "Design tool seat", kind: "out", amount: 230000, category: "Tools & software" },
        { id: "f-5", date: inDays(-3), label: "Flyers for warung visits", kind: "out", amount: 150000, category: "Marketing" },
      ] },
      marketing: { campaigns: [
        { id: "c-1", name: "Campus WhatsApp groups", channel: "WhatsApp", status: "live", budget: 0, leads: 18 },
        { id: "c-2", name: "Warung visits in Tebet", channel: "Events", status: "done", budget: 150000, leads: 9 },
      ] },
      gtm: { done: { "g0.0": true, "g0.1": true }, custom: [] },
      funding: { items: [
        { id: "u-1", name: "Campus incubator seed grant", kind: "grant", amount: 25000000, deadline: inDays(21), status: "applying", link: "", note: "" },
        { id: "u-2", name: "Student fintech competition", kind: "competition", amount: 50000000, deadline: inDays(40), status: "researching", link: "", note: "" },
      ] },
      metrics: { items: [
        { id: "k-1", name: "Warung owners interviewed", unit: "people", target: 10, points: [{ d: inDays(-21), v: 2 }, { d: inDays(-14), v: 5 }, { d: inDays(-7), v: 7 }, { d: inDays(-2), v: 8 }] },
        { id: "k-2", name: "Would pay", unit: "%", target: 60, points: [{ d: inDays(-14), v: 40 }, { d: inDays(-7), v: 57 }, { d: inDays(-2), v: 62 }] },
      ] },
      interviews: { items: [
        { id: "v-1", who: "Bu Siti, warung in Tebet", date: inDays(-21), pain: "Keeps kasbon (credit) in a notebook and loses track of who owes what.", quote: "Every month there’s money I never get back.", pay: "yes" },
        { id: "v-2", who: "Pak Dedi, warung near campus", date: inDays(-20), pain: "Runs out of cigarettes and instant noodles without noticing.", quote: "I only know when a customer asks.", pay: "maybe" },
        { id: "v-3", who: "Bu Ani, warung in Pancoran", date: inDays(-18), pain: "Suppliers’ prices change and she can’t compare.", quote: "", pay: "no" },
        { id: "v-4", who: "Pak Hendra, kiosk at a bus stop", date: inDays(-16), pain: "Kasbon again. About 15 regulars on credit.", quote: "If my phone could remind them, I wouldn’t have to.", pay: "yes" },
        { id: "v-5", who: "Bu Rina, warung with a freezer", date: inDays(-13), pain: "Doesn’t know which products make money.", quote: "", pay: "maybe" },
        { id: "v-6", who: "Pak Agus, two warungs", date: inDays(-10), pain: "Can’t see both shops’ sales without visiting.", quote: "My nephew runs the other one. I trust him, but still.", pay: "yes" },
        { id: "v-7", who: "Bu Yuni, warung and laundry", date: inDays(-6), pain: "Mixes the two businesses’ money.", quote: "", pay: "maybe" },
        { id: "v-8", who: "Pak Budi, warung in Manggarai", date: inDays(-2), pain: "Kasbon. Wants customers to pay by transfer.", quote: "QRIS is fine, but they still ask for credit.", pay: "yes" },
      ] },
      canvas: {
        problem: "Warung owners lose track of credit (kasbon) and run out of stock without noticing.",
        solution: "A simple ledger with reminders, in Bahasa Indonesia, that works on cheap phones.",
        uvp: "Know who owes you and what to restock, in one tap.",
        advantage: "Relationships from 40 warung visits, and data on what regulars buy.",
        segments: "Warung owners in South Jakarta with 20 or more regulars on credit.",
        metrics: "Active ledgers per week. Kasbon recorded per owner.",
        channels: "Visits, campus WhatsApp groups, distributor sales reps.",
        costs: "Hosting, field visits, two part-time developers.",
        revenue: "Rp 25.000 a month after a free month.",
      },
      ladder: { done: {} },
      launch: { done: { "idea.0": true, "idea.1": true, "structure.0": true } }, // part way through choosing a structure
      // Sample obligations: neutral names, no claims about what the law requires.
      compliance: { items: [
        { id: "cm-1", name: "Monthly bookkeeping close", every: "month", due: inDays(6), done: false, note: "With the accountant", sample: true },
        { id: "cm-2", name: "Quarterly review with a tax adviser", every: "quarter", due: inDays(24), done: false, note: "", sample: true },
        { id: "cm-3", name: "Renew the domain and business email", every: "year", due: inDays(-2), done: false, note: "", sample: true },
      ] },
      // Sample meetings for the homepage's Today. guestdb.js keeps them on today's date.
      meetings: { items: [
        { id: "mt-1", title: "Team stand-up", date: inDays(0), start: "09:30", end: "09:45", sample: true },
        { id: "mt-2", title: "Interview at a warung in Tebet", date: inDays(0), start: "14:00", end: "15:00", sample: true },
      ] },
    },
    "p-rantang": { layout: [], roles: [], finance: { currency: "IDR", start: 0, entries: [] }, marketing: { campaigns: [] }, gtm: { done: {}, custom: [] }, funding: { items: [] }, metrics: { items: [] }, interviews: { items: [] }, canvas: {}, ladder: { done: {} } },
    "p-kebundata": {
      meetings: { items: [{ id: "mt-3", title: "Call with a notary", date: inDays(0), start: "16:30", end: "17:00", sample: true }] },
      layout: [widget("ka", "tasks", "today", 0, 0, 1, 2), widget("kb", "ladder", "next", 1, 0, 1, 1), widget("kc", "metrics", "kpi", 2, 0, 1, 1, { metricId: "k-3" }), widget("kd", "people", "team", 3, 0, 1, 1), widget("ke", "marketing", "leads", 1, 1, 1, 1), widget("kf", "canvas", "uvp", 2, 1, 2, 1)],
      roles: [{ id: "ro-3", title: "Backend developer", note: "Offline-first sync", filled: false }],
      finance: { currency: "IDR", start: 8000000, entries: [{ id: "f-6", date: inDays(-15), label: "Field trip to Sleman", kind: "out", amount: 900000, category: "Operations" }] },
      marketing: { campaigns: [{ id: "c-3", name: "Farmer group meetings", channel: "Community", status: "live", budget: 0, leads: 34 }] },
      gtm: { done: { "g0.0": true, "g3.0": true }, custom: [] },
      funding: { items: [{ id: "u-3", name: "Regional agritech grant", kind: "grant", amount: 40000000, deadline: inDays(30), status: "applying", link: "", note: "" }] },
      metrics: { items: [{ id: "k-3", name: "Pre-order sign-ups", unit: "farmers", target: 50, points: [{ d: inDays(-10), v: 12 }, { d: inDays(-5), v: 23 }, { d: inDays(-1), v: 34 }] }] },
      interviews: { items: [] },
      canvas: { uvp: "Your group’s yields and prices, on a phone, without signal." },
      ladder: { done: {} },
    },
  };

  const doc = (id, projectId, title, body, by, days, hours = 9) => ({ id: "d-" + id, projectId, title, body, createdBy: by, updatedBy: by, createdAt: ago(days + 1, hours), updatedAt: ago(days, hours), sample: true });
  const docs = [
    doc("brief", "p-warungpay", "Problem brief",
      "<h2>The problem</h2><p>Warung owners sell on credit to regulars and keep the tally in a notebook. Money goes missing every month, and they only notice stock is gone when a customer asks.</p><h2>Who we’re building for</h2><p>Owners of a single warung in South Jakarta with 20 or more regulars on credit.</p><h2>How they solve it today</h2><p>Notebooks, memory, and asking family members to remember. A few use a general notes app.</p><h2>Our idea</h2><p>A ledger that records kasbon in one tap and sends polite reminders, in Bahasa Indonesia, on any phone.</p><h2>What we need</h2><p>A mobile developer for ten hours a week, ideally with Flutter.</p>", ID, 10),
    doc("notes", "p-warungpay", "Interview notes, week 2",
      "<h2>Who we spoke to</h2><p>Four more owners, all within walking distance of campus.</p><h2>The pattern</h2><ul><li>Kasbon came up unprompted in every conversation.</li><li>Nobody wants to type names: they want to pick from a list.</li><li>Reminders are welcome if they sound friendly.</li></ul><h2>Quotes that stood out</h2><blockquote>“If my phone could remind them, I wouldn’t have to.”</blockquote><h2>What we’ll do next</h2><p>Sketch the record-a-kasbon flow and test it with Bu Siti and Pak Hendra.</p>", ID, 4),
    doc("sketch", "p-warungpay", "Sign-up flow sketch",
      "<p><em>Dewi’s notes on the current flow.</em></p><h2>Today</h2><ol><li>Phone number</li><li>Shop name and address</li><li>Products you sell</li></ol><h2>Proposal</h2><p>Ask for the phone number only. Shop name can come from the first kasbon. Products are learned from what gets recorded.</p><h2>Open question</h2><p>Do we need the address at all before the first payment?</p>", m("dewi"), 0, 3),
    doc("copy", "p-kebundata", "Pre-order page copy",
      "<h2>Headline</h2><p>Your group’s harvest, on one page.</p><h2>Who it’s for</h2><p>Farmer groups (kelompok tani) in Sleman and Bantul.</p><h2>The offer</h2><p>Record yields and prices for a season free. Pay per group after that.</p><h2>Call to action</h2><p>Put your group’s name down for the first season.</p>", m("lina"), 3),
  ];

  /* ---------- Sprints: the catalogue is SandBox's own (data.js), not sample data ---------- */
  const lobbies = Mori.data.sprintLobbies;
  const sprints = Mori.data.sprints;

  /* ---------- Vetted partners (sample entries only), for the partner directory ---------- */
  // [BRAYDEN: real partners and member prices] Prices are placeholders.
  const partner = (id, kind, name, city, services, price) => ({ id: "pt-" + id, kind, name, city, services, price, sample: true, vetted: true });
  const partners = [
    partner("notary", "notary", "Kantor Notaris Sampel & Rekan", "Jakarta Selatan", ["Statement of establishment (PT Perorangan)", "Deed of establishment (PT or CV)", "Company changes"], "[placeholder] member price"),
    partner("lawyer", "legal", "Sampel Law Office", "Jakarta Pusat", ["Founders’ agreement review", "NDA and IP assignment", "Sector licences"], "[placeholder] member price"),
    partner("accountant", "accounting", "Sampel Accounting", "Bandung", ["Bookkeeping set-up", "Monthly accounts", "Payroll"], "[placeholder] member price"),
    partner("tax", "tax", "Sampel Tax Advisory", "Jakarta Selatan", ["Company NPWP registration", "Monthly and annual filings", "Tax planning for first revenue"], "[placeholder] member price"),
    partner("design", "design", "Studio Sampel", "Yogyakarta", ["Brand identity", "Packaging", "Pitch deck design"], "[placeholder] member price"),
  ];

  /* ---------- Programmes (grants, incubators, competitions), for the program navigator ---------- */
  // [BRAYDEN: real list later] Every programme here is made up.
  const programme = (id, kind, name, rungs, sectors, regions, deadlineIn, amount, blurb) => ({ id: "pg-" + id, kind, name, rungs, sectors, regions, deadline: inDays(deadlineIn), amount, blurb, sample: true });
  const programs = [
    programme("campus-seed", "grant", "Sample Campus Incubator Seed Grant", [0, 1, 2], ["Any"], ["DKI Jakarta", "West Java"], 21, 25000000, "For student teams with a tested problem. Six months of space and mentoring."),
    programme("fintech-cup", "competition", "Sample Student Fintech Cup", [1, 2, 3], ["FinTech", "Payments"], ["Any"], 40, 50000000, "Pitch competition for payments and lending ideas with early proof."),
    programme("agri-grant", "grant", "Sample Regional Agritech Grant", [2, 3, 4], ["AgriTech", "Agriculture"], ["DI Yogyakarta", "Central Java", "East Java"], 30, 40000000, "For teams with a prototype farmers have used."),
    programme("food-accel", "incubator", "Sample Food Founders Accelerator", [1, 2, 3], ["Food & Beverage", "FoodTech"], ["Any"], 55, 0, "Twelve weeks, a shared kitchen and a demo day. No equity."),
    programme("women-founders", "grant", "Sample Women Founders Fund", [0, 1, 2, 3], ["Any"], ["Any"], 75, 15000000, "Small grants for women-led teams at any early stage."),
  ];

  /* ---------- A sprint spot Nadia has saved ---------- */
  const spots = [{ id: "fin-problem", at: ago(1) }];

  Mori.sample = { persona, members, links, messages, projects, workspaces, docs, lobbies, sprints, spots, partners, programs, me: ID };
})();
