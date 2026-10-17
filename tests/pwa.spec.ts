import { test, expect } from "./fixtures";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * PWA surface: manifest, icons, service worker, and the offline behaviour
 * that is the whole point of having a worker.
 *
 * The base path is the recurring hazard here. The manifest resolves its URLs
 * relative to its own location, so a plain "/" that happens to look right in
 * development becomes a 404 the moment the site is served from /portfolio/.
 * Everything below is checked as it would actually be requested.
 */

const ROOT = process.cwd();
const CREAM = "rgb(239, 230, 210)";

test.describe("manifest", () => {
  test("is linked and served as a real manifest", async ({ page }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href, "no manifest link in the head").toBeTruthy();

    const res = await page.request.get(href!);
    expect(res.status(), `${href} should resolve`).toBe(200);
    expect(res.headers()["content-type"], "wrong content type").toMatch(
      /manifest\+json|application\/json|webmanifest/,
    );
  });

  test("declares the fields an install prompt needs", async ({ page }) => {
    await page.goto("/");
    const href = (await page.locator('link[rel="manifest"]').getAttribute("href"))!;
    const manifest = await (await page.request.get(href)).json();

    for (const field of ["name", "short_name", "start_url", "scope", "display", "icons"]) {
      expect(manifest[field], `manifest is missing "${field}"`).toBeTruthy();
    }
    expect(manifest.display, "standalone is what makes it feel like an app").toBe("standalone");

    // The installed app is called Portfolio. Pinned because it is easy to
    // reintroduce the person's name here and only notice on a home screen.
    expect(manifest.name, "installed app name changed").toBe("Portfolio");
    expect(manifest.short_name).toBe("Portfolio");

    // A short_name longer than ~12 characters gets ellipsised on Android.
    expect(
      manifest.short_name.length,
      `short_name "${manifest.short_name}" will be truncated on an Android launcher`,
    ).toBeLessThanOrEqual(12);
  });

  test("every icon it names actually resolves", async ({ page }) => {
    await page.goto("/");
    const href = (await page.locator('link[rel="manifest"]').getAttribute("href"))!;
    const manifest = await (await page.request.get(href)).json();

    const manifestUrl = new URL(href, page.url()).href;
    expect(manifest.icons.length, "no icons declared").toBeGreaterThanOrEqual(3);

    for (const icon of manifest.icons) {
      const url = new URL(icon.src, manifestUrl).href;
      const res = await page.request.get(url);
      expect(res.status(), `${icon.src} -> ${url} returned ${res.status()}`).toBe(200);
    }
  });

  test("ships a maskable icon, which Android needs for adaptive shapes", async ({ page }) => {
    await page.goto("/");
    const href = (await page.locator('link[rel="manifest"]').getAttribute("href"))!;
    const manifest = await (await page.request.get(href)).json();

    const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => ({
      ...i,
      purpose: i.purpose ?? "any",
    }));
    expect(sizes.some((i: { sizes: string }) => i.sizes === "192x192"), "no 192x192 icon").toBe(true);
    expect(
      sizes.some(
        (i: { sizes: string; purpose: string }) =>
          i.sizes === "512x512" && i.purpose.includes("maskable"),
      ),
      "no maskable 512x512 icon",
    ).toBe(true);
  });

  test("the any and maskable icons are identical", async ({ page }) => {
    await page.goto("/");
    const href = (await page.locator('link[rel="manifest"]').getAttribute("href"))!;
    const manifest = await (await page.request.get(href)).json();

    const dir = href.slice(0, href.lastIndexOf("/") + 1);
    type Icon = { src: string; sizes: string; purpose?: string };

// Manifest icon src values are relative to the manifest's own URL, which sits
// in the deployment's base path. Resolving against page.url() handles both the
// path prefix and the relative form without inventing a host.
const absolute = (src: string) => new URL(src, new URL(href, page.url()).href).href;

const pick = (icons: Icon[], purpose: string) =>
  icons.find((i) => (i.purpose ?? "any").includes(purpose) && i.sizes === "512x512")?.src;

const any = pick(manifest.icons as Icon[], "any");
const maskable = pick(manifest.icons as Icon[], "maskable");
    expect(any, "no 512x512 any icon").toBeTruthy();
    expect(maskable, "no 512x512 maskable icon").toBeTruthy();

    const a = await (await page.request.get(absolute(any!))).body();
    const b = await (await page.request.get(absolute(maskable!))).body();

    /* Which of the two a launcher picks from a web manifest is not ours to
       decide. They diverged once: the artwork was enlarged but the maskable
       copy was shrunk to respect the 80% safe-zone guidance, so a device that
       took the maskable entry still rendered a small icon and the enlargement
       looked like it had done nothing. Identical bytes removes the question. */
    expect(
      a.equals(b),
      "the any and maskable icons differ; a launcher picking the maskable one will show a different size",
    ).toBe(true);
  });

  test("theme colour matches the page it describes", async ({ page }) => {
    await page.goto("/");
    const theme = await page.locator('meta[name="theme-color"]').getAttribute("content");
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // Mismatched values show as a black or white strip above a cream page
    // when installed, which reads as a rendering bug rather than a theme.
    // The meta is written as hex but the computed style comes back as rgb, so
    // both sides are normalised before comparing.
    const hex = (rgb: string) =>
      "#" +
      rgb
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map((v) => Number(v).toString(16).padStart(2, "0"))
        .join("");

    expect(theme, "no theme-color meta").toBeTruthy();
    expect(theme!.toLowerCase(), "theme-color disagrees with the page background").toBe(
      hex(bodyBg),
    );
    expect(bodyBg).toBe(CREAM);
  });
});

test.describe("iOS install support", () => {
  test("has an apple-touch-icon at the size iOS asks for", async ({ page }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect(href, "iOS falls back to a screenshot without this").toBeTruthy();
    expect(href).toMatch(/180x180|apple-touch-icon/);
    expect((await page.request.get(href!)).status()).toBe(200);
  });

  test("declares standalone capability under the name iOS reads", async ({ page }) => {
    await page.goto("/");
    // Next's appleWebApp.capable emits the unprefixed spelling; iOS reads
    // the apple- prefixed one, so both have to be present.
    const apple = await page
      .locator('meta[name="apple-mobile-web-app-capable"]')
      .getAttribute("content");
    const generic = await page
      .locator('meta[name="mobile-web-app-capable"]')
      .getAttribute("content");
    expect(apple, "iOS will not open this standalone without it").toBe("yes");
    expect(generic).toBe("yes");
  });
});

test.describe("service worker", () => {
  /** Waits for a worker to be installed, active and fully activated. */
  async function waitForActiveWorker(page: import("@playwright/test").Page) {
    return page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        const active = (await navigator.serviceWorker.getRegistrations()).find((r) => r.active)
          ?.active;
        if (active?.state === "activated") return active.state;
        await new Promise((r) => setTimeout(r, 100));
      }
      return "never activated";
    });
  }

  test("registers and reaches an activated state", async ({ page }) => {
    await page.goto("/");
    // Polled rather than read once off navigator.serviceWorker.ready: ready
    // resolves while the worker is still transitioning, so a single read sees
    // "activating" and the assertion becomes a coin flip.
    expect(await waitForActiveWorker(page)).toBe("activated");
  });

  test("is scoped to the deployment base path", async ({ page }) => {
    await page.goto("/");
    expect(await waitForActiveWorker(page)).toBe("activated");
    const scope = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.scope;
    });
    // On a project site the scope must be /portfolio/, not "/". A worker
    // registered at the wrong scope silently fails to control the page, which
    // looks exactly like "the service worker does not work".
    const path = new URL(scope).pathname;
    expect(path.endsWith("/"), `scope should end at a directory, got ${path}`).toBe(true);
    expect(scope).toContain(new URL(page.url()).pathname.replace(/\/[^/]*$/, "/"));
  });

  test("precaches the app shell", async ({ page }) => {
    await page.goto("/");
    await waitForActiveWorker(page);
    const cached = await page.evaluate(async () => {
      const names = await caches.keys();
      const out: string[] = [];
      for (const n of names) {
        const c = await caches.open(n);
        out.push(...(await c.keys()).map((r) => new URL(r.url).pathname));
      }
      return out;
    });
    expect(cached.length, "nothing was precached").toBeGreaterThan(3);
    expect(
      cached.some((u) => u.endsWith("/") || u.endsWith("index.html")),
      `no document in the cache: ${cached.join(", ")}`,
    ).toBe(true);
    expect(
      cached.some((u) => u.includes("manifest.webmanifest")),
      "manifest not precached",
    ).toBe(true);
    // The reason precacheBuildOutput exists: on a first visit the worker is
    // not yet in control, so the stylesheet is never seen by the fetch
    // handler. Without this the offline page renders unstyled.
    expect(
      cached.some((u) => u.endsWith(".css")),
      "no stylesheet precached; an offline load would be unstyled",
    ).toBe(true);
  });

  test("leaves third-party analytics alone", async ({ page }) => {
    await page.goto("/");
    await waitForActiveWorker(page);
    const foreign = await page.evaluate(async () => {
      const out: string[] = [];
      for (const n of await caches.keys()) {
        const c = await caches.open(n);
        out.push(...(await c.keys()).map((r) => new URL(r.url).origin));
      }
      return [...new Set(out)].filter((o) => o !== new URL(location.origin).origin);
    });
    // Caching the analytics beacon would double-count hits or serve one
    // visitor another visitor's data.
    expect(foreign, `cached cross-origin responses: ${foreign.join(", ")}`).toEqual([]);
  });

  test("serves the page with the network switched off", async ({ page, context }) => {
    await page.goto("/");
    expect(await waitForActiveWorker(page)).toBe("activated");

    await context.setOffline(true);
    await page.goto("/");

    await expect(page.locator("h1"), "offline navigation produced no page").toContainText(
      "Sikander Mughal",
    );
    // The stylesheet matters as much as the text: an unstyled document is a
    // broken offline page even though it "loaded".
    const offline = await page.evaluate(() => ({
      bodyBg: getComputedStyle(document.body).backgroundColor,
      // Proves the woff2 was cached too. Without it the page renders in a
      // system serif and reads as a different site, not a cached copy.
      h1Font: getComputedStyle(document.querySelector("h1")!).fontFamily,
      sheets: [...document.styleSheets].filter((s) => s.href).length,
    }));
    expect(offline.bodyBg, "offline page lost its stylesheet").toBe(CREAM);
    expect(offline.sheets, "no stylesheet was applied offline").toBeGreaterThan(0);
    expect(offline.h1Font.toLowerCase(), "offline page lost its webfont").toContain("cormorant");

    // And the client bundle is live, not just the markup.
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(() =>
        document.documentElement.classList.contains("js-motion"),
      ),
      "offline page never hydrated",
    ).toBe(true);

    await context.setOffline(false);
  });
});

test.describe("the worker script itself", () => {
  test("carries a version and a precache list", () => {
    const src = readFileSync(join(ROOT, "public", "sw.js"), "utf8");
    expect(src).toMatch(/const VERSION = "v\d+"/);
    expect(src).toMatch(/PRECACHE/);
    // Relative URLs only. A "/icons/..." literal would 404 under a base path.
    expect(src, "sw.js must resolve its URLs relative to itself").not.toMatch(/addAll\(\s*\[\s*"/);
    expect(src).toMatch(/addAll\(\s*PRECACHE/);
  });

  test("bails out of caching anything that is not a same-origin GET", () => {
    const src = readFileSync(join(ROOT, "public", "sw.js"), "utf8");
    expect(src).toMatch(/request\.method !== "GET"/);
    expect(src).toMatch(/url\.origin !== self\.location\.origin/);
  });

  test("every precached path actually resolves", async ({ page }) => {
    const src = readFileSync(join(ROOT, "public", "sw.js"), "utf8");
    const block = src.match(/const PRECACHE = \[([\s\S]*?)\]/);
    expect(block, "could not find the PRECACHE array in sw.js").toBeTruthy();

    const entries = [...block![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(entries.length, "precache list is empty").toBeGreaterThan(3);

    // Cache.addAll is atomic: one 404 anywhere and the whole install is
    // discarded, the worker goes straight to redundant, and nothing on the
    // page says why. Checking each entry on its own turns that into a
    // readable failure naming the bad path.
    await page.goto("/");
    // Resolve the worker against the page origin: scriptURL is absolute once a
    // worker is active, but the fallback path has to be turned into one.
    const swDir = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      const href = regs[0]?.active?.scriptURL ?? new URL("/sw.js", location.href).href;
      return new URL(href).pathname.replace(/[^/]*$/, "");
    });

    for (const entry of entries) {
      const url = new URL(entry, `https://x${swDir}`).pathname;
      const res = await page.request.get(url);
      expect(res.status(), `precache entry "${entry}" -> ${url} returned ${res.status()}`).toBe(200);
    }
  });
});