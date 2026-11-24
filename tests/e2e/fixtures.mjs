// Shared helpers for the authenticated e2e tests (staging only).
//
//   asUser("collab1", { device: "mobile" })  a signed-in page in its own browser context. Call it
//                                            twice for the same member to stand in for two devices.
//   api("owner")                             supabase-js signed in as that member (Node), for setup
//                                            and for checking what the server really holds.
//   newProject("owner", { members })         a project named e2e-<runId>-<test>, deleted afterwards.
//   waitForSynced(page)                      until the page has no Supabase request in flight.
//
// Every test title carries its audit ID, e.g. "[E2E-03] …", for tools/report.mjs.
import { test as base, expect, devices } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { staging } from "../../tools/lib/env.mjs";
import { authFile } from "./global-setup.mjs";

export const env = staging();
export const runId = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || 1}` : Date.now().toString(36);
const slug = (s) => s.toLowerCase().replace(/\[[^\]]*\]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Count Supabase REST/Storage requests in flight, so waitForSynced knows when saves are done. */
function track(page) {
  page.__inflight = 0;
  const isApi = (r) => /\/(rest|storage)\/v1\//.test(r.url());
  page.on("request", (r) => { if (isApi(r)) page.__inflight += 1; });
  const done = (r) => { if (isApi(r)) page.__inflight = Math.max(0, page.__inflight - 1); };
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  return page;
}

/** Wait until nothing has been in flight for `quietMs` (saves sent and answered). */
export async function waitForSynced(page, { quietMs = 700, timeout = 20000 } = {}) {
  const until = Date.now() + timeout;
  let quietSince = Date.now();
  while (Date.now() < until) {
    if (page.__inflight > 0) quietSince = Date.now();
    else if (Date.now() - quietSince >= quietMs) return;
    await page.waitForTimeout(100);
  }
  throw new Error("Supabase requests still in flight after " + timeout + " ms");
}

export const test = base.extend({
  api: async ({}, use) => { // eslint-disable-line no-empty-pattern
    const clients = new Map();
    await use(async (name) => {
      if (!clients.has(name)) {
        const sb = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await sb.auth.signInWithPassword({ email: env.email(name), password: env.password });
        if (error) throw new Error(`${name}: ${error.message}`);
        clients.set(name, { sb, id: data.user.id });
      }
      return clients.get(name);
    });
  },

  asUser: async ({ browser, browserName }, use, testInfo) => {
    const contexts = [];
    await use(async (name, { device } = {}) => {
      const opts = { baseURL: testInfo.project.use.baseURL, storageState: authFile(name) };
      if (device === "mobile") Object.assign(opts, browserName === "chromium" ? devices["Pixel 7"] : { viewport: { width: 412, height: 915 } });
      const ctx = await browser.newContext(opts);
      contexts.push(ctx);
      return track(await ctx.newPage());
    });
    for (const c of contexts) await c.close().catch(() => {});
  },

  newProject: async ({ api }, use, testInfo) => {
    const made = [];
    await use(async (owner, { members = [], name } = {}) => {
      const o = await api(owner);
      const title = (name || `e2e-${runId}-${testInfo.project.name.replace(/^e2e-/, "")}-${slug(testInfo.title)}`).slice(0, 60);
      const { data: p, error } = await o.sb.from("projects").insert({ name: title, focus: "e2e" }).select("*").single();
      if (error) throw new Error(`create project: ${error.message}`);
      made.push({ id: p.id, owner });
      for (const m of members) {
        const { id } = await api(m);
        const { error: merr } = await o.sb.from("project_members").insert({ project_id: p.id, member_id: id });
        if (merr) throw new Error(`add ${m}: ${merr.message}`);
      }
      return p;
    });
    for (const p of made) {
      const o = await api(p.owner);
      await o.sb.from("projects").delete().eq("id", p.id);
    }
  },
});

export { expect };
