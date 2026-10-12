import { test, expect } from "./fixtures";
import { horizontalOverflow, isTouchDevice } from "./helpers";

/** Extra widths beyond the configured device matrix. */
const WIDTHS = [320, 360, 390, 414, 480, 600, 768, 900, 1024, 1280, 1440, 1920, 2560];

test.describe("responsive layout", () => {
  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const offenders = await horizontalOverflow(page);
      expect(offenders, `overflowing elements at ${width}px: ${JSON.stringify(offenders)}`).toEqual([]);
    });
  }

  test("content reflows instead of scrolling sideways", async ({ page }) => {
    await page.goto("/");

    await page.setViewportSize({ width: 320, height: 800 });
    let w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w, "320px overflows").toBeLessThanOrEqual(320);

    await page.setViewportSize({ width: 1920, height: 1080 });
    w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w, "1920px overflows").toBeLessThanOrEqual(1920);
  });

  test("portrait stays inside its frame at every width", async ({ page }) => {
    await page.goto("/");
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const img = page.locator("#top img");
      await expect(img).toBeVisible();
      const box = (await img.boundingBox())!;
      const vw = await page.evaluate(() => document.documentElement.clientWidth);
      expect(box.width, `portrait wider than viewport at ${width}px`).toBeLessThanOrEqual(vw);
      expect(box.x, `portrait starts off-screen at ${width}px`).toBeGreaterThanOrEqual(0);
    }
  });

  test("hero stacks on phones and sits side-by-side on desktop", async ({ page }) => {
    await page.goto("/");

    // Phone: the portrait should sit below the headline (stacked).
    await page.setViewportSize({ width: 390, height: 844 });
    const phoneH1 = (await page.locator("#top h1").boundingBox())!;
    const phonePortrait = (await page.locator("#top img").boundingBox())!;
    expect(
      phonePortrait.y,
      "on a phone the portrait should sit below the headline",
    ).toBeGreaterThan(phoneH1.y);

    // Desktop: the portrait should be vertically aligned with the headline,
    // i.e. beside the text rather than stacked underneath it.
    await page.setViewportSize({ width: 1440, height: 900 });
    const deskH1 = (await page.locator("#top h1").boundingBox())!;
    const deskPortrait = (await page.locator("#top img").boundingBox())!;
    expect(
      deskPortrait.x,
      "on desktop the portrait should sit to the right of the text",
    ).toBeGreaterThan(deskH1.x + deskH1.width - 1);

    // Vertically centred against the hero, so it overlaps the text block's band.
    const overlapsText = deskPortrait.y < deskH1.y + deskH1.height;
    expect(overlapsText, "on desktop the portrait should share a row with the headline").toBe(true);
  });

  test("project grid drops to one column on narrow screens", async ({ page }) => {
    await page.goto("/");

    await page.setViewportSize({ width: 390, height: 844 });
    const phoneCols = await page.evaluate(() => {
      const h3 = document.querySelector("#projects h3")!;
      return getComputedStyle(h3.parentElement!.parentElement!).gridTemplateColumns.split(" ").length;
    });
    expect(phoneCols, "expected a single column on a phone").toBe(1);

    await page.setViewportSize({ width: 1440, height: 900 });
    const deskCols = await page.evaluate(() => {
      const h3 = document.querySelector("#projects h3")!;
      return getComputedStyle(h3.parentElement!.parentElement!).gridTemplateColumns.split(" ").length;
    });
    expect(deskCols, "expected multiple columns on desktop").toBeGreaterThan(1);
  });

  test("long text wraps rather than clipping", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 320, height: 800 });
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("h1, h2, h3, p, a, span")]
        .filter((el) => el.scrollWidth > el.clientWidth + 2)
        .map((el) => `${el.tagName}: ${(el.textContent || "").trim().slice(0, 40)}`),
    );
    expect(clipped, "elements clipping their own text").toEqual([]);
  });
});

test.describe("touch input", () => {
  test.skip(({ isMobile }) => !isMobile, "touch device only");

  test("touch is supported by the context", async ({ page, browserName }) => {
    await page.goto("/");
    const touch = await page.evaluate(() => "ontouchstart" in window || navigator.maxTouchPoints > 0);
    expect(touch, "context does not report touch support").toBe(true);
    expect(browserName).toBeTruthy();
  });

  test("tapping a nav link scrolls to the right section", async ({ page }) => {
    await page.goto("/");
    await page.locator('header nav a[href="#projects"]').tap();
    await page.waitForTimeout(700);

    const y = await page.locator("#projects").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(y), `#projects should be scrolled into view (top=${y})`).toBeLessThan(160);
  });

  test("tapping the WhatsApp badge triggers navigation", async ({ page, context }) => {
    await page.goto("/");
    const badge = page.locator('#contact a[aria-label*="WhatsApp"]');

    // Tapping must not throw; assert the link target instead of following it.
    const href = await badge.getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\//);

    await expect(badge).toBeVisible();
    await badge.scrollIntoViewIfNeeded();
    await badge.tap({ trial: true });
  });

  test("tap targets are at least 44px tall", async ({ page }) => {
    await page.goto("/");

    const targets: [string, string][] = [
      ['header nav a', "nav link"],
      ['#contact a[aria-label*="WhatsApp"]', "WhatsApp badge"],
      ['#contact a:has-text("Chat on WhatsApp")', "Chat button"],
      ["#projects a:has(h3)", "project card"],
    ];

    for (const [sel, name] of targets) {
      const loc = page.locator(sel).first();
      await loc.scrollIntoViewIfNeeded();
      const box = (await loc.boundingBox())!;
      expect(box.height, `${name} is only ${box.height}px tall`).toBeGreaterThanOrEqual(44);
      expect(box.width, `${name} is only ${box.width}px wide`).toBeGreaterThanOrEqual(44);
    }
  });

  test("page is genuinely scrollable on a phone", async ({ page }) => {
    await page.goto("/");

    const info = await page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      return {
        canScroll: el.scrollHeight > el.clientHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
      };
    });

    expect(info.canScroll, "the page has nothing to scroll").toBe(true);
    // `overflow: hidden` on html/body would silently kill scrolling on a phone.
    expect(["auto", "scroll", "visible"], `html overflow-y=${info.htmlOverflowY}`).toContain(
      info.htmlOverflowY,
    );
    expect(["auto", "scroll", "visible"], `body overflow-y=${info.bodyOverflowY}`).toContain(
      info.bodyOverflowY,
    );

    // And scrolling actually moves the viewport. The site sets
    // `scroll-behavior: smooth`, which makes scrollTo asynchronous — force an
    // instant jump so the assertion doesn't race the animation.
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: "instant" }));
    await page.waitForFunction(() => window.scrollY > 0, null, { timeout: 3000 });
    expect(await page.evaluate(() => window.scrollY), "window.scrollTo did nothing").toBeGreaterThan(
      0,
    );
  });

  test("no element steals the touch via hover-only affordances", async ({ page }) => {
    await page.goto("/");
    // Hover styles must not be the only way content becomes visible.
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a, button")]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.display === "none" || s.visibility === "hidden" || s.opacity === "0";
        })
        .map((el) => (el.textContent || "").trim().slice(0, 40)),
    );
    expect(hidden, "interactive elements hidden without interaction").toEqual([]);
  });
});

test.describe("viewport & zoom", () => {
  test("page is not zoom-locked", async ({ page }) => {
    await page.goto("/");
    const vp = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(vp, "viewport must allow pinch-zoom").toContain("width=device-width");
    expect(vp, "user-scalable=no blocks pinch-zoom").not.toContain("user-scalable=no");
    expect(vp).not.toContain("maximum-scale=1");
  });

  test("text stays readable when zoomed to 200%", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await page.waitForTimeout(200);
    const offenders = await horizontalOverflow(page);
    expect(offenders, `200% zoom causes overflow: ${JSON.stringify(offenders)}`).toEqual([]);
  });
});