/**
 * Shows the PWA icon the way each platform presents it, plus what the
 * installed app looks like. Review aid, not part of the site.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT = join(ROOT, ".review");
mkdirSync(OUT, { recursive: true });

const icons = [
  ["icon-192.png", 192, "Home screen, Android"],
  ["icon-maskable-512.png", 512, "Android adaptive (maskable)"],
  ["apple-touch-icon.png", 180, "iOS home screen"],
];

// Round and squircle masks applied to the any-purpose icon, which is what the
// launcher does to it when the platform crops.
const masks = [
  ["circle", "border-radius:50%", "round mask"],
  ["squircle", "border-radius:30%", "squircle mask"],
];

const card = (style, label, src, px) => `
  <figure>
    <div class="tile" style="${style};width:${px}px;height:${px}px">
      <img src="${src}" width="${px}" height="${px}" alt="">
    </div>
    <figcaption>${label}</figcaption>
  </figure>`;

const sheet = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; padding:30px; background:#2b2620; color:#efe6d2;
         font:13px/1.5 ui-monospace, monospace; }
  h1 { font-size:17px; margin:0 0 20px; letter-spacing:.1em; text-transform:uppercase; color:#cdbf9f; }
  h2 { font-size:12px; margin:26px 0 12px; letter-spacing:.12em; text-transform:uppercase; color:#d99a76; }
  .row { display:flex; gap:24px; align-items:flex-end; flex-wrap:wrap; }
  figure { margin:0; text-align:center; }
  .tile { overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,.45); display:grid; place-items:center;
          background:#fff; }
  .tile img { width:100%; height:100%; display:block; }
  figcaption { margin-top:10px; color:#cdbf9f; }
  .app { width:250px; background:#EFE6D2; border-radius:26px; padding:10px 0 0;
         box-shadow:0 10px 30px rgba(0,0,0,.5); }
  .app .bar { display:flex; align-items:center; gap:8px; padding:0 14px 10px; }
  .app .bar img { width:18px; height:18px; border-radius:4px; }
  .app .bar span { font-size:12px; color:#2b2620; font-weight:600; letter-spacing:.02em; }
  .app .body { background:#EFE6D2; height:300px; overflow:hidden; border-radius:12px 12px 0 0; }
  .app .body h1 { font:700 21px/1.05 Georgia, serif; color:#2b2620; margin:14px 14px 8px;
                  letter-spacing:0; text-transform:none; }
  .app .body p { font:13px/1.5 system-ui, sans-serif; color:#4a4033; margin:0 14px; }
</style>
<h1>PWA icon review</h1>

<h2>As each platform presents it</h2>
<div class="row">
  ${card("", icons[0][2], icons[0][0], icons[0][1])}
  ${card("", icons[1][2], icons[1][0], 200)}
  ${card("", icons[2][2], icons[2][0], icons[2][1])}
  ${masks.map(([n, s, l]) => card(s, l, "icon-512.png", 150)).join("")}
</div>

<h2>Launched from the home screen</h2>
<div class="row">
  <div class="app">
    <div class="bar"><img src="icon-192.png" alt=""><span>Portfolio</span></div>
    <div class="body">
      <h1>Sikander Mughal, building cutting-edge software.</h1>
      <p>Full stack developer. Selected projects and a way to get in touch.</p>
    </div>
  </div>
</div>
`;

writeFileSync(join(OUT, "icons.html"), sheet, "utf8");

// Copy every icon next to the sheet so relative paths resolve. An earlier
// version copied only the three in `icons`, leaving the masked previews
// silently blank.
const { copyFileSync, readdirSync } = await import("node:fs");
for (const f of readdirSync(join(ROOT, "public", "icons"))) {
  if (/\.(png|svg)$/.test(f)) copyFileSync(join(ROOT, "public", "icons", f), join(OUT, f));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(`file:///${join(OUT, "icons.html").replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.screenshot({ path: join(OUT, "icons.png"), fullPage: true });
await browser.close();

console.log(join(OUT, "icons.png"));