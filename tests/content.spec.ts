import { test, expect } from "./fixtures";
import { WA_NUMBER } from "./helpers";

test.describe("projects", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("the invented private showcase is gone", async ({ page }) => {
    await expect(page.locator("#private"), "#private section still present").toHaveCount(0);
    for (const name of ["Ledgerline", "Swarmmap", "Fernpost", "Coldstore"]) {
      await expect(page.locator("body"), `${name} still appears on the page`).not.toContainText(name);
    }
  });

  test("no nav link points at the removed section", async ({ page }) => {
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll("header nav a")].map((a) => a.getAttribute("href")),
    );
    expect(hrefs).not.toContain("#private");
  });

  test("every card links to a real repo", async ({ page }) => {
    const cards = page.locator("#projects a:has(h3)");
    const count = await cards.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const href = await card.getAttribute("href");
      expect(href, "card has no href").toBeTruthy();
      expect(href).toMatch(/^https:\/\/(github\.com|wa\.me)\//);
      expect(await card.getAttribute("target")).toBe("_blank");
      expect(await card.getAttribute("rel")).toContain("noopener");
    }
  });

  test("cards that have no repo fall back to WhatsApp", async ({ page }) => {
    const fallback = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>("#projects a")]
        .filter((a) => !a.getAttribute("href")?.includes("github.com"))
        .map((a) => a.getAttribute("href") ?? ""),
    );
    for (const href of fallback) {
      expect(href).toMatch(new RegExp(`^https://wa\\.me/${WA_NUMBER}`));
    }
  });

  test("GitHub handle is shown and correct", async ({ page }) => {
    const link = page.locator("#projects a", { hasText: "github.com/shahzadp" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://github.com/shahzadp");
  });
});

test.describe("navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("every in-page anchor resolves to a real element", async ({ page }) => {
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute("href")!)
        .filter((h) => h.length > 1 && !document.querySelector(h))
        .map((h) => h),
    );
    expect(broken, `anchors with no target: ${broken.join(", ")}`).toEqual([]);
  });

  test("nav links scroll to their sections", async ({ page }) => {
    // On a phone the nav is a full-screen panel behind the Menu button, so it
    // has to be opened before its links can be clicked. Above the breakpoint
    // the links are inline and this is a no-op.
    const menu = page.locator("[data-menu-btn]");
    for (const [link, target] of [
      ["About", "#about"],
      ["Work", "#projects"],
      ["Education", "#education"],
      ["Contact", "#contact"],
    ] as const) {
      if (await menu.isVisible()) {
        await menu.click();
        await page.waitForTimeout(320);
      }
      await page.locator(`header nav a:has-text("${link}")`).click();

      // Smooth scrolling is async and can span a long distance; wait until the
      // scroll position settles rather than guessing with a fixed delay.
      await page.waitForFunction(
        () =>
          new Promise<boolean>((resolve) => {
            let last = window.scrollY;
            let stable = 0;
            const tick = () => {
              if (window.scrollY === last) {
                if (++stable >= 4) return resolve(true);
              } else {
                stable = 0;
                last = window.scrollY;
              }
              requestAnimationFrame(tick);
            };
            tick();
          }),
        null,
        { timeout: 5000 },
      );

      // The section must be in view. It can't be pinned to the top if the page
      // has hit its scroll limit (the contact footer is the last block).
      const box = (await page.locator(target).boundingBox())!;
      const vh = page.viewportSize()!.height;
      expect(box.y, `${target} is below the fold (y=${box.y})`).toBeLessThan(vh);
      expect(box.y + box.height, `${target} is above the fold`).toBeGreaterThan(0);
    }
  });

  test("the brand link returns to the top", async ({ page }) => {
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
    await page.locator("header a").first().click();
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(180);
  });

  test("external links are safely targeted", async ({ page }) => {
    const unsafe = await page.evaluate(() =>
      [...document.querySelectorAll('a[target="_blank"]')]
        .filter((a) => !(a.getAttribute("rel") || "").includes("noopener"))
        .map((a) => a.getAttribute("href")),
    );
    expect(unsafe, `target=_blank without rel=noopener: ${unsafe.join(", ")}`).toEqual([]);
  });
});