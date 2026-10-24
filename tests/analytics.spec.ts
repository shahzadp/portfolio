import { test, expect, ANALYTICS_HOSTS, ANALYTICS_PATTERN } from "./fixtures";

/**
 * The analytics script itself is blocked by the shared fixture, so these
 * tests assert on the markup and on what the browser actually attempted.
 */

test.describe("GoatCounter analytics", () => {
  test("the tracking script is present and configured", async ({ page }) => {
    await page.goto("/");

    const script = page.locator('script[data-goatcounter]');
    await expect(script).toHaveCount(1);

    await expect(script).toHaveAttribute(
      "data-goatcounter",
      "https://sikander.goatcounter.com/count",
    );
    await expect(script).toHaveAttribute("src", "https://gc.zgo.at/count.js");
  });

  test("the script is deferred, never render blocking", async ({ page }) => {
    await page.goto("/");

    const script = page.locator('script[data-goatcounter]');
    // next/script with afterInteractive emits a non-blocking tag: no `async`
    // attribute and it is appended to the body rather than sitting in <head>.
    await expect(script).toHaveCount(1);
    const async = await script.getAttribute("async");
    expect(async, "tracker must not be async/render blocking").toBeNull();

    const inHead = await page.evaluate(
      () => !!document.querySelector("head script[data-goatcounter]"),
    );
    expect(inHead, "tracker must not sit in <head>").toBe(false);
  });

  test("content renders even if the tracker fails to load", async ({ page }) => {
    // The fixture aborts the request, which is exactly the failure case.
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("Sikander Mughal");
    await expect(page.locator("#projects h3")).toHaveCount(6);
    await expect(page.locator("#contact")).toContainText("Let us work together");
  });

  test("analytics only ever contacts the expected hosts", async ({ page }) => {
    const hosts = new Set<string>();
    page.on("request", (r) => {
      const host = new URL(r.url()).hostname;
      if (!["127.0.0.1", "localhost"].includes(host)) hosts.add(host);
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // The only outside host the site may talk to is GoatCounter.
    const unexpected = [...hosts].filter((h) => !ANALYTICS_HOSTS.includes(h));
    expect(unexpected, `unexpected external hosts: ${unexpected.join(", ")}`).toEqual([]);

    // And the tracker was actually requested, so it is not silently dead.
    expect(
      [...hosts].some((h) => ANALYTICS_HOSTS.includes(h)),
      "the analytics script was never requested",
    ).toBe(true);
  });

  test("a hard failure of the tracker does not break the page", async ({ page }) => {
    // Override the fixture for this one test: kill the request outright.
    await page.route(ANALYTICS_PATTERN, (route) => route.abort());

    await page.goto("/");

    await expect(page.locator("h1")).toContainText("Sikander Mughal");
    await expect(page.locator("#projects h3")).toHaveCount(6);
    await expect(page.locator("#education")).toContainText("CDG Boys High School");
    await expect(page.locator("#contact")).toContainText("Let us work together");
    await expect(page.locator("#contact a[href*='resume.pdf']")).toHaveCount(0); // CV is in the hero
    await expect(page.locator("#top a[href*='resume.pdf']")).toHaveCount(1);
  });
});