// A tiny static server for the site: node tests/serve.mjs (PORT=4180 by default).
// The tests use it; it also works for looking at the site locally. Missing
// addresses get 404.html, as on GitHub Pages.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 4180;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT) || /[\\/](node_modules|\.git)([\\/]|$)/.test(file)) { res.writeHead(403); res.end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    const body = await readFile(path.join(ROOT, "404.html")).catch(() => "Not found");
    res.writeHead(404, { "content-type": TYPES[".html"] });
    res.end(body);
  }
}).listen(PORT, "127.0.0.1", () => console.log(`SandBox on http://127.0.0.1:${PORT}/`));
