// A-02: full journeys, as real signed-in members on staging.
// E2E-01 deep link → sign-in → onboarding → the intended page · E2E-02 edits survive on another
// device · E2E-08 a document with every format, exported and reopened · sign-out leaves no
// project data behind.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { test, expect, env, runId, waitForSynced } from "./fixtures.mjs";

const DOCS = new URL("./fixtures/docs/", import.meta.url);

test("[E2E-01] a deep link survives sign-in and onboarding; a reload doesn't repeat setup", async ({ page }, testInfo) => {
  test.skip(!env.serviceKey, "needs STAGING_SERVICE_ROLE_KEY to create a brand-new member");
  const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `e2e-${runId}-${testInfo.project.name}-new@${env.domain}`.toLowerCase();
  const { data: made, error } = await admin.auth.admin.createUser({ email, password: env.password, email_confirm: true, user_metadata: { full_name: "Nova Test" } });
  expect(error, error && error.message).toBeNull();
  try {
    // Signed out, a deep link goes to sign-in and remembers where it was going.
    await page.goto("/network#explore");
    await page.waitForURL(/\/\?next=/);
    expect(decodeURIComponent(page.url())).toContain("next=network#explore");
    // What Google hands back: a Supabase session, then the callback address.
    const sb = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await sb.auth.signInWithPassword({ email, password: env.password });
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [env.storageKey, JSON.stringify(data.session)]);
    await page.goto("/?auth=callback&next=" + encodeURIComponent("network#explore"));
    await page.waitForURL(/\/onboarding(?:[?#]|$)/);
    await page.locator('input[name="birthDate"]').fill("1996-03-08");
    await page.click("#obNext");
    await page.click('.ob-option:has(input[value="founder"])');
    await page.click("#obNext");
    await page.click("#obSkip");
    await page.click('.ob-option:has(input[value="skills"])');
    await Promise.all([page.waitForURL(/\/network#explore/), page.click("#obNext")]);
    await page.reload();
    await expect(page).toHaveURL(/\/network#explore/); // no second round of setup
    const { data: row } = await admin.from("profiles").select("onboarding_completed, birth_date").eq("id", made.user.id).single();
    expect(row).toEqual({ onboarding_completed: true, birth_date: "1996-03-08" });
  } finally {
    await admin.auth.admin.deleteUser(made.user.id);
  }
});

test("[E2E-02] project edits made on a laptop are all there on a phone, and match the server", async ({ asUser, api, newProject }) => {
  const p = await newProject("owner");
  const desk = await asUser("owner");
  await desk.goto(`/project?id=${p.id}#mainframe`);
  await desk.waitForFunction(() => Mori.workspace && Mori.state.project && Mori.state.project(new URLSearchParams(location.search).get("id")));
  const name = `${p.name.slice(0, 50)} v2`;
  await desk.evaluate(async ([pid, name]) => {
    const S = Mori.state, W = Mori.workspace;
    await S.updateProject(pid, { name, focus: "E2E focus", tags: ["E2E", "FinTech"], rung: 2 }).saved;
    await S.addTask(pid, "E2E task survives").saved;
    await W.change(pid, "layout", (l) => l.concat([{ id: "w-e2e", type: "note", x: 0, y: 0, w: 1, h: 1 }]));
    await W.change(pid, "canvas", (c) => Object.assign(c, { problem: "E2E canvas problem" }));
  }, [p.id, name]);
  await waitForSynced(desk);
  await desk.context().close();

  const phone = await asUser("owner", { device: "mobile" });
  await phone.goto(`/project?id=${p.id}#tasks`);
  await expect(phone.locator("body")).toContainText("E2E task survives");
  const ui = await phone.evaluate((pid) => {
    const pr = Mori.state.project(pid);
    const ws = Mori.workspace.get(pid);
    return { name: pr.name, focus: pr.focus, tags: pr.tags, rung: pr.rung, tasks: pr.tasks.map((t) => t.text), widget: ws.layout.some((w) => w.id === "w-e2e"), problem: ws.canvas.problem };
  }, p.id);
  const { sb } = await api("owner");
  const { data: row } = await sb.from("projects").select("name, focus, tags, rung, milestones, workspace").eq("id", p.id).single();
  // What the phone shows is exactly what the server holds: nothing missing, nothing phantom.
  expect(ui).toEqual({
    name: row.name, focus: row.focus, tags: row.tags, rung: row.rung,
    tasks: row.milestones.map((t) => t.text), widget: row.workspace.layout.some((w) => w.id === "w-e2e"), problem: row.workspace.canvas.problem,
  });
  expect(ui).toMatchObject({ name, focus: "E2E focus", rung: 2, widget: true, problem: "E2E canvas problem" });
  expect(ui.tasks).toContain("E2E task survives");
});

test("[E2E-08] a document with every format exports to Word as approved, and reopens unchanged", async ({ asUser, api, newProject }) => {
  const p = await newProject("owner");
  const { sb } = await api("owner");
  const body = readFileSync(new URL("all-formats.html", DOCS), "utf8");
  const { data: doc, error } = await sb.from("project_docs").insert({ project_id: p.id, title: "E2E all formats", body }).select("id").single();
  expect(error).toBeNull();
  const page = await asUser("owner");
  await page.goto(`/project?id=${p.id}#docs/${doc.id}`);
  await expect(page.locator("#docPage")).toContainText("A quote worth keeping.");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("[data-doc-download]")]);
  const out = readFileSync(await dl.path(), "utf8").replace(/^\uFEFF/, "");
  expect(out).toBe(readFileSync(new URL("all-formats.export.html", DOCS), "utf8"));
  const shown = await page.locator("#docPage").innerHTML();
  await page.reload();
  await expect(page.locator("#docPage")).toContainText("A quote worth keeping.");
  expect(await page.locator("#docPage").innerHTML()).toBe(shown);
  expect(await page.evaluate(() => window.__xss || 0)).toBe(0);
});

test("[A-02] after signing out, no project data stays readable in this browser", async ({ asUser, newProject }) => {
  // Baseline (Gate 1): sign-out clears other members' details and messages, but keeps the
  // member's cached workspaces (ws.<pid>) and documents (docs.<pid>). See docs/qa/baseline-2026-11.md.
  test.fail(true, "baseline: sign-out keeps ws.<pid> and docs.<pid> in localStorage");
  const p = await newProject("owner");
  const page = await asUser("owner");
  await page.goto(`/project?id=${p.id}#docs`);
  await waitForSynced(page);
  await page.click(".account-toggle");
  await Promise.all([page.waitForURL(/\/\?signedout=1|\/$/), page.click('#ddAccount [data-action="signout"]')]);
  const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => /\.(ws|docs)\./.test(k)));
  expect(left).toEqual([]);
});
