/**
 * Verifies the deployed *shape*, not just the deployed files.
 *
 *   npm run verify:deploy
 *
 * Builds with BASE_PATH set, serves out/ under that prefix the way GitHub
 * Pages does, and then checks in a real browser that:
 *
 *   - the page renders and every asset resolves under the prefix
 *   - the manifest's icons resolve
 *   - the service worker registers with a scope matching the prefix
 *   - the page still works with the network switched off
 *
 * This exists because the base path has already broken twice here: once for
 * asset URLs and once for a precache entry. Both produced a page that looked
 * fine and a worker that silently did nothing.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "@playwright/test";

const BASE_PATH = process.env.VERIFY_BASE_PATH || "/portfolio";
const PORT = Number(process.env.VERIFY_PORT || 4455);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const URL_BASE = `${ORIGIN}${BASE_PATH}/`;

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "ok  " : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "ignore", shell: process.platform === "win32", env });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on("error", reject);
  });
}

console.log(`\nBuilding with BASE_PATH=${BASE_PATH} and serving out/ under that prefix.\n`);
await run("npm", ["run", "build"], { ...process.env, BASE_PATH });

const server = spawn("node", ["scripts/preview.mjs", `--port=${PORT}`, `--base=${BASE_PATH}`], {
  stdio: "ignore",
  // No shell: node is resolvable directly, and going through cmd.exe makes
  // Node emit a deprecation warning about unescaped arguments.
  shell: false,
});

const cleanup = () => {
  if (!server.killed) server.kill();
};
process.on("exit", cleanup);

// Wait for the server to answer.
let up = false;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(URL_BASE);
    if (r.ok) {
      up = true;
      break;
    }
  } catch {
    /* not yet */
  }
  await sleep(250);
}
if (!up) {
  console.error(`  preview server never came up at ${URL_BASE}`);
  cleanup();
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

try {
  await page.goto(URL_BASE, { waitUntil: "networkidle" });

  check("page renders under the prefix", (await page.locator("h1").textContent())?.includes("Sikander"));

  // Every referenced asset must resolve.
  const urls = await page.evaluate(() =>
    [...document.querySelectorAll("link[href], script[src], img[src]")]
      .map((el) => el.href || el.src)
      .filter((u) => u.startsWith(location.origin)),
  );
  const bad = [];
  for (const u of urls) {
    const res = await fetch(u);
    if (!res.ok) bad.push(`${res.status} ${u}`);
  }
  check("every asset resolves under the prefix", bad.length === 0, bad.join(" "));

  // Manifest and its icons.
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  check("manifest href is prefixed", Boolean(manifestHref?.startsWith(BASE_PATH)), manifestHref ?? "");
  const manifest = await (await fetch(new URL(manifestHref, URL_BASE))).json();
  check("app name", manifest.name === "Portfolio", `name=${manifest.name}`);
  const iconBad = [];
  for (const icon of manifest.icons) {
    const u = new URL(icon.src, new URL(manifestHref, URL_BASE)).href;
    const r = await fetch(u);
    if (!r.ok) iconBad.push(`${r.status} ${u}`);
  }
  check("manifest icons resolve", iconBad.length === 0, iconBad.join(" "));

  // The one that fails silently: worker scope.
  const sw = await page.evaluate(async () => {
    for (let i = 0; i < 120; i++) {
      const reg = (await navigator.serviceWorker.getRegistrations()).find((r) => r.active);
      if (reg?.active?.state === "activated") {
        // scope lives on the registration, not on the ServiceWorker object.
        return { state: reg.active.state, scope: reg.scope };
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return { state: "never activated", scope: null };
  });
  check("worker activates", sw.state === "activated", sw.state);
  check(
    "worker scope covers the prefix",
    Boolean(sw.scope && new URL(sw.scope).pathname === `${BASE_PATH}/`),
    `scope=${sw.scope}`,
  );

  // Offline under the prefix.
  await ctx.setOffline(true);
  await page.goto(URL_BASE);
  const offline = await page.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent ?? "",
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  check("offline page has content", offline.h1.includes("Sikander"));
  check("offline page keeps its stylesheet", offline.bg === "rgb(239, 230, 210)", offline.bg);
  await ctx.setOffline(false);
} finally {
  await browser.close();
  cleanup();
}

const failed = results.filter((r) => !r.pass);
console.log(
  failed.length ? `\n${failed.length} check(s) failed.\n` : `\nall ${results.length} checks passed.\n`,
);
process.exit(failed.length ? 1 : 0);