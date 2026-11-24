// Playwright: npm test
//
// demo-chromium: the guest-demo tests (no Supabase project or Google account
// needed; any request to Supabase is blocked in the tests themselves), plus the
// production-guard test. Always runs.
//
// e2e-*: the authenticated tests against the STAGING Supabase project, as
// real signed-in test members (tests/e2e). They only exist when staging is
// configured (STAGING_SUPABASE_URL etc. in .env or CI secrets; see
// docs/staging.md). The site is then served with MORI_ENV=staging, so pages
// talk to staging, never to production.
import { defineConfig, devices } from "@playwright/test";
import { staging } from "./tools/lib/env.mjs";

const PORT = Number(process.env.PORT) || 4180;
const STAGING = staging();
const CI = !!process.env.CI;
const evidence = CI ? { trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure" } : { trace: "off" };

const e2e = STAGING
  ? [
      { name: "e2e-chromium-desktop", testDir: "tests/e2e", use: { ...devices["Desktop Chrome"], ...evidence } },
      { name: "e2e-webkit-desktop", testDir: "tests/e2e", use: { ...devices["Desktop Safari"], ...evidence } },
      { name: "e2e-chromium-mobile", testDir: "tests/e2e", use: { ...devices["Pixel 7"], ...evidence } },
    ]
  : [];

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  retries: CI ? 1 : 0,
  reporter: CI
    ? [["github"], ["json", { outputFile: "test-results/results.json" }], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "off" },
  globalSetup: STAGING ? "./tests/e2e/global-setup.mjs" : undefined,
  projects: [
    { name: "demo-chromium", testMatch: ["demo.spec.mjs", "guard.spec.mjs", "docs-fixture.spec.mjs"], use: { ...devices["Desktop Chrome"], trace: "off" } },
    ...e2e,
  ],
  webServer: {
    command: "node tests/serve.mjs",
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !CI,
    env: { PORT: String(PORT), ...(STAGING ? { MORI_ENV: "staging" } : {}) },
  },
});
