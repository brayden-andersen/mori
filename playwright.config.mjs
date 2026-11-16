// Playwright: npm test
// Ten tests that run against the guest demo, so no Supabase project or Google
// account is needed. The site is served by tests/serve.mjs, and any request
// to Supabase is blocked in the tests themselves.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT) || 4180;

export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.mjs",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "node tests/serve.mjs",
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },
});
