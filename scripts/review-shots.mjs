/**
 * Visual review screenshots.
 *
 *   npm run review              # against a server already on :8080
 *   npm run preview:lan         # start the server first, in another terminal
 *
 * Captures the real build at the widths that matter and assembles a contact
 * sheet, so layout changes can be judged by eye before anything is deployed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE = process.env.REVIEW_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), ".review");
mkdirSync(OUT, { recursive: true });

const PHONE = { ...devices["iPhone 13"] };
const ANDROID = { ...devices["Pixel 7"] };

async function shoot(browser, { name, use, viewport, fullPage = false, clip, act }) {
  const ctx = await browser.newContext({ ...use, viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  // Let the reveal transitions settle so nothing is caught mid-fade.
  await page.waitForTimeout(900);
  if (act) await act(page);
  if (clip) await page.locator(clip).screenshot({ path: join(OUT, `${name}.png`) });
  else await page.screenshot({ path: join(OUT, `${name}.png`), fullPage });
  await ctx.close();
  return name;
}

const browser = await chromium.launch();
const taken = [];

taken.push(await shoot(browser, { name: "phone-fold", use: PHONE, viewport: { width: 390, height: 844 } }));
taken.push(
  await shoot(browser, {
    name: "phone-menu",
    use: PHONE,
    viewport: { width: 390, height: 844 },
    act: async (p) => {
      await p.locator("[data-menu-btn]").click();
      await p.waitForTimeout(400);
    },
  }),
);
taken.push(await shoot(browser, { name: "phone-full", use: ANDROID, viewport: { width: 412, height: 915 }, fullPage: true }));
taken.push(
  await shoot(browser, { name: "small-320", use: PHONE, viewport: { width: 320, height: 800 } }),
);
taken.push(await shoot(browser, { name: "tablet", use: PHONE, viewport: { width: 820, height: 1180 } }));
taken.push(await shoot(browser, { name: "desktop", use: PHONE, viewport: { width: 1440, height: 900 } }));

await browser.close();

const cell = (file, label, cls = "") => `
  <figure class="${cls}">
    <img src="${file}.png" alt="${label}" />
    <figcaption>${label}</figcaption>
  </figure>`;

const sheet = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; padding:28px; background:#2b2620; color:#efe6d2;
         font:13px/1.5 ui-monospace, monospace; }
  h1 { font-size:17px; margin:0 0 18px; letter-spacing:.1em; text-transform:uppercase; color:#cdbf9f; }
  h2 { font-size:12px; margin:24px 0 10px; letter-spacing:.12em; text-transform:uppercase; color:#d99a76; }
  .row { display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap; }
  figure { margin:0; }
  img { display:block; border:1px solid #cdbf9f; background:#efe6d2; height:660px; }
  .tall img { height:1900px; }
  figcaption { margin-top:7px; color:#efe6d2; }
</style>
<h1>Layout review</h1>

<h2>Phone &mdash; 390&times;844 (iPhone 13)</h2>
<div class="row">
  ${cell("phone-fold", "First screen")}
  ${cell("phone-menu", "Menu open")}
</div>

<h2>Other widths</h2>
<div class="row">
  ${cell("small-320", "320px, smallest supported")}
  ${cell("tablet", "820px")}
  ${cell("desktop", "1440px")}
</div>

<h2>Whole page &mdash; 412px</h2>
<div class="row tall">${cell("phone-full", "Android, full scroll")}</div>
`;

writeFileSync(join(OUT, "sheet.html"), sheet, "utf8");

const sheetBrowser = await chromium.launch();
const sheetPage = await sheetBrowser.newPage({ viewport: { width: 1340, height: 1200 } });
await sheetPage.goto(`file:///${join(OUT, "sheet.html").replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await sheetPage.screenshot({ path: join(OUT, "sheet.png"), fullPage: true });
await sheetBrowser.close();

console.log(`captured ${taken.length} shots into ${OUT}`);
console.log(join(OUT, "sheet.png"));