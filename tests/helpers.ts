import { expect, type Locator, type Page } from "@playwright/test";

/** The WhatsApp number, digits only — wa.me rejects +, spaces and dashes. */
export const WA_NUMBER = "923288304524";
export const WA_DISPLAY = "+92 328 8304524";

/** Fail on any console error or page error during the test. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Document-level horizontal overflow check. Returns the offending elements. */
export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= vw) return [];

    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const s = getComputedStyle(el);
        if (s.position === "fixed" && s.pointerEvents === "none") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > vw + 1 || r.left < -1);
      })
      .slice(0, 10)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 60),
          left: Math.round(r.left),
          right: Math.round(r.right),
        };
      });
  });
}

/** Smallest touch target found among the given elements. */
export async function smallestTapTarget(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const els = [...document.querySelectorAll<HTMLElement>(sel)];
    const sizes = els
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || "").trim().slice(0, 30) };
      })
      .filter((s) => s.w > 0 && s.h > 0);
    if (!sizes.length) return null;
    return sizes.reduce((a, b) => (a.w * a.h <= b.w * b.h ? a : b));
  }, selector);
}

/** True when the project is running a phone/tablet profile with touch. */
export function isTouchDevice(testInfo: { project: { name: string } }) {
  return /phone|tablet|mobile/i.test(testInfo.project.name);
}

export async function expectNoOverflow(page: Page) {
  const offenders = await horizontalOverflow(page);
  expect(offenders, `elements overflowing the viewport: ${JSON.stringify(offenders, null, 2)}`).toEqual([]);
}

export async function tapTarget(locator: Locator, name: string, min = 44) {
  const box = await locator.boundingBox();
  expect(box, `${name} has no layout box`).not.toBeNull();
  expect(box!.height, `${name} height ${box!.height} < ${min}`).toBeGreaterThanOrEqual(min);
}