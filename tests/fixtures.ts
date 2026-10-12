import { test as base, expect } from "@playwright/test";

/**
 * Shared test fixture.
 *
 * Analytics is stubbed on every test page. The suite runs ~380 times across
 * five device profiles, and without this each run would send a real pageview
 * to GoatCounter, polluting the stats and adding a network round trip to
 * every test.
 *
 * The request is *fulfilled with an empty script* rather than aborted, so the
 * page sees a normal successful load. Aborting produces a console error,
 * which several specs assert is absent. One test deliberately hard-fails the
 * request to prove the page survives a broken tracker.
 */
export const ANALYTICS_HOSTS = ["gc.zgo.at", "sikander.goatcounter.com"];

export const ANALYTICS_PATTERN = new RegExp(
  ANALYTICS_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|"),
);

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(ANALYTICS_PATTERN, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "/* analytics disabled in tests */",
      }),
    );
    await use(page);
  },
});

export { expect };