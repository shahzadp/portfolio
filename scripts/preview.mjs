/**
 * Minimal static server for `out/` — used by Playwright, for local previewing,
 * and for testing on a phone over the same WiFi.
 *
 *   node scripts/preview.mjs                  # localhost only
 *   node scripts/preview.mjs --host=0.0.0.0   # reachable from your phone
 *   node scripts/preview.mjs --port=8080
 *   node scripts/preview.mjs --base=/portfolio  # mirror a project-site deploy
 *
 * --base mounts out/ under a path prefix, the way GitHub Pages serves a
 * project site. Worth running before any deploy that sets BASE_PATH: a
 * service worker registered at the wrong scope fails silently and looks
 * exactly like "the worker does not work".
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const PORT = Number(arg("port") || process.env.PORT || 4321);
const HOST = arg("host") || process.env.HOST || "127.0.0.1";
const BASE = (arg("base") || process.env.BASE || "").replace(/\/+$/, "");

/** First non-internal IPv4 address — the one a phone on the same WiFi can reach. */
function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === "IPv4" && !ni.internal) return ni.address;
    }
  }
  return null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);

    if (BASE) {
      if (pathname === BASE) pathname += "/";
      if (!pathname.startsWith(`${BASE}/`)) {
        res.writeHead(404, { "content-type": "text/plain" }).end("Not found (outside base path)");
        return;
      }
      pathname = pathname.slice(BASE.length);
    }

    if (pathname.endsWith("/")) pathname += "index.html";

    const filePath = join(ROOT, normalize(pathname).replace(/^([/\\])+/, ""));
    if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
      return;
    }

    const buf = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": buf.length,
      "cache-control": "no-cache",
    });
    res.end(buf);
  } catch (err) {
    console.error("[preview]", err);
    res.writeHead(500).end("Internal Server Error");
  }
}).listen(PORT, HOST, () => {
  const lan = lanAddress();
  const pad = (s) => `  ${s}`;

  console.log("\n  Portfolio preview\n");
  console.log(pad(`local    http://localhost:${PORT}${BASE}/`));

  if (HOST === "0.0.0.0" && lan) {
    console.log(pad(`phone    http://${lan}:${PORT}${BASE}/`));
    console.log("\n  Open that second address on a phone joined to the same WiFi.");
  } else if (HOST !== "0.0.0.0") {
    console.log("\n  Phone access is off. Run `npm run preview:lan` to enable it.");
  }
  if (BASE) console.log(pad(`base     ${BASE}/ (mirrors a project-site deploy)`));
  console.log("");
});