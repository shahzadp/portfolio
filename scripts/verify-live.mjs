/**
 * Checks the live deployed site in a real browser.
 *
 *   node scripts/verify-live.mjs
 *
 * Deliberately not a fetch-only check: a service worker registered at the
 * wrong scope returns 200 for every file and still does nothing.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.LIVE_URL || "https://shahzadp.github.io/portfolio/";

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`  ${pass ? "ok  " : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const notFound = [];
page.on("response", (r) => {
  if (r.status() >= 400) notFound.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

try {
  await page.goto(BASE, { waitUntil: "networkidle" });

  check("page renders", (await page.locator("h1").textContent())?.includes("Sikander"));

  // Manifest, served with a real content type.
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  check("manifest href is prefixed", Boolean(href?.startsWith("/portfolio/")), href ?? "");
  const res = await page.request.get(new URL(href, BASE).href);
  check("manifest served 200", res.ok(), String(res.status()));
  check(
    "manifest content type",
    /manifest\+json|application\/json|webmanifest/.test(res.headers()["content-type"] ?? ""),
    res.headers()["content-type"],
  );

  const manifest = await res.json();
  check("app name is Portfolio", manifest.name === "Portfolio", `name=${manifest.name}`);
  check("display is standalone", manifest.display === "standalone", manifest.display);

  // Icons.
  const iconBad = [];
  for (const icon of manifest.icons) {
    const r = await page.request.get(new URL(icon.src, new URL(href, BASE)).href);
    if (!r.ok()) iconBad.push(`${icon.src} -> ${r.status()}`);
  }
  check("manifest icons resolve", iconBad.length === 0, iconBad.join(" "));

  // iOS bits.
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  check("apple-touch-icon present", Boolean(apple), apple ?? "");
  check(
    "apple-mobile-web-app-capable set",
    (await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute("content")) ===
      "yes",
  );

  // The worker: scope is the thing that fails silently.
  const sw = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { state: "unsupported" };
    for (let i = 0; i < 150; i++) {
      const reg = (await navigator.serviceWorker.getRegistrations()).find((r) => r.active);
      if (reg?.active?.state === "activated") return { state: reg.active.state, scope: reg.scope };
      await new Promise((r) => setTimeout(r, 100));
    }
    return { state: "never activated", scope: null };
  });
  check("service worker activates", sw.state === "activated", sw.state);
  check(
    "worker scope is /portfolio/",
    Boolean(sw.scope && new URL(sw.scope).pathname === "/portfolio/"),
    `scope=${sw.scope}`,
  );

  const cached = await page.evaluate(async () => {
    const out = [];
    for (const n of await caches.keys()) {
      const c = await caches.open(n);
      out.push(...(await c.keys()).map((r) => new URL(r.url).pathname));
    }
    return out;
  });
  check("shell precached", cached.length > 5, `${cached.length} entries`);
  check("stylesheet precached", cached.some((u) => u.endsWith(".css")));
  check("webfonts precached", cached.some((u) => u.endsWith(".woff2")));

  // Offline, live.
  await ctx.setOffline(true);
  await page.goto(BASE);
  const off = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    return {
      h1: h1 ? h1.textContent : "",
      bg: getComputedStyle(document.body).backgroundColor,
      font: h1 ? getComputedStyle(h1).fontFamily : "",
    };
  });
  check("offline: content", off.h1.includes("Sikander"));
  check("offline: stylesheet applied", off.bg === "rgb(239, 230, 210)", off.bg);
  check("offline: webfont applied", off.font.toLowerCase().includes("cormorant"));
  await ctx.setOffline(false);
} finally {
  check("no 4xx/5xx responses", notFound.length === 0, notFound.slice(0, 6).join(" "));
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(failed.length ? `\n${failed.length} failed.\n` : `\nall ${results.length} live checks passed.\n`);
process.exit(failed.length ? 1 : 0);