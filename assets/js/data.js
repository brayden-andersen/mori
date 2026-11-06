/* ==========================================================================
   Mori: Sandbox — demo data
   --------------------------------------------------------------------------
   Seed content for the concept. Projects, messages and insights come from the
   original Sandbox drafts; the milestone ladder follows the "SandBox Milestone
   Ladder" core-kit doc. Per-member changes (new projects, read states, sent
   messages, settings…) are stored separately by state.js.
   `ago` values are minutes before the member's first visit.
   ========================================================================== */
window.Mori = window.Mori || {};

Mori.data = {
  roles: {
    founder:   { label: "Founder",   hue: "orange"  },
    builder:   { label: "Builder",   hue: "blue"    },
    mentor:    { label: "Mentor",    hue: "emerald" },
    investor:  { label: "Investor",  hue: "purple"  },
    recruiter: { label: "Recruiter", hue: "teal"    },
  },

  openTypes: {
    cofound: "Open to co-found",
    join:    "Open to join a team",
    mentor:  "Open to mentor",
    invest:  "Meeting founders",
  },

  /* Milestone ladder — rung 0 to 5 */
  ladder: [
    { rung: 0, stage: "Idea declared",      proof: "A one-page problem brief, the hours you have and the role you need.", time: "One evening",         toolkit: "Problem brief template",                                  opens: "A startup page in the MORI Network and a place in a sprint lobby." },
    { rung: 1, stage: "Problem understood", proof: "Notes from 8–10 conversations with people who have the problem, plus a one-page summary.", time: "One two-week sprint", toolkit: "Interview script and summary template",                 opens: "“Problem understood” on your startup page, with the summary visible to builders." },
    { rung: 2, stage: "Solution tested",    proof: "A prototype, or a first sample for physical products, tested with five users.", time: "One or two sprints",  toolkit: "Prototype testing guide, pitch deck and financial model", opens: "A pitch-ready startup page." },
    { rung: 3, stage: "Demand shown",       proof: "A landing or pre-order page that reaches a sign-up target set in advance.", time: "One or two sprints",  toolkit: "Landing page and pricing guides",                         opens: "A demand figure on your startup page and higher placement in builder searches." },
    { rung: 4, stage: "First version live", proof: "One working feature or product batch used by real users, with usage numbers.", time: "Two or more sprints", toolkit: "Founders’ agreement, NDA, IP assignment and project tools", opens: "Team roles shown on your startup page." },
    { rung: 5, stage: "Early traction",     proof: "Repeat use or revenue for four weeks running.", time: "Ongoing",             toolkit: "Marketing, branding and go-to-market frameworks",         opens: "Eligibility for leaderboards and showcases." },
  ],

  /* Starter milestones for a newly declared project, by starting rung */
  starterMilestones: [
    ["Write the one-page problem brief", "Book 8–10 problem interviews", "Summarise what you learned"],
    ["Sketch the riskiest user flow", "Build a clickable prototype", "Test it with five users"],
    ["Set a sign-up target", "Launch a landing page", "Share it with three communities"],
    ["Pick the one feature to ship", "Recruit builders for a Build sprint", "Ship it to the first users"],
    ["Track weekly active use", "Talk to five repeat users", "Hit four straight weeks of use"],
    ["Update the financial model", "Plan the go-to-market push", "Prepare for showcases"],
  ],

  projects: [
    { id: "p1",  name: "Raflesia — Talent Graph", tags: ["Marketplace", "Recruitment", "Graph"], updated_days: 2,  focus: "Awaiting pitch deck approval", rung: 2, pinned: true, owner: true, team: ["u-anna", "u-rahul", "u-kevin"],
      milestones: [{ text: "Interview 10 hiring managers", done: true }, { text: "Prototype the talent-graph search", done: true }, { text: "Test the prototype with 5 recruiters", done: true }, { text: "Get the pitch deck approved", done: false }] },
    { id: "p2",  name: "Campus Startup Hub", tags: ["Community"], updated_days: 5, focus: "Mentor matching", rung: 1, pinned: true, owner: true, team: ["u-lina", "u-sari"],
      milestones: [{ text: "Survey 3 campus entrepreneurship clubs", done: true }, { text: "Draft the mentor matching rules", done: true }, { text: "Match the first 10 mentor pairs", done: false }, { text: "Collect feedback after week one", done: false }] },
    { id: "p3",  name: "Jakarta Angels", tags: ["Fundraising", "Network"], updated_days: 7, focus: "Pitch deck v3", rung: 2, pinned: true, owner: true, team: ["u-budi", "u-rahul"],
      milestones: [{ text: "Collect feedback on deck v2", done: true }, { text: "Rewrite the problem and traction slides", done: true }, { text: "Rehearse with two angels", done: false }] },
    { id: "p4",  name: "Sandbox Jobs", tags: ["Product"], updated_days: 3, focus: "Job board UI", rung: 3, pinned: true, owner: true, team: ["u-citra", "u-anna"],
      milestones: [{ text: "Launch the waitlist page", done: true }, { text: "Reach 150 sign-ups", done: true }, { text: "Design the job board UI", done: false }, { text: "Ship the first listing flow", done: false }] },
    { id: "p5",  name: "Investor CRM", tags: ["Tools", "Fundraising"], updated_days: 1, focus: "Beta launch 0.9", rung: 4, team: ["u-rahul", "u-kevin"],
      milestones: [{ text: "Pipeline stages", done: true }, { text: "Smart reminders", done: true }, { text: "Email sync", done: true }, { text: "Public beta announcement", done: false }] },
    { id: "p6",  name: "MatchGraph Routing", tags: ["ML", "Graph"], updated_days: 0, focus: "Intro acceptance +21%", rung: 4, team: ["u-kevin"],
      milestones: [{ text: "Train the routing model", done: true }, { text: "A/B test against the rules engine", done: true }, { text: "Roll out to every room", done: true }] },
    { id: "p7",  name: "Mentor Marketplace", tags: ["Community", "Product"], updated_days: 11, focus: "Profiles revamp", rung: 2, team: ["u-sari", "u-anna"],
      milestones: [{ text: "Interview 8 mentors", done: true }, { text: "Prototype the new profiles", done: false }, { text: "Test with five founders", done: false }] },
    { id: "p8",  name: "Signal Rooms", tags: ["Network"], updated_days: 4, focus: "Room health metrics", rung: 3, team: ["u-andre"],
      milestones: [{ text: "Define room health", done: true }, { text: "Instrument active minutes", done: true }, { text: "Send a weekly health report", done: false }] },
    { id: "p9",  name: "Sandbox Docs", tags: ["Docs", "Productivity"], updated_days: 12, focus: "Search indexing", rung: 1, team: [],
      milestones: [{ text: "Audit the toolkit library", done: true }, { text: "Index templates for search", done: false }, { text: "Usability-test search", done: false }] },
    { id: "p10", name: "Onboarding Flow", tags: ["Product"], updated_days: 8, focus: "Activation experiments", rung: 3, team: ["u-anna"],
      milestones: [{ text: "Map week-one activation", done: true }, { text: "Run the profile-completion test", done: true }, { text: "Run the first-connection nudge", done: false }, { text: "Pick the winning flow", done: false }] },
    { id: "p11", name: "Data Pipeline", tags: ["Infra"], updated_days: 6, focus: "dbt models v2", rung: 1, team: ["u-kevin"],
      milestones: [{ text: "Model members and startups", done: true }, { text: "Model sprint outcomes", done: false }, { text: "Backfill history", done: false }] },
    { id: "p12", name: "Growth Playbook", tags: ["Growth"], updated_days: 9, focus: "TOFU channels", rung: 0, team: ["u-andre"],
      milestones: [{ text: "List campus channels (BEM, clubs)", done: true }, { text: "Draft the TikTok and IG content plan", done: false }, { text: "Test three referral loops", done: false }] },
  ],

  people: [
    { id: "u-anna", tone: 0,   name: "Anna S.",   role: "builder",   title: "Product designer",          headline: "Designs hiring and onboarding flows for early-stage teams.",       city: "Jakarta",    skills: ["Figma", "UX research", "Prototyping"], intent: "Open to co-found",                open: true,  mutual: 6 },
    { id: "u-rahul", tone: 2,  name: "Rahul P.",  role: "builder",   title: "Full-stack developer",      headline: "Ships MVPs fast with Next.js, Postgres and payments.",            city: "Bandung",    skills: ["React", "Node.js", "Postgres"],       intent: "Open to join a Build sprint",     open: true,  mutual: 4 },
    { id: "u-lina", tone: 6,   name: "Lina W.",   role: "founder",   title: "Founder · EdTech",          headline: "Building a tutoring marketplace for high-school students.",       city: "Surabaya",   skills: ["Community", "Sales", "Ops"],          intent: "Looking for a technical co-founder", open: true, mutual: 3 },
    { id: "u-dimas", tone: 5,  name: "Dimas A.",  role: "founder",   title: "Founder · AgriTech",        headline: "Cold-chain logistics for smallholder farmers.",                    city: "Yogyakarta", skills: ["Supply chain", "Field research"],     intent: "Needs an operations lead",        open: true,  mutual: 2 },
    { id: "u-sari", tone: 7,   name: "Sari K.",   role: "mentor",    title: "Mentor · Product strategy", headline: "Eight years building two-sided marketplaces.",                     city: "Jakarta",    skills: ["Marketplaces", "Pricing", "Hiring"],  intent: "Mentoring two founders a month",  open: true,  mutual: 9 },
    { id: "u-budi", tone: 3,   name: "Budi H.",   role: "investor",  title: "Angel investor",            headline: "Pre-seed cheques in consumer and fintech across Southeast Asia.", city: "Jakarta",    skills: ["Fundraising", "Fintech"],             intent: "Meets founders at Demand shown",  open: false, mutual: 5 },
    { id: "u-kevin", tone: 1,  name: "Kevin T.",  role: "builder",   title: "Data & ML engineer",        headline: "Recommendation systems; studying CS in Toronto.",                 city: "Toronto",    skills: ["Python", "ML", "dbt"],                intent: "Open to co-found remotely",       open: true,  mutual: 3 },
    { id: "u-maya", tone: 4,   name: "Maya R.",   role: "mentor",    title: "Mentor · Startup legal",    headline: "Founders’ agreements, IP assignment and first hires.",            city: "Jakarta",    skills: ["Legal", "Equity", "IP"],              intent: "Office hours every Friday",       open: true,  mutual: 4 },
    { id: "u-andre", tone: 2,  name: "Andre G.",  role: "builder",   title: "Growth marketer",           headline: "TikTok and Instagram content that turns into sign-ups.",          city: "Jakarta",    skills: ["Content", "Paid social", "Analytics"], intent: "Open to join a team",            open: true,  mutual: 2 },
    { id: "u-nadia", tone: 6,  name: "Nadia F.",  role: "founder",   title: "Founder · HealthTech",      headline: "A queueing app for neighbourhood clinics.",                        city: "Medan",      skills: ["Healthcare", "Research"],             intent: "Looking for a mobile developer",  open: true,  mutual: 1 },
    { id: "u-farhan", tone: 5, name: "Farhan Z.", role: "recruiter", title: "Talent partner",            headline: "Places first engineers at pre-seed startups.",                     city: "Jakarta",    skills: ["Hiring", "Talent"],                   intent: "Hiring for three pre-seed teams", open: false, mutual: 3 },
    { id: "u-citra", tone: 3,  name: "Citra L.",  role: "builder",   title: "Mobile developer",          headline: "Flutter apps from prototype to the Play Store.",                   city: "Semarang",   skills: ["Flutter", "Firebase", "UI"],          intent: "Open to join a Build sprint",     open: true,  mutual: 2 },
  ],

  /* Starting state of the member's network */
  networkSeed: {
    connected: ["u-anna", "u-rahul", "u-lina", "u-sari", "u-kevin"],
    sent: ["u-maya"],
    incoming: ["u-dimas", "u-citra", "u-budi"],
    ignored: [],
    rooms: ["r-angels"],
  },

  requests: [
    { from: "u-dimas", ago: 5,       note: "Saw your talent-graph brief. Would love your take on hiring for a cold-chain startup." },
    { from: "u-citra", ago: 180,     note: "Open to joining a Build sprint. Is Sandbox Jobs still looking for a mobile developer?" },
    { from: "u-budi",  ago: 60 * 26, note: "Following Raflesia’s progress. Happy to chat once you reach Demand shown." },
  ],

  rooms: [
    { id: "r-angels", name: "Jakarta Angels",                  topic: "Pitch practice with angel investors · Thursdays, 7 pm WIB",   online: 24, hue: "purple",  members: ["u-budi", "u-sari", "u-lina", "u-dimas"] },
    { id: "r-market", name: "Marketplace builders",            topic: "Two-sided marketplaces: supply first, then demand",           online: 41, hue: "blue",    members: ["u-anna", "u-sari", "u-rahul"] },
    { id: "r-lobby",  name: "Problem sprint lobby · November", topic: "Teams form on Monday. Bring a one-page problem brief.",        online: 18, hue: "orange",  members: ["u-dimas", "u-nadia", "u-lina"], lobby: true },
    { id: "r-campus", name: "Campus founders",                 topic: "Student founders from BEM boards and entrepreneurship clubs", online: 33, hue: "emerald", members: ["u-lina", "u-kevin", "u-andre"] },
    { id: "r-design", name: "Design critique",                 topic: "Share a prototype, get feedback within 24 hours",             online: 12, hue: "teal",    members: ["u-anna", "u-citra"] },
  ],

  conversations: [
    { with: "u-anna", unread: 1, messages: [
      { from: "me",   ago: 60 * 27, text: "Hi Anna — loved your hiring-flow case study." },
      { from: "them", ago: 60 * 26, text: "Thank you! Happy to help on Raflesia’s candidate flow." },
      { from: "them", ago: 2,       text: "Free later for a 15-min sync about the mentor pool?" },
    ] },
    { with: "u-rahul", unread: 1, messages: [
      { from: "them", ago: 75, text: "Uploading my comments to the deck folder now." },
      { from: "them", ago: 60, text: "Shared notes on the pitch deck v3 — take a look!" },
    ] },
    { with: "u-lina", unread: 0, messages: [
      { from: "me",   ago: 60 * 30, text: "Congrats on reaching Problem understood!" },
      { from: "them", ago: 60 * 24, text: "Can you intro me to the Jakarta Angels room?" },
    ] },
    { with: "u-sari", unread: 0, messages: [
      { from: "them", ago: 60 * 24 * 3,      text: "Your pricing page is close. Try anchoring on the annual plan." },
      { from: "me",   ago: 60 * 24 * 3 - 30, text: "Great call — testing it this sprint." },
    ] },
    { with: "u-kevin", unread: 0, messages: [
      { from: "me",   ago: 60 * 24 * 5,      text: "Want to pair on the routing model this weekend?" },
      { from: "them", ago: 60 * 24 * 5 - 45, text: "Yes! Saturday morning Toronto time works." },
    ] },
  ],

  /* Canned replies so the concept's chat feels alive */
  replies: [
    "Sounds good — talk soon!",
    "Perfect, I’ll take a look tonight.",
    "Love that. Want to grab 15 minutes this week?",
    "Great question. Let me check with the team and get back to you.",
    "On it. I’ll post an update in the sprint channel.",
  ],

  /* `text` may contain <b> — it is trusted seed copy */
  notifications: [
    { id: "nt1", type: "request", ago: 5,            unread: true,  link: "network.html#requests",         text: "<b>Dimas A.</b> wants to connect. He’s building a cold-chain AgriTech startup." },
    { id: "nt2", type: "message", ago: 2,            unread: true,  link: "network.html#messages/u-anna",  text: "<b>Anna S.</b> sent you a message: “Free later for a 15-min sync about the mentor pool?”" },
    { id: "nt3", type: "project", ago: 60 * 3,       unread: true,  link: "projects.html?open=p1",         text: "<b>Raflesia — Talent Graph</b> is 75% through this sprint’s milestones." },
    { id: "nt4", type: "mention", ago: 60,           unread: false, link: "network.html#messages/u-rahul", text: "<b>Rahul P.</b> mentioned you in the “Pitch deck v3” notes." },
    { id: "nt5", type: "ladder",  ago: 60 * 24,      unread: false, link: "projects.html?open=p4",         text: "<b>Sandbox Jobs</b> reached Rung 3 · Demand shown." },
    { id: "nt6", type: "sprint",  ago: 60 * 30,      unread: false, link: "network.html#explore",          text: "The <b>Problem sprint lobby</b> opens on Monday — 18 teams are waiting." },
    { id: "nt7", type: "badge",   ago: 60 * 24 * 3,  unread: false, action: "profile",                    text: "You earned a <b>sprint badge</b>: 3 sprints, 92% would work with you again." },
    { id: "nt8", type: "insight", ago: 60 * 24 * 2,  unread: false, link: "home.html#insights",            text: "New from <b>Investor Tools</b>: Investor CRM v0.9 enters public beta." },
  ],

  insights: [
    { id: "n1", title: "MatchGraph hits 10k successful intros", team: "Signal Rooms",   time: "Today",     blurb: "A new routing model improved introduction acceptance by 21% week-over-week." },
    { id: "n2", title: "Investor CRM v0.9 Release",             team: "Investor Tools", time: "Yesterday", blurb: "Pipeline stages, smart reminders, and email sync enter public beta." },
    { id: "n3", title: "Sandbox Jobs launches talent campaign", team: "Growth",         time: "2d ago",    blurb: "Top-of-funnel playbook leads to 2.3× increase in qualified candidates." },
  ],

  /* Profile defaults by the role chosen when joining */
  profileDefaults: {
    founder:  { headline: "Founder · Raflesia — Talent Graph", location: "Jakarta, Indonesia", bio: "Building a talent graph that helps early-stage teams in Indonesia find their first hires. Looking for builders who like hard matching problems.", skills: ["Product strategy", "Recruiting", "Pitching"], open: true, openType: "cofound", badges: 1 },
    builder:  { headline: "Builder · ready to join an early-stage team", location: "Jakarta, Indonesia", bio: "I like turning rough ideas into working products. Send me your problem brief.", skills: ["Prototyping", "Frontend", "User research"], open: true, openType: "join", badges: 1 },
    mentor:   { headline: "Mentor · problem briefs and pitch decks", location: "Jakarta, Indonesia", bio: "Happy to review problem briefs, pitch decks and go-to-market plans for first-time founders.", skills: ["Go-to-market", "Fundraising"], open: true, openType: "mentor", badges: 0 },
    investor: { headline: "Investor · pre-seed and seed", location: "Jakarta, Indonesia", bio: "Looking for founders with verified progress on the milestone ladder.", skills: ["Fundraising", "Due diligence"], open: true, openType: "invest", badges: 0 },
  },
};
