// Sign each seeded test member in once, without Google, and save the browser state the
// site expects (A-01). For every member: sign in with email and password (supabase-js in
// Node), put that Supabase session where the site keeps it, then open the site at the point
// Google returns to (?auth=callback), so the site's own sign-in code finishes the job. The
// result, tests/e2e/.auth/<member>.json, is git-ignored and never served.
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { staging, TEST_USERS } from "../../tools/lib/env.mjs";

export const AUTH_DIR = new URL("./.auth/", import.meta.url);
export const authFile = (name) => new URL(`${name}.json`, AUTH_DIR).pathname;

export default async function globalSetup(config) {
  const env = staging({ needs: ["password"] });
  if (!env) return;
  mkdirSync(AUTH_DIR, { recursive: true });
  const baseURL = config.projects[0].use.baseURL;
  const browser = await chromium.launch();
  try {
    for (const name of TEST_USERS) {
      const sb = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await sb.auth.signInWithPassword({ email: env.email(name), password: env.password });
      if (error) throw new Error(`${name}: ${error.message} (run tools/staging-seed.mjs first)`);
      const ctx = await browser.newContext({ baseURL });
      await ctx.addInitScript(([key, session]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, session); }, [env.storageKey, JSON.stringify(data.session)]);
      const page = await ctx.newPage();
      await page.goto("/?auth=callback");
      await page.waitForURL(/\/(home|projects|network|onboarding)(?:[?#]|$)/, { timeout: 30000 });
      await ctx.storageState({ path: authFile(name) });
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}
