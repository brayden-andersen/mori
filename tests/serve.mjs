// A tiny static server for the site: node tests/serve.mjs (PORT=4180 by default).
// The tests use it; it also works for looking at the site locally. Missing
// addresses get 404.html, and /home serves home.html, as on GitHub Pages.
//
// MORI_ENV=staging (the authenticated e2e tests): every page loads
// assets/js/config.staging.js instead of config.js, filled in from
// STAGING_SUPABASE_URL and STAGING_ANON_KEY, and its security policy names the
// staging Supabase host instead of production's. It refuses production.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { staging, PRODUCTION_REF } from "../tools/lib/env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 4180;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};
// Never served: tooling, git, local secrets, and the e2e tests' saved sign-ins.
const HIDDEN = /[\\/](node_modules|\.git|\.env[^\\/]*|\.auth)([\\/]|$)/;

const STAGING = process.env.MORI_ENV === "staging" ? staging() : null;
if (process.env.MORI_ENV === "staging" && !STAGING) { console.error("MORI_ENV=staging needs STAGING_SUPABASE_URL and STAGING_ANON_KEY (see docs/staging.md)."); process.exit(2); }
const PROD_HOST = `${PRODUCTION_REF}.supabase.co`;

/** Staging: the page loads the staging config, and its policy allows the staging host. */
function forStaging(file, body) {
  if (!STAGING) return body;
  if (file.endsWith(path.join("assets", "js", "config.staging.js"))) {
    return Buffer.from(String(body).replace("__STAGING_SUPABASE_URL__", STAGING.url).replace("__STAGING_ANON_KEY__", STAGING.anonKey));
  }
  if (path.extname(file) === ".html") {
    const host = new URL(STAGING.url).host;
    return Buffer.from(String(body).replace(/assets\/js\/config\.js(\?v=\d+)?/g, (_, v) => `assets/js/config.staging.js${v || ""}`).split(PROD_HOST).join(host));
  }
  return body;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT) || HIDDEN.test(file)) { res.writeHead(403); res.end(); return; }
  try {
    // /home serves home.html, as GitHub Pages does
    if (!path.extname(file) && !(await stat(file).catch(() => null))) file += ".html";
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const body = forStaging(file, await readFile(file));
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    const body = forStaging(path.join(ROOT, "404.html"), await readFile(path.join(ROOT, "404.html")).catch(() => "Not found"));
    res.writeHead(404, { "content-type": TYPES[".html"] });
    res.end(body);
  }
}).listen(PORT, "127.0.0.1", () => console.log(`SandBox on http://127.0.0.1:${PORT}/${STAGING ? ` (staging: ${new URL(STAGING.url).host})` : ""}`));
