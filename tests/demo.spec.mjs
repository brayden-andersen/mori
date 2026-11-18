// The demo's core flows, run against the guest demo (no Supabase, no Google).
// npm test   ·   one test: npx playwright test -g "deep link"
import { test, expect } from "@playwright/test";

const HOSTILE = `<img src=x onerror="window.__xss=1">"'><script>window.__xss=2</script><svg onload="window.__xss=3">`;

test.beforeEach(async ({ page, context }) => {
  // Nothing in these tests may depend on the real backend.
  await context.route(/supabase\.co/, (route) => route.abort());
  await page.goto("/");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
});

/** Open the guest demo the way a visitor does. */
async function openDemo(page) {
  await page.goto("/");
  await Promise.all([page.waitForURL(/\/home(?:[?#]|$)/), page.click("#heroAuth [data-guest]")]);
  await expect(page.locator(".demo-bar")).toContainText("exploring a demo");
}

test("the guest demo opens with labelled sample data, and resets", async ({ page }) => {
  await openDemo(page);
  // Clean addresses: /home, not /home.html; an old .html address tidies itself; signed in, the
  // landing page goes straight to the homepage.
  expect(new URL(page.url()).pathname).toBe("/home");
  await page.goto("/projects.html");
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto("/");
  await page.waitForURL(/\/home(?:[?#]|$)/);
  await expect(page.locator("#continuePanel")).toContainText("WarungPay");
  await expect(page.locator("#continuePanel .sample-tag").first()).toBeVisible();
  await expect(page.locator("#todayPanel .td-meet")).toHaveCount(3); // the sample meetings, always on today's date
  await expect(page.locator("#prompt")).toContainText("3 meetings");
  await page.evaluate(() => Mori.state.createProject({ name: "My own idea" }));
  await page.goto("/projects");
  await expect(page.locator("#grid")).toContainText("My own idea");
  const reset = page.locator("[data-demo-reset]").first();
  await reset.click();
  await Promise.all([page.waitForURL(/\/home(?:[?#]|$)/), reset.click()]); // a second tap confirms
  await page.goto("/projects");
  await expect(page.locator("#grid")).toContainText("WarungPay");
  await expect(page.locator("#grid")).not.toContainText("My own idea");
});

test("sign-up asks for an 18+ date of birth, shows once, and the homepage then opens straight away", async ({ page }) => {
  await page.evaluate(() => Mori.auth.completeSignIn({ provider: "demo", name: "Eka Putri" }, { onboarded: false }));
  await page.goto("/home");
  await page.waitForURL(/\/onboarding(?:[?#]|$)/); // not signed up yet: sign-up first
  await page.click("#obNext"); // the name is filled in; the date of birth isn't
  const birth = page.locator('input[name="birthDate"]');
  await expect(birth).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(".field-error").first()).toContainText("18 and over");
  const seventeen = new Date();
  seventeen.setFullYear(seventeen.getFullYear() - 17);
  await birth.fill(seventeen.toISOString().slice(0, 10));
  await page.click("#obNext");
  await expect(page.locator(".field-error").first()).toContainText("18 and over"); // too young: refused
  await birth.fill("1995-04-12");
  await page.click("#obNext");
  await page.click('.ob-option:has(input[value="founder"])');
  await page.click("#obNext");
  await page.click("#obSkip"); // industry
  await page.click('.ob-option:has(input[value="skills"])');
  // It came from the homepage, so it goes back there (a deep link survives sign-up)
  await Promise.all([page.waitForURL(/\/home(?:[?#]|$)/), page.click("#obNext")]);
  await page.goto("/onboarding");
  await expect(page).not.toHaveURL(/\/onboarding(?:[?#]|$)/); // done: never asked again
  await page.goto("/home");
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/\bboot\b/); // a reload shows the page at once
  await expect(page.locator("#homeGrid > section").first()).toBeVisible();
});

test("a deep link survives signing in", async ({ page }) => {
  await page.goto("/network#member/m-dewi");
  await page.waitForURL(/\/\?next=/);
  expect(decodeURIComponent(page.url())).toContain("next=network#member/m-dewi");
  await page.keyboard.press("Escape"); // the join window opens by itself; the demo is behind it
  await Promise.all([page.waitForURL(/\/network#member\/m-dewi/), page.click("#heroAuth [data-guest]")]);
  await expect(page.locator("#mpTitle")).toContainText("Dewi Saraswati");
});

test("Escape closes a dialog and focus returns to what opened it", async ({ page }) => {
  await openDemo(page);
  await page.goto("/projects");
  await page.click("#newProjectBtn");
  await expect(page.locator("#newProjectModal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#newProjectModal")).toBeHidden();
  await expect(page.locator("#newProjectBtn")).toBeFocused();

  await page.goto("/network#explore");
  const view = page.locator("#peopleGrid button.btn[data-view]").first();
  await view.click();
  await expect(page.locator("#memberModal .modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#memberModal .modal")).toBeHidden();
  await expect(view).toBeFocused();
});

test("menus open with Enter, move with Tab and close with Escape", async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('[role="menu"], [role="menuitem"]')).toHaveCount(0);
  const toggle = page.locator('[aria-controls="ddProjects"]');
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest("#ddProjects"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();

  // Account → Language opens Settings on Preferences, at the language; choosing one translates the
  // site and stays chosen; English comes back the same way.
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.click(".account-toggle");
  await page.click('[data-focus="language"]');
  const lang = page.locator("#stLanguage");
  await expect(lang).toBeFocused();
  await Promise.all([page.waitForEvent("load"), lang.selectOption("id")]);
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page.locator('.nav-btn[data-nav="home"] .nav-label')).toHaveText("Beranda");
  await page.goto("/network");
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await page.click(".account-toggle");
  await page.click('[data-focus="language"]');
  await Promise.all([page.waitForEvent("load"), page.locator("#stLanguage").selectOption("en")]);
  await expect(page.locator('.nav-btn[data-nav="home"] .nav-label')).toHaveText("Home");
});

test("Projects: filters show as chips, the count is announced, pagination stays valid", async ({ page }) => {
  await openDemo(page);
  await page.evaluate(() => { for (let i = 0; i < 8; i++) Mori.state.createProject({ name: "Extra " + i, tags: ["Extra"] }); });
  await page.goto("/projects");
  await expect(page.locator("#countMeta")).toHaveAttribute("aria-live", "polite");
  await page.click("#pages button:last-child");
  await page.click('#filterChips [data-tag="FinTech"]');
  await expect(page.locator('#pages [aria-current="page"]')).toHaveText("1");
  await expect(page.locator("#countMeta")).toHaveText(/1 of \d+ projects match/);
  await expect(page.locator('#pjActive [data-drop-pj="tag:FinTech"]')).toBeVisible();
  await page.fill("#q", "warung");
  await expect(page.locator("#pjActive")).toContainText("Search: “warung”");
  await page.click('#pjActive [data-drop-pj="tag:FinTech"]');
  await expect(page.locator("#pjActive")).not.toContainText("FinTech");
  await page.click("#pjActive [data-clear-all]");
  await expect(page.locator("#pjActive")).toBeHidden();
  await expect(page.locator("#q")).toHaveValue("");
});

test("Discover: filters show as chips with a live count, one reset; report, block and unblock", async ({ page }) => {
  await openDemo(page);
  await page.goto("/network#explore");
  await expect(page.locator("#peopleCount")).toHaveText(""); // no member count unless filtering
  await page.selectOption("#roleSel", "specialist");
  await expect(page.locator("#peopleCount")).toHaveText(/\d+ (people match|person matches)/);
  await page.selectOption("#regionSel", { index: 1 });
  await expect(page.locator("#activeFilters [data-drop-filter]")).toHaveCount(2);
  await page.click('#activeFilters [data-drop-filter="role"]');
  await expect(page.locator("#roleSel")).toHaveValue("all");
  await page.click("#activeFilters [data-clear-filters]");
  await expect(page.locator("#activeFilters")).toBeHidden();

  // Report a member, blocking them too: they leave Discover, and Settings → Privacy can unblock them.
  const card = page.locator("#peopleGrid button.btn[data-view]").first();
  const id = await card.getAttribute("data-view");
  await card.click();
  await page.click("#memberModal [data-report]");
  await page.click('#reportModal button[type="submit"]');
  await expect(page.locator("#rpReasonError")).toBeVisible(); // a reason is needed
  await page.click('.rp-reason:has(input[value="spam"])');
  await page.click('#reportModal button[type="submit"]');
  await expect(page.locator("#reportModal .rp-done")).toContainText("nothing is sent"); // the demo sends nothing
  await page.click("#reportModal .modal-foot [data-close]");
  await expect(page.locator(`#peopleGrid [data-view="${id}"]`)).toHaveCount(0);
  await page.evaluate(() => Mori.shell.openModal("settings", null, "privacy"));
  await page.click(`#stBlocks [data-unblock="${id}"]`);
  await expect(page.locator("#stBlocks")).toContainText("You haven’t blocked anyone");
  await page.keyboard.press("Escape");
  await expect(page.locator(`#peopleGrid [data-view="${id}"]`).first()).toBeVisible();
});

test("no sideways scrolling on a 360 px phone", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  await ctx.route(/supabase\.co/, (route) => route.abort());
  const page = await ctx.newPage();
  const wide = [];
  const check = async (u) => {
    await page.goto(u);
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) wide.push(`${u} (${over}px)`);
  };
  for (const u of ["/", "/partners", "/about", "/toolkits", "/legal"]) await check(u);
  await page.evaluate(() => { localStorage.clear(); Mori.auth.startGuest(); });
  for (const u of ["/home", "/projects", "/project?id=p-warungpay#mainframe", "/project?id=p-warungpay#launch", "/network#explore", "/network#messages", "/sprints", "/sprints#sprint/fin-problem", "/directory", "/subscription", "/onboarding?edit=1"]) await check(u);
  expect(wide).toEqual([]);
  await ctx.close();
});

test('no "coming soon" anywhere', async ({ page }) => {
  const found = [];
  const check = async (u) => {
    await page.goto(u);
    await page.waitForTimeout(300);
    if (/coming soon|\(soon\)/i.test(await page.locator("body").innerText())) found.push(u);
  };
  for (const u of ["/", "/about", "/contact", "/toolkits", "/partners", "/legal", "/404.html"]) await check(u);
  await page.evaluate(() => Mori.auth.startGuest());
  const planner = ["mainframe", "tasks", "gtm", "ladder", "launch", "compliance", "people", "docs", "interviews", "canvas", "marketing", "metrics", "finance", "funding", "programs", "toolkits"];
  for (const u of ["/home", "/projects", "/network#explore", "/network#messages", "/sprints", "/directory", "/subscription", ...planner.map((s) => `/project?id=p-warungpay#${s}`)]) await check(u);
  expect(found).toEqual([]);
});

test("hostile text stays text, and the security policy blocks nothing", async ({ page }) => {
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective)); });
  await openDemo(page);
  await page.evaluate((H) => {
    Mori.state.saveProfile({ headline: H, bio: H, skills: [H], linkedin: "javascript:window.__xss=4", links: [{ type: "other", url: "javascript:window.__xss=5" }] }, { remote: false });
    const id = Mori.state.createProject({ name: H, focus: H, tags: [H] });
    Mori.state.addTask(id, H);
    window.__pid = id;
  }, HOSTILE);
  const pid = await page.evaluate(() => window.__pid);
  const pages = ["/projects", `/project?id=${pid}#mainframe`, `/project?id=${pid}#tasks`, "/home"];
  for (const u of pages) {
    await page.goto(u);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      xss: window.__xss || 0,
      imgs: document.querySelectorAll('img[src="x"]').length,
      jsLinks: document.querySelectorAll('a[href^="javascript:" i]').length,
      csp: window.__csp.length,
    }));
    expect(r, u).toEqual({ xss: 0, imgs: 0, jsLinks: 0, csp: 0 });
  }
  await page.click(".account-toggle");
  await page.click('#ddAccount [data-modal="profile"]');
  await expect(page.locator(".modal--profile")).toContainText("<img src=x"); // shown, as text
  expect(await page.evaluate(() => window.__xss || 0)).toBe(0);
});
