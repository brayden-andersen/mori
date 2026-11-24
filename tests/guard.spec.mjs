// A-01: nothing that talks to Supabase may run against production. These tests need no
// staging project and no browser: they prove the guard in tools/lib/env.mjs refuses the
// production project, and that the scripts built on it stop before doing anything.
import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { refuseProduction, PRODUCTION_REF, ProductionRefused } from "../tools/lib/env.mjs";

const PROD_URL = `https://${PRODUCTION_REF}.supabase.co`;

test("[A-01] the guard refuses the production project, in any spelling", () => {
  for (const url of [PROD_URL, PROD_URL.toUpperCase(), `${PROD_URL}/rest/v1/`, `postgresql://postgres@db.${PRODUCTION_REF}.supabase.co:5432/postgres`]) {
    expect(() => refuseProduction(url)).toThrow(ProductionRefused);
  }
  expect(() => refuseProduction("https://abcdefghijklmnopqrst.supabase.co")).not.toThrow();
});

for (const script of ["tools/staging-seed.mjs", "tools/staging-clean.mjs", "tools/rls-check.mjs", "tests/serve.mjs"]) {
  test(`[A-01] ${script} won't start against production`, () => {
    const env = { ...process.env, STAGING_SUPABASE_URL: PROD_URL, STAGING_ANON_KEY: "x", STAGING_SERVICE_ROLE_KEY: "x", TEST_USER_PASSWORD: "x", MORI_ENV: "staging", PORT: "4999" };
    const r = spawnSync(process.execPath, [script], { env, encoding: "utf8", timeout: 15000 });
    expect(r.status, r.stdout + r.stderr).not.toBe(0);
    expect(r.stdout + r.stderr).toContain("refuses to run against production");
  });
}
