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

  /* Milestone ladder — rung 0 to 5 */
  ladder: [
    { rung: 0, stage: "Idea declared",      proof: "A one-page problem brief, the hours you have and the role you need.", time: "One evening",         toolkit: "Problem brief template",                                  opens: "A startup page in the MORI Network and a place in a sprint lobby." },
    { rung: 1, stage: "Problem understood", proof: "Notes from 8–10 conversations with people who have the problem, plus a one-page summary.", time: "One two-week sprint", toolkit: "Interview script and summary template",                 opens: "“Problem understood” on your startup page, with the summary visible to specialists." },
    { rung: 2, stage: "Solution tested",    proof: "A prototype, or a first sample for physical products, tested with five users.", time: "One or two sprints",  toolkit: "Prototype testing guide, pitch deck and financial model", opens: "A pitch-ready startup page." },
    { rung: 3, stage: "Demand shown",       proof: "A landing or pre-order page that reaches a sign-up target set in advance.", time: "One or two sprints",  toolkit: "Landing page and pricing guides",                         opens: "A demand figure on your startup page and higher placement in specialist searches." },
    { rung: 4, stage: "First version live", proof: "One working feature or product batch used by real users, with usage numbers.", time: "Two or more sprints", toolkit: "Founders’ agreement, NDA, IP assignment and project tools", opens: "Team roles shown on your startup page." },
    { rung: 5, stage: "Early traction",     proof: "Repeat use or revenue for four weeks running.", time: "Ongoing",             toolkit: "Marketing, branding and go-to-market frameworks",         opens: "Eligibility for leaderboards and showcases." },
  ],

  /* Starter milestones for a newly declared project, by starting rung */
  starterMilestones: [
    ["Write the one-page problem brief", "Book 8–10 problem interviews", "Summarise what you learned"],
    ["Sketch the riskiest user flow", "Build a clickable prototype", "Test it with five users"],
    ["Set a sign-up target", "Launch a landing page", "Share it with three communities"],
    ["Pick the one feature to ship", "Recruit specialists for a Build sprint", "Ship it to the first users"],
    ["Track weekly active use", "Talk to five repeat users", "Hit four straight weeks of use"],
    ["Update the financial model", "Plan the go-to-market push", "Prepare for showcases"],
  ],

  insights: [
    { id: "n1", title: "MatchGraph hits 10k successful intros", team: "Signal Rooms",   time: "Today",     blurb: "A new routing model improved introduction acceptance by 21% week-over-week." },
    { id: "n2", title: "Investor CRM v0.9 Release",             team: "Investor Tools", time: "Yesterday", blurb: "Pipeline stages, smart reminders, and email sync enter public beta." },
    { id: "n3", title: "Sandbox Jobs launches talent campaign", team: "Growth",         time: "2d ago",    blurb: "Top-of-funnel playbook leads to 2.3× increase in qualified candidates." },
  ],
};
