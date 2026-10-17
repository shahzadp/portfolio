/**
 * Generates the PWA icon set into public/icons/ from public/icons/icon.svg.
 *
 *   npm run icons
 *
 * The SVG is the authored source; this only rasterises it. Rasterising rather
 * than hand-authoring four PNGs means the manifest can offer a vector icon
 * alongside the bitmaps and they cannot drift apart.
 *
 * Maskable icons are the reason this is a script and not four files: the
 * launcher crops them into an arbitrary shape, so the artwork has to be
 * shrunk into the safe zone or the outer blocks get sliced off.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "public", "icons");
const SOURCE = join(OUT, "icon.svg");

if (!existsSync(SOURCE)) {
  console.error("public/icons/icon.svg is missing. That file is the icon source.");
  process.exit(1);
}

const svg = readFileSync(SOURCE, "utf8");
const svgUrl = pathToFileURL(SOURCE).href;

/**
 * `scale` shrinks the artwork about the centre, on top of whatever the SVG
 * itself applies.
 *
 * Every target is 1.0, deliberately. Which icon a launcher picks from a web
 * manifest is not ours to decide -- it may take the "any" entry or the
 * "maskable" one -- so the two must be identical. An earlier build scaled the
 * artwork up to 86% but shrank the maskable variant to 0.64 to respect the
 * 80% safe-zone guidance; a launcher that picked the maskable entry then
 * rendered it at about 55% of the tile and the enlargement looked like it had
 * done nothing.
 *
 * If you change this, change it for all four. A per-target scale here is the
 * bug, not the fix.
 */
const TARGETS = [
  // filename                     size  scale  purpose
  ["icon-192.png", 192, 1, "manifest, any purpose"],
  ["icon-512.png", 512, 1, "manifest, any purpose"],
  ["icon-maskable-512.png", 512, 1, "manifest, maskable"],
  ["apple-touch-icon.png", 180, 1, "iOS home screen"],
];

function markup(size, scale) {
  return `<!doctype html><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; }
  html, body { width: ${size}px; height: ${size}px; overflow: hidden; background: #fff; }
  body { display: grid; place-items: center; }
  img {
    width: ${size}px;
    height: ${size}px;
    display: block;
    transform: scale(${scale});
    transform-origin: center;
  }
</style>
<img src="${svgUrl}" width="${size}" height="${size}" alt="">`;
}

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const [name, size, scale, why] of TARGETS) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.goto(`file:///${encodeURI(ROOT.replace(/\\/g, "/"))}/`, { waitUntil: "domcontentloaded" });
  await page.setContent(markup(size, scale), { waitUntil: "load" });
  // The SVG comes off disk, so wait for it to decode before shooting.
  await page.evaluate(() => {
    const img = document.querySelector("img");
    return img.complete ? undefined : img.decode();
  });
  await page.screenshot({ path: join(OUT, name) });
  await page.close();
  console.log(
    `  ${name.padEnd(24)} ${String(size).padStart(3)}px  ${String(readFileSync(join(OUT, name)).length).padStart(6)} bytes  ${why}`,
  );
}
await browser.close();

console.log(`\n  wrote ${TARGETS.length} PNGs from public/icons/icon.svg (${svg.length} bytes of SVG)`);