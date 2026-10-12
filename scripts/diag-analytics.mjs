/**
 * One-off diagnostic against the live site: does the GoatCounter script tag
 * reach the DOM, does the browser fetch it, and does it ping the count
 * endpoint? Runs against the real deployment with no test stubbing.
 *
 *   node scripts/diag-analytics.mjs [url]
 */
import { chromium } from "@playwright/test";

const URL = process.argv[2] ?? "https://shahzadp.github.io/portfolio/";

const browser = await chromium.launch();
const page = await browser.newPage();

const requested = [];
const responses = [];
const failures = [];
const consoleErrors = [];

page.on("request", (r) => {
  const u = r.url();
  if (u.includes("goatcounter") || u.includes("zgo.at")) requested.push(`${r.method()} ${u}`);
});
page.on("response", async (r) => {
  const u = r.url();
  if (u.includes("goatcounter") || u.includes("zgo.at")) {
    let body = "";
    try {
      body = (await r.text()).slice(0, 120);
    } catch {
      body = "<unreadable>";
    }
    responses.push(`${r.status()} ${r.request().method()} ${u.slice(0, 90)} :: ${body}`);
  }
});
page.on("requestfailed", (r) => failures.push(`${r.url()} (${r.failure()?.errorText})`));
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 140));
});

await page.goto(URL, { waitUntil: "networkidle" });
// afterInteractive scripts appear after hydration; give it a moment.
await page.waitForTimeout(3000);

const dom = await page.evaluate(() => {
  const scripts = [...document.querySelectorAll("script[data-goatcounter]")].map((s) => ({
    src: s.getAttribute("src"),
    endpoint: s.getAttribute("data-goatcounter"),
    async: s.getAttribute("async"),
    defer: s.getAttribute("defer"),
    parent: s.parentElement?.tagName,
  }));
  return {
    count: scripts.length,
    scripts,
    windowGoat: typeof window.goatcounter,
    location: window.location.href,
  };
});

console.log("url:            ", URL);
console.log("script in DOM:  ", dom.count);
console.log("  details:      ", JSON.stringify(dom.scripts, null, 2).replace(/\n/g, "\n                 "));
console.log("window.goatcounter:", dom.windowGoat);
console.log("requests seen:  ", requested.length ? requested : "(none)");
console.log("responses:      ");
for (const r of responses) console.log("                 " + r);
console.log("failures:       ", failures.length ? failures : "(none)");
console.log("console errors: ", consoleErrors.length ? consoleErrors : "(none)");

await browser.close();