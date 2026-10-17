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
 * 1.0 for "any" icons, which the launcher displays as-is.
 *
 * Maskable icons get 0.64. The maskable safe zone is a circle of diameter 80%
 * of the tile, so a mark may sit at most 40% of the tile width from the centre
 * measured to its farthest corner. On the authored 108 grid that corner sits
 * 45.25 units out (32 units on each axis, times root two), and the SVG scales
 * the artwork by 1.45: 45.25 * 1.45 = 65.6 units, or 61% of the tile.
 * 65.6 * 0.64 = 42 units = 39%, just inside the limit. Raising this number
 * clips the outer blocks on a circular mask.
 */
const TARGETS = [
  // filename                     size  scale  purpose
  ["icon-192.png", 192, 1, "manifest, any purpose"],
  ["icon-512.png", 512, 1, "manifest, any purpose"],
  ["icon-maskable-512.png", 512, 0.64, "manifest, maskable: launcher may crop"],
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