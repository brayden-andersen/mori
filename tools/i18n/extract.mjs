// Collect every English phrase the site shows: text, placeholders, labels and titles, from every
// page, window, tab, tour step and error state we can reach in the guest demo, the public pages and
// sign-up. Output: tools/i18n/strings.json (phrase → where it was seen).
// Run: node tools/i18n/extract.mjs   (serves the site itself on a spare port)
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const PORT = 4197;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = new URL("./strings.json", import.meta.url);
const seen = new Map(); // phrase → Set(where)

const COLLECT = () => {
  const out = [];
  const SKIP = "script, style, noscript, textarea, [contenteditable='true'], [translate='no'], .doc-page";
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const keep = (s) => s && /[A-Za-z]{2}/.test(s) && !/^https?:\/\//.test(s) && !/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(s);
  const walk = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest(SKIP)) continue;
    const t = norm(n.nodeValue);
    if (keep(t)) out.push(t);
  }
  document.querySelectorAll("[placeholder],[aria-label],[title],[alt],[data-tip]").forEach((el) => {
    if (el.closest(SKIP)) return;
    ["placeholder", "aria-label", "title", "alt", "data-tip"].forEach((a) => { const v = el.getAttribute(a); if (v && keep(norm(v))) out.push(norm(v)); });
  });
  if (keep(norm(document.title))) out.push(norm(document.title));
  return out;
};

async function grab(page, where) {
  const list = await page.evaluate(COLLECT).catch(() => []);
  list.forEach((s) => { if (!seen.has(s)) seen.set(s, new Set()); seen.get(s).add(where); });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function safe(fn) { try { await fn(); } catch { /* a state we couldn't reach is fine */ } }

const srv = spawn("node", ["tests/serve.mjs"], { cwd: new URL("../..", import.meta.url).pathname, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await wait(800);
const browser = await chromium.launch();

for (const vp of process.env.PHONE ? [{ width: 390, height: 844 }] : [{ width: 1366, height: 900 }]) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: "reduce" });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  const page = await ctx.newPage();
  const go = async (path, where, ms = 900) => { await safe(async () => { await page.goto(BASE + "/" + path); await wait(ms); await grab(page, where); }); };
  const click = async (sel, where, ms = 400) => { await safe(async () => { await page.click(sel, { timeout: 2000 }); await wait(ms); await grab(page, where); }); };
  const esc = async () => { await safe(() => page.keyboard.press("Escape")); await wait(250); };

  /* Public pages */
  await page.goto(BASE + "/index.html");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  for (const p of ["index.html", "about.html", "contact.html", "legal.html", "partners.html", "toolkits.html", "nope.html"]) await go(p, p, 1100);
  await go("index.html", "index");
  await click("#navActions [data-auth='signin']", "auth window");
  await esc();
  await go("index.html?auth=callback&error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user", "refused", 1200);
  await go("index.html?auth=callback&error=access_denied&error_description=Something+went+wrong", "failed", 1200);
  await go("partners.html#apply", "partners apply");
  await click("#applyForm button[type=submit]", "partners errors");
  await safe(async () => { await page.goto(BASE + "/toolkits.html"); await wait(800); for (const b of await page.$$("[data-kit], .kit-open, details summary")) { await b.click().catch(() => {}); } await wait(400); await grab(page, "toolkits open"); });

  /* Sign-up as a demo account */
  await safe(async () => {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); Mori.auth.completeSignIn({ provider: "demo", name: "Eka Putri" }, { onboarded: false }); });
    await page.goto(BASE + "/onboarding.html"); await wait(700); await grab(page, "onboarding 1");
    await page.click("#obNext"); await wait(300); await grab(page, "onboarding error");
    await page.fill("input[name=birthDate]", "1995-04-12"); await page.click("#obNext"); await wait(300); await grab(page, "onboarding 2");
    await page.click("#obNext"); await wait(300); await grab(page, "onboarding role error");
    await page.click('.ob-option:has(input[value="specialist"])'); await page.click("#obNext"); await wait(300); await grab(page, "onboarding 3");
    for (let i = 0; i < 6; i++) { await page.click("#obSkip").catch(() => page.click("#obNext")); await wait(300); await grab(page, "onboarding " + (4 + i)); }
  });
  await safe(async () => { await page.goto(BASE + "/onboarding.html?edit=1"); await wait(600); for (let i = 0; i < 8; i++) { await page.click(`#obSteps [data-goto="${i}"]`).catch(() => {}); await wait(250); await grab(page, "onboarding edit " + i); } });
  await go("home.html", "home new account", 1300);
  await go("network.html", "network demo account");

  /* The guest demo */
  await safe(async () => { await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); Mori.auth.startGuest(); }); });
  await go("home.html", "home", 1500);
  await click("[data-add-meeting]", "meeting window"); await click("#mtSave", "meeting errors"); await esc();
  await click("[data-meeting]", "meeting edit"); await esc();
  await click(".account-toggle", "account menu"); await esc();
  for (const t of ["account", "preferences", "projects", "notifications", "privacy"]) {
    await safe(async () => { await page.evaluate((tab) => Mori.shell.openModal("settings", null, tab), t); await wait(500); await grab(page, "settings " + t); await esc(); });
  }
  await safe(async () => { await page.evaluate(() => Mori.shell.openModal("profile")); await wait(500); await grab(page, "profile"); await page.click("[data-edit-profile], [data-profile-edit], .pf-edit").catch(() => {}); await wait(400); await grab(page, "profile edit"); await esc(); });
  await safe(async () => { await page.evaluate(() => Mori.shell.openModal("notifications")); await wait(500); await grab(page, "notifications"); await esc(); });
  await go("projects.html", "projects", 1200);
  await click("#newProjectBtn", "new project"); await click("#npCreate", "new project error"); await esc();
  await click("#grid .pcard, #grid [data-project]", "project drawer"); await esc();
  for (const s of ["mainframe", "tasks", "gtm", "ladder", "launch", "compliance", "people", "docs", "interviews", "canvas", "marketing", "metrics", "finance", "funding", "programs"]) {
    await go(`project.html?id=p-warungpay#${s}`, "planner " + s, 1100);
  }
  await go("project.html?id=p-warungpay#mainframe", "mainframe", 1100);
  await click("[data-mf-add], .mf-add, [data-add-widget]", "add widget drawer"); await esc();
  await click("[data-mf-edit], .mf-edit, [data-edit-mainframe]", "mainframe edit");
  await go("project.html?id=p-warungpay#docs", "docs", 1000);
  await click("[data-doc-open], .doc-row, .doc-card", "doc editor", 700);
  await go("project.html?id=p-kebundata#mainframe", "kebun mainframe", 1100);
  await go("project.html?id=p-rantang#mainframe", "empty mainframe", 1100);
  for (const h of ["explore", "requests", "messages", "connections", "sent"]) await go(`network.html#${h}`, "network " + h, 1100);
  await go("network.html#member/m-dewi", "member profile", 1200);
  await click("#memberModal [data-report]", "report window"); await click('#reportModal button[type="submit"]', "report error"); await esc();
  await safe(async () => { await page.goto(BASE + "/network.html#explore"); await wait(900); await page.click("[data-connections]").catch(() => {}); await wait(500); await grab(page, "connections window"); await esc(); });
  await go("sprints.html", "sprints", 1100);
  await safe(async () => { const lobbies = await page.$$eval("[href*='#lobby/']", (a) => a.map((x) => x.getAttribute("href"))); for (const l of lobbies.slice(0, 6)) { await page.goto(BASE + "/" + l.replace(/^\//, "")); await wait(700); await grab(page, "lobby"); } });
  await safe(async () => { const sp = await page.$$eval("[href*='#sprint/']", (a) => a.map((x) => x.getAttribute("href"))); for (const l of sp.slice(0, 6)) { await page.goto(BASE + "/" + l.replace(/^\//, "")); await wait(700); await grab(page, "sprint"); } });
  await go("directory.html", "directory", 1000);
  await go("subscription.html", "subscription", 1000);
  /* The tours */
  await safe(async () => {
    await page.goto(BASE + "/home.html"); await wait(800);
    for (const ch of ["start", "network", "projects", "subscription"]) {
      await page.evaluate((c) => Mori.tour && Mori.tour.openDeck(c), ch); await wait(500);
      for (let i = 0; i < 8; i++) { await grab(page, "tour " + ch); await page.click("#tourModal [data-tour-next]").catch(() => {}); await wait(350); }
      await esc();
    }
  });
  await safe(async () => {
    await page.goto(BASE + "/project.html?id=p-warungpay#mainframe"); await wait(900);
    await page.evaluate(() => Mori.tour && Mori.tour.startProject()); await wait(800);
    for (let i = 0; i < 10; i++) { await grab(page, "project tour"); await page.click(".coach [data-coach-next], .coach-next, [data-tour-next]").catch(() => {}); await wait(450); }
  });
  await ctx.close();
}
await browser.close();
srv.kill();

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const out = {};
[...seen.keys()].sort((a, b) => a.localeCompare(b)).forEach((k) => { out[k] = [...new Set([...(prev[k] || []), ...seen.get(k)])].slice(0, 4); });
Object.keys(prev).forEach((k) => { if (!out[k]) out[k] = prev[k]; });
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log("phrases:", Object.keys(out).length, "new this run:", [...seen.keys()].filter((k) => !prev[k]).length);
