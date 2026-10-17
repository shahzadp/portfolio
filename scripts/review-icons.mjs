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

const card = (style, label, src, px) => `
  <figure>
    <div class="tile" style="${style};width:${px}px;height:${px}px">
      <img src="${src}" width="${px}" height="${px}" alt="">
    </div>
    <figcaption>${label}</figcaption>
  </figure>`;

// What a launcher shows: the bitmap at 1:1 with the device mask applied.
// Deliberately not a crop-and-zoom. An earlier version previewed the icon
// cropped to its central 72, which is what would make the authored geometry
// look correct -- but the installed icon on the phone came out at roughly the
// bitmap's own fraction, so the mask is being applied without that crop. The
// preview follows the evidence rather than the spec.
const masks = [
  ["circle", "border-radius:50%", "circle mask"],
  ["squircle", "border-radius:30%", "squircle mask"],
  ["rounded", "border-radius:22%", "rounded square mask"],
];

const sheet = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; padding:30px; background:#2b2620; color:#efe6d2;
         font:13px/1.5 ui-monospace, monospace; }
  h1 { font-size:17px; margin:0 0 8px; letter-spacing:.1em; text-transform:uppercase; color:#cdbf9f; }
  .note { font-size:12px; color:#cdbf9f; margin:0 0 20px; max-width:72ch; line-height:1.6; }
  h2 { font-size:12px; margin:26px 0 12px; letter-spacing:.12em; text-transform:uppercase; color:#d99a76; }
  .row { display:flex; gap:24px; align-items:flex-end; flex-wrap:wrap; }
  figure { margin:0; text-align:center; }
  .tile { overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,.45); display:grid; place-items:center;
          background:#fff; }
  .tile img { width:100%; height:100%; display:block; }
  .masked { width:180px; height:180px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,.45); }
  .masked img { width:100%; height:100%; display:block; }
  figcaption { margin-top:10px; color:#cdbf9f; }
  .app { width:250px; background:#EFE6D2; border-radius:26px; padding:10px 0 0;
         box-shadow:0 10px 30px rgba(0,0,0,.5); }
  .app .bar { display:flex; align-items:center; gap:8px; padding:0 14px 10px; }
  .app .bar img { width:20px; height:20px; border-radius:5px; }
  .app .bar span { font-size:12px; color:#2b2620; font-weight:600; letter-spacing:.02em; }
  .app .body { background:#EFE6D2; height:300px; overflow:hidden; border-radius:12px 12px 0 0; }
  .app .body h1 { font:700 21px/1.05 Georgia, serif; color:#2b2620; margin:14px 14px 8px;
                  letter-spacing:0; text-transform:none; }
  .app .body p { font:13px/1.5 system-ui, sans-serif; color:#4a4033; margin:0 14px; }
</style>
<h1>PWA icon review</h1>
<p class="note">Both the "any" and the maskable icon are now byte-identical, so it
does not matter which one the launcher picks. They are shown at 1:1 with the
device mask applied, which is how the installed icon on the phone behaved.</p>

<h2>Under each launcher mask</h2>
<div class="row">
  ${masks
    .map(
      ([, s, l]) => `<figure><div class="masked" style="${s}"><img src="icon-512.png" alt=""></div>
    <figcaption>${l}</figcaption></figure>`,
    )
    .join("")}
</div>

<h2>Bitmaps as generated</h2>
<div class="row">
  ${card("", "icon-192, any", icons[0][0], icons[0][1])}
  ${card("", "icon-512, any", icons[1][0], 200)}
  ${card("", "icon-maskable-512", icons[2][0], 200)}
  ${card("", "apple-touch-icon", icons[2][0], icons[2][1])}
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