/* ==========================================================================
   Mori: Sandbox — option lists and fixed content
   --------------------------------------------------------------------------
   Roles, onboarding options, the milestone ladder (from the "SandBox
   Milestone Ladder" core-kit doc) and the subscription ladder. Everything else
   a member sees is their own: projects and settings are kept by state.js,
   other members and connection requests come from Supabase.
   ========================================================================== */
window.Mori = window.Mori || {};

Mori.data = {
  roles: {
    founder:    { label: "Founder",    hue: "orange", icon: "rocket", blurb: "I have an idea or an early startup and want to build it into a real business with the right people." },
    specialist: { label: "Specialist", hue: "blue",   icon: "code",   blurb: "I bring a skill (design, engineering, growth, legal…) and want to join or co-found a venture." },
  },

  openTypes: { cofound: "Open to co-found", join: "Open to join a team" },

  /* What a specialist does (onboarding asks right after the role) */
  specialties: [
    "Software Engineer", "Frontend Developer", "Backend Developer", "Mobile Developer", "Data Scientist",
    "AI / ML Engineer", "UI/UX Designer", "Graphic Designer", "Product Manager", "Marketing & Growth",
    "Sales & Business Development", "Finance & Accounting", "Legal", "Operations", "Content & Copywriting",
    "Video & Photography", "Hardware Engineer",
  ],

  /* ---------- Onboarding options ---------- */
  regions: [
    { group: "Indonesia", items: ["Aceh", "North Sumatra", "West Sumatra", "Riau", "Riau Islands", "Jambi", "Bengkulu", "South Sumatra", "Bangka Belitung Islands", "Lampung", "Banten", "DKI Jakarta", "West Java", "Central Java", "DI Yogyakarta", "East Java", "Bali", "West Nusa Tenggara", "East Nusa Tenggara", "West Kalimantan", "Central Kalimantan", "South Kalimantan", "East Kalimantan", "North Kalimantan", "North Sulawesi", "Gorontalo", "Central Sulawesi", "West Sulawesi", "South Sulawesi", "Southeast Sulawesi", "Maluku", "North Maluku", "Papua", "West Papua", "Southwest Papua", "Central Papua", "Highland Papua", "South Papua"] },
    { group: "Outside Indonesia", items: ["Southeast Asia", "East Asia", "Australia & New Zealand", "North America", "Europe", "Middle East", "Elsewhere"] },
  ],
  experience: ["0-2 years", "3-5 years", "6-10 years", "10+ years"], // values match the database check
  employment: ["Student", "Employed full-time", "Employed part-time", "Freelance / self-employed", "Building a startup full-time", "Between jobs"],
  popularIndustries: ["FinTech", "E-commerce", "EdTech", "HealthTech", "AgriTech", "SaaS", "Logistics & Supply Chain", "Food & Beverage", "Creator Economy", "Climate Tech", "Artificial Intelligence", "Marketplaces"],
  industries: [
    "Advertising & Marketing", "Aerospace", "AgriTech", "Agriculture", "Aquaculture & Fisheries", "Architecture", "Artificial Intelligence", "Arts & Culture",
    "Automotive", "Banking", "Beauty & Personal Care", "Biotechnology", "Blockchain & Web3", "Clean Energy", "Climate Tech", "Cloud & DevOps", "Construction",
    "Consulting", "Consumer Electronics", "Creator Economy", "Cybersecurity", "Data & Analytics", "Design", "Developer Tools", "E-commerce", "EdTech", "Education",
    "Electric Vehicles", "Energy", "Entertainment & Media", "Environmental Services", "Events & Weddings", "Fashion & Apparel", "FinTech", "Fitness & Wellness",
    "Food & Beverage", "FoodTech", "Gaming", "Government & Public Sector", "Halal Economy", "Hardware", "Healthcare", "HealthTech", "Hospitality", "HR & Recruitment",
    "InsurTech", "Interior Design", "Internet of Things", "Islamic Finance", "Journalism & Publishing", "Legal & LegalTech", "Logistics & Supply Chain", "Manufacturing",
    "Maritime", "Marketplaces", "Mental Health", "Mining", "Mobility & Transportation", "MSME (UMKM) Services", "Music", "Non-profit & Social Impact", "Payments",
    "Pet Care", "Pharmaceuticals", "Photography & Film", "Productivity Tools", "PropTech & Real Estate", "Retail", "Robotics", "SaaS", "Smart Cities", "Social Media",
    "Space Tech", "Sports", "Telecommunications", "Textiles", "Tourism & Travel", "Waste & Recycling", "Water",
  ],
  languages: ["Bahasa Indonesia", "English", "Javanese", "Sundanese", "Malay", "Mandarin", "Cantonese", "Hokkien", "Japanese", "Korean", "Arabic", "Hindi", "Tagalog", "Thai", "Vietnamese", "Dutch", "German", "French", "Spanish", "Balinese", "Minangkabau", "Batak", "Buginese", "Madurese"],
  languageLevels: ["Native", "Fluent", "Professional", "Conversational", "Basic"],

  /* Extra profile links, shown next to the CV */
  linkTypes: [
    { id: "github",    label: "GitHub",      icon: "code",     hint: "github.com/username" },
    { id: "website",   label: "Website",     icon: "globe",    hint: "yourname.com" },
    { id: "portfolio", label: "Portfolio",   icon: "layers",   hint: "your portfolio page" },
    { id: "x",         label: "X (Twitter)", icon: "at",       hint: "x.com/username" },
    { id: "instagram", label: "Instagram",   icon: "camera",   hint: "instagram.com/username" },
    { id: "tiktok",    label: "TikTok",      icon: "megaphone", hint: "tiktok.com/@username" },
    { id: "youtube",   label: "YouTube",     icon: "radio",    hint: "youtube.com/@channel" },
    { id: "behance",   label: "Behance",     icon: "layers",   hint: "behance.net/username" },
    { id: "dribbble",  label: "Dribbble",    icon: "target",   hint: "dribbble.com/username" },
    { id: "medium",    label: "Medium",      icon: "file",     hint: "medium.com/@username" },
    { id: "other",     label: "Other link",  icon: "link",     hint: "https://…" },
  ],

  /* Milestone ladder — rung 0 to 5 */
  ladder: [
    { rung: 0, stage: "Idea declared",      proof: "A one-page problem brief, the hours you have and the role you need.", time: "One evening",         toolkit: "Problem brief template",                                  opens: "A startup page in the MORI Network and a place in a sprint lobby." },
    { rung: 1, stage: "Problem understood", proof: "Notes from 8–10 conversations with people who have the problem, plus a one-page summary.", time: "One two-week sprint", toolkit: "Interview script and summary template",                 opens: "“Problem understood” on your startup page, with the summary visible to specialists." },
    { rung: 2, stage: "Solution tested",    proof: "A prototype, or a first sample for physical products, tested with five users.", time: "One or two sprints",  toolkit: "Prototype testing guide, pitch deck and financial model", opens: "A pitch-ready startup page." },
    { rung: 3, stage: "Demand shown",       proof: "A landing or pre-order page that reaches a sign-up target set in advance.", time: "One or two sprints",  toolkit: "Landing page and pricing guides, business registration checklist", opens: "A demand figure on your startup page." },
    { rung: 4, stage: "First version live", proof: "One working feature or product batch used by real users, with usage numbers.", time: "Two or more sprints", toolkit: "Founders’ agreement, equity and vesting, NDA and IP assignment", opens: "Team roles shown on your startup page." },
    { rung: 5, stage: "Early traction",     proof: "Repeat use or revenue for four weeks running.", time: "Ongoing",             toolkit: "Go-to-market frameworks and sector licence checklist",         opens: "Sessions with vetted mentors and investors, once they’re available." },
  ],

  /* Starter tasks on a newly declared project's board, by starting rung */
  starterTasks: [
    ["Write the one-page problem brief", "Book 8–10 problem interviews", "Summarise what you learned"],
    ["Sketch the riskiest user flow", "Build a clickable prototype", "Test it with five users"],
    ["Set a sign-up target", "Launch a landing page", "Share it with three communities"],
    ["Pick the one feature to ship", "Bring specialists onto the team", "Ship it to the first users"],
    ["Track weekly active use", "Talk to five repeat users", "Hit four straight weeks of use"],
    ["Update the financial model", "Plan the go-to-market push", "Write your first investor update"],
  ],

  /* ---------- Project planner ---------- */
  planner: {
    /* The proof for each rung, as steps the team ticks off (Milestone ladder).
       The project's overall progress is its rung plus the share of the next
       rung's steps that are done. */
    ladderSteps: {
      1: ["Talk to 8–10 people who have the problem", "Write a one-page summary of what you learned"],
      2: ["Build a prototype, or a first sample of a physical product", "Test it with five users", "Write down what you’ll change"],
      3: ["Set a sign-up or pre-order target in advance", "Launch a landing or pre-order page", "Reach the target"],
      4: ["Ship one working feature or product batch", "Get it used by real users", "Track the usage numbers"],
      5: ["Week 1 of repeat use or revenue", "Week 2", "Week 3", "Week 4 running"],
    },

    /* Go-to-market checklist */
    gtm: [
      { group: "Positioning", items: ["Describe your ideal customer in one paragraph", "Write a one-line value proposition", "List your top three alternatives and how you’re different"] },
      { group: "Pricing", items: ["Choose a pricing model", "Set launch prices", "Ask five customers what they’d pay"] },
      { group: "Channels", items: ["Pick two or three channels to start with", "Set up a way to count sign-ups or sales", "Prepare your launch content"] },
      { group: "Launch", items: ["Build a landing page", "Line up ten early users or pilot customers", "Set a launch date and plan the announcement"] },
      { group: "Sales & retention", items: ["Write a short pitch or demo script", "Set up a way to collect feedback", "Plan how new customers get started"] },
      { group: "Legal & admin", items: ["Choose a business entity (for example a PT or CV)", "Register the business (for example an NIB through OSS)", "Check that your name and brand are free to use", "Sign a founders’ agreement", "Get a company tax number (NPWP)", "Check your sector’s licences (for example halal certification for food and drink)"] },
    ],

    marketingChannels: ["Instagram", "TikTok", "LinkedIn", "X", "YouTube", "WhatsApp", "Email", "Paid ads", "SEO & content", "Events", "Community", "Partnerships", "Referrals", "Other"],
    campaignStatus: { planned: "Planned", live: "Live", done: "Done" },

    // What money comes in from, and goes out on (the ledger's category menu follows "Money in" / "Money out").
    financeCategories: {
      in: ["Sales", "Investment", "Grant", "Competition prize", "Loan", "Other income"],
      out: ["Salaries & contractors", "Marketing", "Tools & software", "Operations", "Rent", "Legal & admin", "Inventory", "Other"],
    },
    currencies: { IDR: { symbol: "Rp", decimals: 0 }, USD: { symbol: "$", decimals: 0 }, SGD: { symbol: "S$", decimals: 0 }, EUR: { symbol: "€", decimals: 0 } },

    fundingKinds: { grant: "Grant", competition: "Competition", accelerator: "Accelerator", angel: "Angel", vc: "Venture capital", loan: "Loan", other: "Other" },
    fundingStatus: { researching: "Researching", applying: "Applying", submitted: "Submitted", won: "Won", lost: "Not this time" },
    fundingTips: [
      ["Government programmes", "Ministries and local governments run startup and MSME programmes with funding, mentoring or both."],
      ["Campus incubators", "Many universities back student and alumni founders with small grants and space."],
      ["Startup competitions", "Pitch and business-plan competitions give prize money, visibility and feedback."],
      ["Accelerators", "Programmes that invest a small amount for equity, with a few months of coaching."],
      ["Angel investors", "Individuals who invest early, often in founders they know or were introduced to."],
      ["MSME loans", "Bank loans for small businesses, for example the government-backed KUR, suit businesses with steady sales."],
      ["Certification support", "For food and drink, the government runs a free halal self-declare scheme for micro and small businesses."],
    ],

    interviewPay: { yes: "Would pay", maybe: "Maybe", no: "Wouldn’t pay" },
    canvas: [
      ["problem", "Problem", "The top three problems your customers have."],
      ["solution", "Solution", "The simplest thing that solves each one."],
      ["uvp", "Unique value proposition", "One clear sentence on why you’re different and worth paying for."],
      ["advantage", "Unfair advantage", "What can’t easily be copied or bought."],
      ["segments", "Customer segments", "Who has the problem; who your first customers are."],
      ["metrics", "Key metrics", "The numbers that tell you it’s working."],
      ["channels", "Channels", "How you reach your customers."],
      ["costs", "Cost structure", "What it costs to build, run and grow."],
      ["revenue", "Revenue streams", "How you make money, and how much."],
    ],

    /* Document templates (Toolkits → Use template) */
    templates: [
      { id: "brief", name: "Problem brief", toolkit: "Problem brief template", blurb: "The one page a specialist reads to judge your idea.",
        body: "<h2>The problem</h2><p>Who has it, how often, and what it costs them.</p><h2>Who we’re building for</h2><p>The first customers you’ll serve.</p><h2>How they solve it today</h2><p>The alternatives and why they fall short.</p><h2>Our idea</h2><p>What you’ll build first, in a few lines.</p><h2>What we need</h2><ul><li>Hours we can give each week:</li><li>Roles we need:</li></ul>" },
      { id: "interview", name: "Interview script", toolkit: "Interview script and summary template", blurb: "Questions for problem interviews that don’t lead the answer.",
        body: "<p><em>Aim: understand the problem, not pitch the idea.</em></p><h2>Warm up</h2><ul><li>Tell me about your role and a typical week.</li></ul><h2>The problem</h2><ul><li>When did this last happen? Walk me through it.</li><li>What did you try? What did it cost you?</li><li>How do you deal with it today?</li></ul><h2>Wrap up</h2><ul><li>Who else should I talk to?</li><li>Can I follow up when we have something to show?</li></ul><h2>Notes</h2><p></p>" },
      { id: "summary", name: "Interview summary", toolkit: "Interview script and summary template", blurb: "What 8–10 conversations taught you, on one page.",
        body: "<h2>Who we spoke to</h2><p>Number of interviews, and who they were.</p><h2>The pattern</h2><ul><li>Most common pain:</li><li>How they solve it today:</li><li>What they’d pay for:</li></ul><h2>Quotes that stood out</h2><blockquote>“…”</blockquote><h2>What we’ll do next</h2><p></p>" },
      { id: "pitch", name: "Pitch deck outline", toolkit: "Prototype testing guide, pitch deck and financial model", blurb: "Ten slides, in the order investors expect.",
        body: "<ol><li>Title: name, one-line pitch</li><li>Problem</li><li>Solution</li><li>Why now</li><li>Market size</li><li>Business model</li><li>Traction so far</li><li>Competition</li><li>Team</li><li>The ask: what you’re raising and what it gets you to</li></ol>" },
      { id: "gtm", name: "Go-to-market plan", toolkit: "Marketing, branding and go-to-market frameworks", blurb: "Who you’ll sell to first, how, and at what price.",
        body: "<h2>First customers</h2><p></p><h2>Positioning</h2><p>For [customer] who [need], [product] is a [category] that [benefit]. Unlike [alternative], we [difference].</p><h2>Pricing</h2><p></p><h2>Channels</h2><ul><li></li></ul><h2>Launch plan</h2><ul><li>Date:</li><li>Goal:</li></ul>" },
      { id: "agreement", name: "Founders’ agreement checklist", toolkit: "Founders’ agreement, NDA, IP assignment and project tools", blurb: "What co-founders should agree on early. Not legal advice.",
        body: "<p><em>Guidance, not legal advice. Have a lawyer review the final agreement before anyone signs.</em></p><h2>Roles and responsibilities</h2><ul><li>Who leads what (product, sales, operations, finance)</li><li>Titles, if any</li></ul><h2>Time each founder commits</h2><ul><li>Hours a week, now and after launch</li><li>Other jobs or studies to declare</li></ul><h2>Equity split</h2><ul><li>Each founder’s share, and why</li><li>Shares kept back for future teammates</li></ul><h2>Vesting (with a cliff)</h2><ul><li>Vesting period, for example four years</li><li>Cliff, for example one year</li><li>What happens to unvested shares</li></ul><h2>Intellectual property</h2><ul><li>Who owns the code, designs, brand and ideas made so far</li><li>Assigning all of it to the company</li></ul><h2>How decisions are made</h2><ul><li>Day-to-day decisions</li><li>Big decisions that need everyone (raising money, selling, new founders)</li><li>Breaking a deadlock</li></ul><h2>What happens if someone leaves</h2><ul><li>Good leaver and bad leaver</li><li>Buying back shares</li><li>Handing over work and accounts</li></ul><h2>Confidentiality</h2><ul><li>What stays inside the team</li><li>For how long, including after someone leaves</li></ul><h2>Language</h2><p>Agreements with Indonesian parties are generally written in Bahasa Indonesia, often alongside English. Check with a lawyer.</p><h2>Legal structure</h2><p>A PT Perorangan can only be set up by one founder, an Indonesian citizen, for a micro or small business. A team of co-founders needs a different structure, such as a regular PT or a CV. Ask a vetted partner which fits.</p>" },
      { id: "update", name: "Monthly update", toolkit: "", blurb: "A short update for mentors, investors and your team.",
        body: "<h2>Highlights</h2><ul><li></li></ul><h2>Numbers</h2><ul><li>Users or customers:</li><li>Revenue:</li><li>Cash and runway:</li></ul><h2>Challenges</h2><p></p><h2>Asks</h2><p>How others can help this month.</p>" },
      { id: "meeting", name: "Meeting notes", toolkit: "", blurb: "Agenda, decisions and who does what next.",
        body: "<p><b>Date:</b> </p><p><b>People:</b> </p><h2>Agenda</h2><ul><li></li></ul><h2>Decisions</h2><ul><li></li></ul><h2>Next steps</h2><ul><li></li></ul>" },
      { id: "equity", name: "Equity split and vesting worksheet", toolkit: "Founders’ agreement, NDA, IP assignment and project tools", blurb: "Agree who owns what, and how it vests.",
        body: "<p><em>Guidance, not legal advice. Have a lawyer review the final agreement before anyone signs.</em></p><h2>What each founder brings</h2><ul><li>Time committed</li><li>Skills and role</li><li>Money or assets put in</li><li>Work done before today</li></ul><h2>The split</h2><ul><li>Founder 1: %</li><li>Founder 2: %</li><li>Kept back for future teammates: %</li></ul><h2>Vesting</h2><ul><li>Vesting period:</li><li>Cliff:</li><li>What vests each month after the cliff:</li><li>If the company is sold before it’s all vested:</li></ul><h2>Review</h2><p>Write the split into your founders’ agreement, and have a vetted lawyer review both before anyone signs.</p>" },
      { id: "ndaip", name: "NDA and IP assignment checklist", toolkit: "Founders’ agreement, NDA, IP assignment and project tools", blurb: "Protect the idea before you share it.",
        body: "<p><em>Guidance, not legal advice. Have a lawyer review the final agreement before anyone signs.</em></p><h2>Before you share the idea</h2><ul><li>What counts as confidential</li><li>Who may see it, and for what purpose</li><li>How long it stays confidential</li><li>What happens to shared material afterwards</li></ul><h2>Assigning intellectual property</h2><ul><li>List what’s been made: code, designs, brand, content, research</li><li>Who made each piece, and when</li><li>Each founder and contributor assigns it to the company</li><li>Freelancers and specialists sign an assignment before they start</li></ul><h2>Language</h2><p>Agreements with Indonesian parties are generally written in Bahasa Indonesia, often alongside English. Check with a lawyer.</p><h2>Review</h2><p>Ask a vetted lawyer to review your NDA and IP assignment before you use them.</p>" },
      { id: "registration", name: "Business registration checklist", toolkit: "Landing page and pricing guides", blurb: "From choosing a structure to your NIB.",
        body: "<p><em>Guidance, not legal advice. Have a vetted partner check it before you rely on it.</em></p><h2>1. Choose a structure</h2><ul><li>A PT Perorangan: one founder, an Indonesian citizen, for a micro or small business. It’s registered with a statement of establishment rather than a notary deed.</li><li>A team of co-founders: a regular PT or a CV instead.</li></ul><h2>2. Register and get an NIB</h2><ul><li>The NIB (business identification number) is issued through OSS.</li><li>It’s the business’s basic legal identity, and some financing, such as KUR, asks for it.</li></ul><h2>3. Get a company tax number (NPWP)</h2><ul><li>A registered company needs its own NPWP.</li></ul><h2>4. Open a business bank account</h2><ul><li>Keep the company’s money apart from your own.</li></ul><h2>5. Check the licences your sector needs</h2><ul><li>Use the sector licence checklist.</li></ul><h2>Review</h2><p>A vetted notary or lawyer can confirm the right structure and handle the registration.</p>" },
      { id: "licences", name: "Sector licence checklist", toolkit: "Marketing, branding and go-to-market frameworks", blurb: "Licences and certifications your sector needs.",
        body: "<p><em>Guidance, not legal advice. Have a vetted partner check it before you rely on it.</em></p><h2>Your sector</h2><ul><li>What you sell:</li><li>Who you sell to:</li><li>Licences or certifications you think you need:</li></ul><h2>Food and drink</h2><ul><li>From October 2026, halal certification is required for food and drink products of micro and small businesses.</li><li>The government runs a free self-declare scheme for micro and small businesses.</li></ul><h2>Next step</h2><p>Your launch path will list your sector’s requirements; until then, confirm them with a vetted partner.</p>" },
    ],
  },

  /* Subscription ladder. PLACEHOLDER prices and perks: to be replaced with the
     final ones. `monthly` is in rupiah; yearly billing is ten months' price. */
  plans: {
    placeholder: true,
    tiers: [
      { id: "explorer", name: "Explorer", rung: 1, monthly: 0, tagline: "Find your people and start your launch path.",
        perks: ["MORI Network: discover, connect and message", "Sprints and your verified work record", "1 project with its Mainframe and tools", "The first stages of your launch path", "Starter templates: problem brief and interview script"] },
      { id: "builder", name: "Builder", rung: 2, monthly: 49000, tagline: "For founders building in earnest.", popular: true,
        perks: ["Everything in Explorer", "Your full launch path", "Team agreements: founders’ agreement, equity and vesting, NDA and IP", "Program navigator (coming soon)", "Up to 5 projects, 5 people each, unlimited documents"] },
      { id: "founder", name: "Founder Pro", rung: 3, monthly: 129000, tagline: "Register, stay compliant and grow.",
        perks: ["Everything in Builder", "Member pricing with vetted partners", "Compliance tracker (coming soon)", "Unlimited projects and teammates", "Funding deadlines and reminders", "Word and PDF exports"] },
      { id: "studio", name: "Studio", rung: 4, monthly: 349000, tagline: "For campus incubators and entrepreneurship programmes.",
        perks: ["Everything in Founder Pro", "Run a cohort of teams in one place", "Cohort progress across projects", "Your programme’s own templates"] },
    ],
    // What each plan includes, for the comparison table (true, false or a short value).
    // Visibility can't be bought: no plan adds placement, spotlight or investor access.
    compare: [
      ["MORI Network and matching", [true, true, true, true]],
      ["Sprints and verified work record", [true, true, true, true]],
      ["Projects", ["1", "5", "Unlimited", "Unlimited"]],
      ["People on a project", ["2", "5", "Unlimited", "Unlimited"]],
      ["Documents", ["5", "Unlimited", "Unlimited", "Unlimited"]],
      ["Launch path", ["First stages", "Full", "Full", "Full"]],
      ["Team agreements", [false, true, true, true]],
      ["Program navigator (soon)", [false, true, true, true]],
      ["Compliance tracker (soon)", [false, false, true, true]],
      ["Member pricing with vetted partners", [false, false, true, true]],
      ["Cohorts", [false, false, false, true]],
    ],
  },
};
