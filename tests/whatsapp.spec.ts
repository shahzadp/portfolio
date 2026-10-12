import { test, expect } from "./fixtures";
import { WA_NUMBER, WA_DISPLAY } from "./helpers";

test.describe("WhatsApp contact", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("there is no message form — contact goes to WhatsApp", async ({ page }) => {
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.locator('input, textarea, select[name="message"]')).toHaveCount(0);
  });

  test("every wa.me link uses the correct number", async ({ page }) => {
    const waLinks = await page.evaluate(() =>
      [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute("href")!),
    );

    expect(waLinks.length, "no WhatsApp links found").toBeGreaterThan(0);
    for (const href of waLinks) {
      expect(href, `bad WhatsApp link: ${href}`).toMatch(
        new RegExp(`^https://wa\\.me/${WA_NUMBER}(\\?|$)`),
      );
    }
  });

  test("the number is never malformed", async ({ page }) => {
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"]')].map(
        (a) => a.getAttribute("href")!,
      ),
    );
    for (const href of hrefs) {
      // Only the path segment carries the number; the ?text= part is encoded
      // separately and legitimately contains %20.
      const path = href.split("?")[0];
      expect(path).not.toMatch(/\+/); // wa.me rejects '+'
      expect(path).toMatch(/^https:\/\/wa\.me\/\d{10,15}$/);
    }
  });

  test("phone number is displayed in human-readable form", async ({ page }) => {
    await expect(page.locator("#contact")).toContainText(WA_DISPLAY);
  });

  test("green WhatsApp icon sits at the top of the contact block", async ({ page }) => {
    const badge = page.locator('#contact a[aria-label*="WhatsApp"]');
    await expect(badge).toBeVisible();

    const colour = await badge.evaluate((el) => getComputedStyle(el).backgroundColor);
    // WhatsApp brand green #25D366
    expect(colour).toBe("rgb(37, 211, 102)");

    const radius = await badge.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(radius).toContain("50%");

    // First focusable element inside the contact section, i.e. "on top".
    const isFirst = await badge.evaluate(
      (el) => el === document.querySelector("#contact a"),
    );
    expect(isFirst, "WhatsApp icon should be the first element in the contact block").toBe(true);

    await expect(badge.locator("svg")).toBeVisible();
  });

  test("the Chat on WhatsApp button is present and styled", async ({ page }) => {
    const btn = page.locator("#contact a", { hasText: "Chat on WhatsApp" });
    await expect(btn).toBeVisible();
    await expect(btn.locator("svg")).toBeVisible();
    expect(await btn.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(37, 211, 102)");
  });

  test("WhatsApp links open in a new tab safely", async ({ page }) => {
    const waLinks = page.locator('a[href*="wa.me"]');
    const n = await waLinks.count();
    for (let i = 0; i < n; i++) {
      const a = waLinks.nth(i);
      expect(await a.getAttribute("target")).toBe("_blank");
      const rel = await a.getAttribute("rel");
      expect(rel).toContain("noopener");
    }
  });

  test("prefilled messages are URL-encoded and non-empty", async ({ page }) => {
    const texts = await page.evaluate(() =>
      [...document.querySelectorAll('a[href*="wa.me"]')]
        .map((a) => {
          const u = new URL(a.getAttribute("href")!);
          return u.searchParams.get("text") ?? "";
        })
        .filter(Boolean),
    );
    expect(texts.length, "no prefilled messages found").toBeGreaterThan(0);
    for (const t of texts) {
      expect(t.trim().length, "empty prefilled message").toBeGreaterThan(0);
      expect(t).toMatch(/Sikander/i);
    }
  });
});

test.describe("other contact links", () => {
  test("email and GitHub are present and correct", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href^="mailto:"]')).toHaveAttribute(
      "href",
      "mailto:sikandershahzad53@gmail.com",
    );
    await expect(page.locator('a[href*="github.com/shahzadp"]').first()).toBeVisible();
  });
});