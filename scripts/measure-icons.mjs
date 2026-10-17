/**
 * Measures how much of the tile the artwork actually occupies in the finished
 * launcher bitmaps, for a set of Android projects.
 *
 * Reads each PNG, finds the bounding box of every non-background pixel, and
 * reports it as a fraction of the image. That is the number that determines
 * how an icon looks next to others on a home screen.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const targets = process.argv.slice(2);

const browser = await chromium.launch();

for (const dir of targets) {
  const mip = join(dir, "android", "app", "src", "main", "res");
  if (!existsSync(mip)) {
    console.log(`\n${dir}\n  no res/ directory`);
    continue;
  }
  const densities = readdirSync(mip).filter((d) => d.startsWith("mipmap-")).sort();
  console.log(`\n${dir}`);

  for (const d of densities) {
    const png = join(mip, d, "ic_launcher.png");
    if (!existsSync(png)) continue;
    const b64 = readFileSync(png).toString("base64");

    const page = await browser.newPage();
    const result = await page.evaluate(async (data) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { data: px, width: w, height: h } = ctx.getImageData(0, 0, c.width, c.height);

      // Corner colour is the background; anything meaningfully different is
      // artwork. This finds the ink without needing to know the palette.
      const at = (x, y) => {
        const i = (y * w + x) * 4;
        return [px[i], px[i + 1], px[i + 2], px[i + 3]];
      };
      const bg = at(0, 0);
      const isInk = (x, y) => {
        const [r, g, b, a] = at(x, y);
        if (a < 8) return false;
        return Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) > 60;
      };

      let minX = w, maxX = -1, minY = h, maxY = -1, ink = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!isInk(x, y)) continue;
          ink++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      return {
        size: `${w}x${h}`,
        bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`,
        inkBox: `${minX},${minY} -> ${maxX},${maxY}`,
        widthPct: Math.round(((maxX - minX + 1) / w) * 100),
        heightPct: Math.round(((maxY - minY + 1) / h) * 100),
        marginPct: Math.round((minX / w) * 100),
        inkPct: Math.round((ink / (w * h)) * 100),
      };
    }, b64);
    await page.close();

    console.log(
      `  ${d.padEnd(22)} ${result.size.padEnd(10)} bg=${result.bg.padEnd(18)} art ${String(result.widthPct).padStart(3)}% wide x ${String(result.heightPct).padStart(3)}% tall  margin ${String(result.marginPct).padStart(2)}%  ink ${String(result.inkPct).padStart(2)}%`,
    );
  }
}

await browser.close();