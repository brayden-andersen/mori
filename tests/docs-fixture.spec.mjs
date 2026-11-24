// E2E-08 / B-04 compatibility baseline, runnable without staging: a document with every
// format the editor can hold (plus pasted junk) round-trips through the guest demo's editor,
// and its Word export matches the approved copy byte for byte. The same fixture runs against
// staging in tests/e2e/journeys.spec.mjs. If an editor change alters the export on purpose,
// regenerate all-formats.export.html and have Brayden approve the difference.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const DIR = new URL("./e2e/fixtures/docs/", import.meta.url);
const body = readFileSync(new URL("all-formats.html", DIR), "utf8");
const approved = readFileSync(new URL("all-formats.export.html", DIR), "utf8");

test.beforeEach(async ({ context }) => { await context.route(/supabase\.co/, (route) => route.abort()); });

test("[E2E-08] every format survives the editor, and the Word export matches the approved copy", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => { localStorage.clear(); Mori.auth.startGuest(); });
  await page.goto("/projects");
  const pid = await page.evaluate(() => Mori.state.projects()[0].id);
  await page.goto(`/project?id=${pid}#docs`);
  await page.waitForFunction(() => Mori.workspace && Mori.workspace.docs);
  const doc = await page.evaluate(async ([p, b]) => (await Mori.workspace.docs.create(p, { title: "E2E all formats", body: b })).id, [pid, body]);
  await page.goto(`/project?id=${pid}#docs/${doc}`);
  await expect(page.locator("#docPage")).toContainText("A quote worth keeping.");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("[data-doc-download]")]);
  expect(dl.suggestedFilename()).toBe("E2E all formats.doc");
  const out = readFileSync(await dl.path(), "utf8").replace(/^\uFEFF/, "");
  expect(out).toBe(approved);
  // Reopened, the editor shows the same cleaned content, and nothing pasted ran.
  const first = await page.locator("#docPage").innerHTML();
  await page.reload();
  await expect(page.locator("#docPage")).toContainText("A quote worth keeping.");
  expect(await page.locator("#docPage").innerHTML()).toBe(first);
  expect(await page.evaluate(() => window.__xss || 0)).toBe(0);
});
