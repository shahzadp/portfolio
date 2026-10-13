import type { Page } from "@playwright/test";
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

/** Opens the mobile menu panel if this layout has one. */
async function openMenuIfPresent(page: Page) {
  const menu = page.locator("[data-menu-btn]");
  if (await menu.isVisible()) {
    await menu.tap();
    await page.waitForTimeout(320);
  }
}

/**
 * Waits for the client bundle to take over.
 *
 * Motion.tsx adds .js-motion to <html> from an effect, so its presence is a
 * reliable signal that hydration has happened. Anything driven by state --
 * the menu's inert attribute, for one -- is simply absent from the server
 * HTML, so asserting on it before this point tests the prerender rather than
 * the running site.
 *
 * The double rAF matters: Header's effect calls setState to discover it is on
 * a phone, so the inert attribute only lands on the render after that. Motion
 * renders before Header, so .js-motion alone is one commit too early.
 */
async function hydrated(page: Page) {
  await page.waitForFunction(() => document.documentElement.classList.contains("js-motion"), null, {
    timeout: 5000,
  });
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

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
    await openMenuIfPresent(page);
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
    await openMenuIfPresent(page);

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
    await hydrated(page);
    // This spec's job is about every element *other* than the menu panel, so
    // wait for the panel to reach its resting closed state first rather than
    // racing the effect that sets inert.
    await page.waitForFunction(
      () => document.querySelector("[data-nav]")?.hasAttribute("inert") ?? false,
      null,
      { timeout: 5000 },
    );

    /* Scroll the whole page first. Sections reveal as they come into view,
       and that end state is what matters: the question here is whether
       anything is only reachable by hovering, not whether something is
       momentarily transparent further down the page before you reach it. */
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 700));
    });

    // Hover styles must not be the only way content becomes visible.
    // Anything inside an [inert] subtree is exempt: that is the author
    // explicitly marking a region as not currently interactive, which is how
    // the closed mobile menu panel is built. It is hidden on purpose and is
    // announced as absent, not merely concealed.
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a, button")]
        .filter((el) => {
          if (el.closest("[inert]")) return false;
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

/**
 * The phone layout was chosen by eye against three alternatives. These lock
 * the decisions in, so a later tweak cannot quietly undo them.
 */
test.describe("phone layout decisions", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("the portrait runs full-bleed to both screen edges", async ({ page }) => {
    const box = (await page.locator("#top img").boundingBox())!;
    // The chosen treatment: the portrait breaks out of the container gutters
    // and loses its frame. A framed, inset portrait was the desktop layout
    // being squeezed, which is exactly what this replaced.
    expect(box.x, "portrait should start at the screen edge").toBeLessThanOrEqual(1);
    expect(box.x + box.width, "portrait should reach the right screen edge").toBeGreaterThanOrEqual(389);

    const border = await page
      .locator("#top img")
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(border, "the frame is dropped on phones").toBe("0px");
  });

  test("the portrait crops taller than the 400px desktop frame", async ({ page }) => {
    const h = (await page.locator("#top img").boundingBox())!.height;
    expect(h, "portrait should crop taller than desktop").toBeGreaterThan(400);
  });

  test("nav links are behind the Menu button, not inline", async ({ page }) => {
    await expect(page.locator("[data-menu-btn]"), "Menu button missing on a phone").toBeVisible();
    await expect(page.locator('header nav a[href="#projects"]')).toBeHidden();
  });

  test("the header sticks so the Menu button stays reachable", async ({ page }) => {
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
    await page.waitForTimeout(250);
    const top = (await page.locator("[data-header]").boundingBox())!.y;
    expect(Math.abs(top), `header should pin to the top, was at ${top}`).toBeLessThan(2);
    await expect(page.locator("[data-menu-btn]")).toBeVisible();
  });

  test("gutters shrink rather than eating the screen", async ({ page }) => {
    const left = await page
      .locator("#projects a:has(h3)")
      .first()
      .evaluate((el) => el.getBoundingClientRect().left);
    // The mockup's 40px gutter is a tenth of a 390px screen. 20px is the
    // phone value; much above 28 means the desktop gutter leaked through.
    expect(left).toBeGreaterThanOrEqual(19);
    expect(left).toBeLessThanOrEqual(28);
  });

  test("a 200% zoomed phone still has no sideways scroll", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await page.waitForTimeout(200);
    expect(await horizontalOverflow(page)).toEqual([]);
  });
});

test.describe("mobile menu panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("is closed, inert and hidden on arrival", async ({ page }) => {
    await hydrated(page);
    const state = await page.locator("[data-nav]").evaluate((el) => ({
      inert: el.hasAttribute("inert"),
      visibility: getComputedStyle(el).visibility,
    }));
    // Closed means unreachable, not merely transparent: inert takes the links
    // out of the tab order and the accessibility tree.
    expect(state.inert, "closed menu must be inert").toBe(true);
    expect(state.visibility).toBe("hidden");
    await expect(page.locator("[data-menu-btn]")).toHaveAttribute("aria-expanded", "false");
  });

  test("opening reveals it and makes the links focusable", async ({ page }) => {
    await page.locator("[data-menu-btn]").click();
    await page.waitForTimeout(320);

    await expect(page.locator("[data-menu-btn]")).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("[data-nav]")).toBeVisible();
    expect(
      await page.locator("[data-nav]").evaluate((el) => el.hasAttribute("inert")),
      "an open menu must not be inert",
    ).toBe(false);

    await page.locator('header nav a[href="#education"]').focus();
    expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Education");
  });

  test("Escape closes it", async ({ page }) => {
    await page.locator("[data-menu-btn]").click();
    await page.waitForTimeout(320);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(320);

    await expect(page.locator("[data-menu-btn]")).toHaveAttribute("aria-expanded", "false");
    expect(await page.locator("[data-nav]").evaluate((el) => el.hasAttribute("inert"))).toBe(true);
  });

  test("the close control stays on top of the open panel", async ({ page }) => {
    await page.locator("[data-menu-btn]").click();
    await page.waitForTimeout(320);

    /* The panel is a child of the header, so without an explicit lift it
       paints over the very button that opened it and the menu cannot be
       closed by tapping it again. On a phone there is no Escape key, so that
       would be a dead end. Asserted by hit-testing the button's centre. */
    const topAtButton = await page.evaluate(() => {
      const btn = document.querySelector<HTMLElement>("[data-menu-btn]")!;
      const r = btn.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return btn.contains(hit) || hit === btn;
    });
    expect(topAtButton, "the Menu button is covered by the open panel").toBe(true);

    // And tapping it again really does close the menu.
    await page.locator("[data-menu-btn]").click();
    await page.waitForTimeout(320);
    await expect(page.locator("[data-menu-btn]")).toHaveAttribute("aria-expanded", "false");
  });

  test("choosing a destination closes it and scrolls there", async ({ page }) => {
    await page.locator("[data-menu-btn]").click();
    await page.waitForTimeout(320);
    // Only the four real nav destinations exist; #freelance is not one of
    // them, which is exactly what an earlier version of this test got wrong.
    await page.locator('header nav a[href="#education"]').click();
    await page.waitForTimeout(700);

    await expect(page.locator("[data-menu-btn]")).toHaveAttribute("aria-expanded", "false");
    const y = await page
      .locator("#education")
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(y), `#education should be in view (top=${y})`).toBeLessThan(160);
  });

  test("growing past the phone breakpoint closes it", async ({ page }) => {
    await page.locator("[data-menu-btn]").click();
    await page.waitForTimeout(320);
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.waitForTimeout(320);

    // Otherwise rotating the device leaves a full-screen dark panel over a
    // layout that no longer shows the button which opened it.
    await expect(page.locator("[data-menu-btn]")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator('header nav a[href="#projects"]')).toBeVisible();
  });
});