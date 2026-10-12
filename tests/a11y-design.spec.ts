import { test, expect, ANALYTICS_HOSTS } from "./fixtures";

/** WCAG relative luminance + contrast ratio. */
function contrast(fg: string, bg: string): number {
  const lum = (c: string) => {
    const [r, g, b] = c.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const f = (v: number) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

test.describe("accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("landmarks and heading order are sane", async ({ page }) => {
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);
    await expect(page.locator('nav[aria-label]')).toHaveCount(1);

    const h1s = await page.locator("h1").count();
    expect(h1s, "expected exactly one h1").toBe(1);

    // No heading level skipped (h1 -> h3)
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1])),
    );
    for (let i = 1; i < levels.length; i++) {
      expect(
        levels[i] - levels[i - 1],
        `heading jump from h${levels[i - 1]} to h${levels[i]}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  test("all images have alt text", async ({ page }) => {
    const missing = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((i) => !i.hasAttribute("alt"))
        .map((i) => i.src),
    );
    expect(missing, "images without alt").toEqual([]);
  });

  test("interactive icons carry accessible names", async ({ page }) => {
    const unlabelled = await page.evaluate(() =>
      [...document.querySelectorAll('a[aria-label], button[aria-label]')].length,
    );
    // The WhatsApp badge is icon-only and must be labelled.
    expect(unlabelled).toBeGreaterThan(0);

    const badge = page.locator('#contact a[aria-label*="WhatsApp"]');
    await expect(badge).toHaveAttribute("aria-label", /WhatsApp/);
  });

  test("keyboard focus reaches every interactive element with a visible ring", async ({ page }) => {
    const ring = await page.evaluate(() => {
      const el = document.querySelector<HTMLAnchorElement>("header nav a")!;
      el.focus();
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: s.outlineWidth };
    });
    expect(ring.style).not.toBe("none");
    expect(parseFloat(ring.width)).toBeGreaterThan(0);
  });

  test("keyboard navigation reaches the WhatsApp badge", async ({ page }) => {
    await page.goto("/");
    await page.locator('#contact a[aria-label*="WhatsApp"]').focus();
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") ?? "",
    );
    expect(focused).toContain("WhatsApp");
  });

  test("body text meets WCAG AA contrast", async ({ page }) => {
    const samples = await page.evaluate(() => {
      const sels = ["h1", "#about p", "#projects h3", "#projects p", "header nav a", "#about"];
      return sels
        .map((s) => document.querySelector(s))
        .filter(Boolean)
        .map((el) => {
          let bgEl: HTMLElement | null = el as HTMLElement;
          let bg = getComputedStyle(bgEl).backgroundColor;
          while (bgEl && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) {
            bgEl = bgEl.parentElement;
            bg = bgEl ? getComputedStyle(bgEl).backgroundColor : "";
          }
          return {
            sel: (el as HTMLElement).className || el!.tagName,
            fg: getComputedStyle(el as HTMLElement).color,
            bg,
            size: parseFloat(getComputedStyle(el as HTMLElement).fontSize),
            weight: getComputedStyle(el as HTMLElement).fontWeight,
          };
        });
    });

    for (const s of samples) {
      if (!s.bg || s.bg === "rgba(0, 0, 0, 0)") continue;
      const ratio = contrast(s.fg, s.bg);
      const large = s.size >= 24 || (s.size >= 18.66 && Number(s.weight) >= 700);
      const min = large ? 3 : 4.5;
      expect(ratio, `${s.sel}: ${ratio}:1 (needs ${min}:1)`).toBeGreaterThanOrEqual(min);
    }
  });

  test("language is declared", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", /^[a-z]{2}/i);
  });

  test("page has exactly one h1 with the person's name", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Sikander Mughal");
  });
});

test.describe("design fidelity vs the mockup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("uses the mockup palette", async ({ page }) => {
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(239, 230, 210)"); // #EFE6D2 cream

    const footerBg = await page.evaluate(() => getComputedStyle(document.querySelector("footer")!).backgroundColor);
    expect(footerBg).toBe("rgb(43, 38, 32)"); // #2B2620 ink

    const cardBg = await page.evaluate(() => {
      const h3 = document.querySelector("#projects h3")!;
      return getComputedStyle(h3.parentElement!).backgroundColor;
    });
    expect(cardBg).toBe("rgb(248, 242, 227)"); // #F8F2E3 card
  });

  test("card and tag styling matches the mockup values", async ({ page }) => {
    const card = await page.evaluate(() => {
      const h3 = document.querySelector("#projects h3")!;
      const s = getComputedStyle(h3.parentElement!);
      return { padding: s.padding, border: s.borderTopColor, gap: s.gap };
    });
    expect(card.padding).toBe("28px");
    expect(card.border).toBe("rgb(205, 191, 159)"); // #CDBF9F
    expect(card.gap).toBe("14px");

    const tag = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector("#projects span[class]")!);
      return { size: s.fontSize, colour: s.color, padding: s.padding };
    });
    expect(tag.size).toBe("12px");
    expect(tag.colour).toBe("rgb(90, 79, 63)"); // #5A4F3F
    expect(tag.padding).toBe("3px 9px");
  });

  test("buttons meet the mockup metrics", async ({ page }) => {
    // The WhatsApp badge is the first link in the contact block and is a 46px
    // circle — the mockup button metrics apply to the Chat button.
    const btn = await page.evaluate(() => {
      const el = [...document.querySelectorAll("#contact a")].find((a) =>
        a.textContent?.includes("Chat on WhatsApp"),
      )!;
      const s = getComputedStyle(el);
      return { padding: s.padding, size: s.fontSize, weight: s.fontWeight, minHeight: s.minHeight };
    });
    expect(btn.padding).toBe("15px 28px");
    expect(btn.size).toBe("16px");
    expect(btn.weight).toBe("600");
    expect(parseFloat(btn.minHeight)).toBeGreaterThanOrEqual(44);
  });
});

test.describe("performance sanity", () => {
  test("page is not absurdly heavy", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const bytes = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .reduce((sum, r) => sum + ((r as PerformanceResourceTiming).transferSize || 0), 0),
    );
    // Static portfolio with self-hosted fonts — should stay well under 2 MB.
    expect(bytes, `transferred ${Math.round(bytes / 1024)} KB`).toBeLessThan(2_000_000);
  });

  test("only GoatCounter is loaded from a third party", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (["127.0.0.1", "localhost"].includes(u.hostname)) return;
      if (ANALYTICS_HOSTS.includes(u.hostname)) return;
      external.push(u.hostname + u.pathname);
    });
    await page.goto("/", { waitUntil: "networkidle" });
    expect(
      external,
      `unexpected third-party requests: ${external.join(", ")}`,
    ).toEqual([]);
  });
});