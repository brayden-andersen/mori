#!/usr/bin/env node
/* ==========================================================================
   A-06: test report by audit ID
   --------------------------------------------------------------------------
   Turns Playwright's JSON results (test-results/results.json) into
   reports/<date>-<sha>.md: one row per test with its audit ID (the [E2E-03]
   in its title), browser/device, result and duration; for a failure, what
   was expected against what happened, and where the trace is. A test marked
   test.fail() for the Gate 1 baseline shows as "baseline: known failure"
   while it still fails, and as an error once it starts passing (so the
   marker is removed when the gap is fixed).

     node tools/report.mjs [results.json] [--out reports/x.md] [--artifacts <url>]
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const input = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--out" && args[args.indexOf(a) - 1] !== "--artifacts") || "test-results/results.json";
const artifacts = opt("--artifacts") || process.env.ARTIFACTS_URL || "";
let sha = process.env.GITHUB_SHA || "";
try { sha = sha || execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(); } catch { /* not a git checkout */ }
const date = new Date().toISOString().slice(0, 10);
const out = opt("--out") || `reports/${date}-${sha.slice(0, 7) || "local"}.md`;

const data = JSON.parse(readFileSync(input, "utf8"));
const rows = [];
(function walk(suite, file) {
  for (const s of suite.suites || []) walk(s, s.file || file);
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const last = t.results[t.results.length - 1] || {};
      const id = (/\[([A-Z]+-\d+)\]/.exec(spec.title) || [])[1] || "—";
      const baseline = (t.annotations || []).find((a) => a.type === "fail");
      let status;
      if (t.status === "skipped") status = "skipped";
      else if (t.status === "expected") status = baseline ? "baseline: known failure" : "pass";
      else if (t.status === "flaky") status = "pass (flaky)";
      else status = baseline ? "ERROR: passes now, remove the baseline marker" : "FAIL";
      const err = (last.errors || last.error ? [].concat(last.errors || last.error) : [])[0];
      const msg = err && String(err.message || "").replace(new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g"), "") /* terminal colours */.split("\n").filter(Boolean).slice(0, 3).join(" ");
      rows.push({ id, title: spec.title.replace(/^\[[^\]]+\]\s*/, ""), file: spec.file || file, project: t.projectName, status, ms: last.duration || 0, msg, note: baseline && baseline.description });
    }
  }
})(data, "");

const order = (id) => { const m = /^([A-Z]+)-(\d+)$/.exec(id); return m ? `${m[1]}-${m[2].padStart(3, "0")}` : "zzz"; };
rows.sort((a, b) => order(a.id).localeCompare(order(b.id)) || a.title.localeCompare(b.title) || a.project.localeCompare(b.project));
const count = (s) => rows.filter((r) => r.status === s || (s === "FAIL" && r.status.startsWith("ERROR"))).length;
const esc = (s) => String(s || "").replace(/\|/g, "\\|");

const md = [
  `# Test report, ${date}`,
  "",
  `Commit \`${sha.slice(0, 12) || "local"}\` · ${rows.length} tests · ${count("pass") + count("pass (flaky)")} passed · ${count("FAIL")} failed · ${count("baseline: known failure")} known baseline failures · ${count("skipped")} skipped`,
  artifacts ? `\nTraces, screenshots and videos for failures: ${artifacts}` : "",
  "",
  "**Test profile:** GitHub-hosted ubuntu runner (US) ↔ Supabase staging, us-east-2, no throttling (unless a row says otherwise).",
  "",
  "| ID | Test | Browser / device | Result | Time |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.id} | ${esc(r.title)} | ${r.project} | ${r.status} | ${(r.ms / 1000).toFixed(1)} s |`),
  "",
  "## Failures and baseline gaps",
  "",
  ...(rows.filter((r) => r.status !== "pass" && r.status !== "skipped" && r.status !== "pass (flaky)").map((r) =>
    `- **[${r.id}] ${esc(r.title)}** (${r.project}): ${r.status}.${r.note ? ` Expected: ${esc(r.note)}.` : ""}${r.msg ? ` Actual: ${esc(r.msg)}` : ""} (${r.file})`)
  ),
  "",
  "## Performance",
  "",
  "Latency samples (p50 / p95 per scenario) arrive with tests/e2e/perf.spec.mjs in Gate 4.",
  "",
].join("\n");

mkdirSync(out.replace(/\/[^/]*$/, "") || ".", { recursive: true });
writeFileSync(out, md);
console.log(`Wrote ${out} (${rows.length} tests).`);
