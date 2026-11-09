/* ==========================================================================
   Mori: Sandbox — option lists and fixed content
   --------------------------------------------------------------------------
   Roles, onboarding options, the milestone ladder (from the "SandBox
   Milestone Ladder" core-kit doc) and the homepage insights. Everything else
   a member sees is their own: projects and settings are kept by state.js,
   other members and connection requests come from Supabase.
   ========================================================================== */
window.Mori = window.Mori || {};

Mori.data = {
  roles: {
    founder:    { label: "Founder",    hue: "orange", icon: "rocket", blurb: "I have an idea or an early startup and I’m looking for people to build it with." },
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
    { rung: 3, stage: "Demand shown",       proof: "A landing or pre-order page that reaches a sign-up target set in advance.", time: "One or two sprints",  toolkit: "Landing page and pricing guides",                         opens: "A demand figure on your startup page and higher placement in specialist searches." },
    { rung: 4, stage: "First version live", proof: "One working feature or product batch used by real users, with usage numbers.", time: "Two or more sprints", toolkit: "Founders’ agreement, NDA, IP assignment and project tools", opens: "Team roles shown on your startup page." },
    { rung: 5, stage: "Early traction",     proof: "Repeat use or revenue for four weeks running.", time: "Ongoing",             toolkit: "Marketing, branding and go-to-market frameworks",         opens: "Eligibility for leaderboards and showcases." },
  ],

  /* Starter tasks on a newly declared project's board, by starting rung */
  starterTasks: [
    ["Write the one-page problem brief", "Book 8–10 problem interviews", "Summarise what you learned"],
    ["Sketch the riskiest user flow", "Build a clickable prototype", "Test it with five users"],
    ["Set a sign-up target", "Launch a landing page", "Share it with three communities"],
    ["Pick the one feature to ship", "Bring specialists onto the team", "Ship it to the first users"],
    ["Track weekly active use", "Talk to five repeat users", "Hit four straight weeks of use"],
    ["Update the financial model", "Plan the go-to-market push", "Prepare for showcases"],
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
      { group: "Legal & admin", items: ["Choose a business entity (for example a PT or CV)", "Register the business (for example an NIB through OSS)", "Check that your name and brand are free to use"] },
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
        body: "<p><em>Topics to agree on and write down. Have a lawyer review the final agreement.</em></p><ul><li>Roles and responsibilities</li><li>Time each founder commits</li><li>Equity split and vesting</li><li>Who owns the intellectual property</li><li>How decisions are made</li><li>What happens if someone leaves</li></ul>" },
      { id: "update", name: "Monthly update", toolkit: "", blurb: "A short update for mentors, investors and your team.",
        body: "<h2>Highlights</h2><ul><li></li></ul><h2>Numbers</h2><ul><li>Users or customers:</li><li>Revenue:</li><li>Cash and runway:</li></ul><h2>Challenges</h2><p></p><h2>Asks</h2><p>How others can help this month.</p>" },
      { id: "meeting", name: "Meeting notes", toolkit: "", blurb: "Agenda, decisions and who does what next.",
        body: "<p><b>Date:</b> </p><p><b>People:</b> </p><h2>Agenda</h2><ul><li></li></ul><h2>Decisions</h2><ul><li></li></ul><h2>Next steps</h2><ul><li></li></ul>" },
    ],
  },

  insights: [
    { id: "n1", title: "MatchGraph hits 10k successful intros", team: "Signal Rooms",   time: "Today",     blurb: "A new routing model improved introduction acceptance by 21% week-over-week." },
    { id: "n2", title: "Investor CRM v0.9 Release",             team: "Investor Tools", time: "Yesterday", blurb: "Pipeline stages, smart reminders, and email sync enter public beta." },
    { id: "n3", title: "Sandbox Jobs launches talent campaign", team: "Growth",         time: "2d ago",    blurb: "Top-of-funnel playbook leads to 2.3× increase in qualified candidates." },
  ],
};
