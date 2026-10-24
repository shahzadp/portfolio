import { test, expect, ANALYTICS_HOSTS } from "./fixtures";
import { trackErrors, expectNoOverflow } from "./helpers";

test.describe("page loads", () => {
  test("renders with correct title, meta and portrait", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");

    await expect(page).toHaveTitle("Sikander Mughal · Freelancer");

    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute("content", /full stack developer/i);

    // Portrait actually decoded (not a broken/empty <img>)
    const img = page.locator("#top img");
    await expect(img).toBeVisible();
    const natural = await img.evaluate((el: HTMLImageElement) => ({
      w: el.naturalWidth,
      h: el.naturalHeight,
      complete: el.complete,
    }));
    expect(natural.complete, "portrait failed to load").toBe(true);
    expect(natural.w, "portrait has no intrinsic width").toBeGreaterThan(100);

    await expect(img).toHaveAttribute("alt", /Sikander Mughal/);
    expect(errors).toEqual([]);
  });

  test("all five sections are present and non-empty", async ({ page }) => {
    await page.goto("/");
    for (const id of ["top", "about", "projects", "education", "freelance", "contact"]) {
      await expect(page.locator(`#${id}`), `#${id} missing`).toBeVisible();
    }

    await expect(page.locator("h1")).toContainText("Sikander Mughal");
    await expect(page.locator("#top")).toContainText("Lahore, Pakistan");
    await expect(page.locator("#top")).toContainText("Freelancer");
    await expect(page.locator("#about")).toContainText("obsessed with computers");
    await expect(page.locator("#contact")).toContainText("Let us work together");
  });

  test("site content matches data", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("building cutting-edge software");

    // Languages / Frameworks / Tools
    const about = page.locator("#about");
    for (const v of ["English", "Urdu", "Punjabi"]) await expect(about).toContainText(v);
    for (const v of ["Next.js", "Flutter", "Kotlin", "Rust", "Capacitor", "Playwright"])
      await expect(about).toContainText(v);
    for (const v of ["Git", "Node.js + pnpm", "Neovim", "PyTorch", "OpenCode"])
      await expect(about).toContainText(v);

    // Project counts
    await expect(page.locator("#projects h3")).toHaveCount(6);
  });

  test("education history is complete", async ({ page }) => {
    await page.goto("/");
    const edu = page.locator("#education");
    await expect(edu).toContainText("Intermediate (FA)");
    await expect(edu).toContainText("CDG Boys High School");
    await expect(edu).toContainText("Private student");
    await expect(edu).toContainText("2025");
    await expect(edu).toContainText("2021");
  });

  test("Fiverr link is correct", async ({ page }) => {
    await page.goto("/");
    const link = page.locator('#freelance a[href*="fiverr.com"]');
    await expect(link).toHaveAttribute("href", "https://www.fiverr.com/sikander49/");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(page.locator("#freelance")).toContainText("fiverr.com/sikander49");
  });

  test("Download CV button is live and serves a real PDF", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator("#top a", { hasText: "Download CV" });

    // Must be a real link, not the disabled placeholder span.
    await expect(btn).toHaveAttribute("href", "/resume.pdf");
    await expect(btn).toHaveAttribute("download", "");

    const res = await page.request.get("/resume.pdf");
    expect(res.status(), "resume.pdf is missing from the build").toBe(200);
    expect(res.headers()["content-type"]).toContain("pdf");

    const body = await res.body();
    expect(body.subarray(0, 5).toString(), "not a PDF").toBe("%PDF-");
    expect(body.byteLength).toBeGreaterThan(5000);
  });

  test("the three mockup fonts actually apply", async ({ page }) => {
    await page.goto("/");
    const family = (sel: string) =>
      page.locator(sel).first().evaluate((el) => getComputedStyle(el).fontFamily.split(",")[0].replace(/"/g, ""));

    expect(await family("h1")).toBe("Cormorant Garamond");
    expect(await family("body")).toBe("Source Sans 3");
    expect(await family("#top div div")).toBe("IBM Plex Mono");
  });

  test("no horizontal overflow at any viewport", async ({ page }) => {
    await page.goto("/");
    await expectNoOverflow(page);
  });

  test("no broken images or failed requests", async ({ page }) => {
    const failed: string[] = [];
    const failedRequests: string[] = [];

    page.on("response", (r) => {
      // Analytics is stubbed out by the fixture, so a failure there is ours.
      if (ANALYTICS_HOSTS.some((h) => r.url().includes(h))) return;
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
    });
    page.on("requestfailed", (r) => {
      if (ANALYTICS_HOSTS.some((h) => r.url().includes(h))) return;
      failedRequests.push(`${r.url()} (${r.failure()?.errorText})`);
    });

    await page.goto("/", { waitUntil: "networkidle" });

    expect(failed, `failed responses:\n${failed.join("\n")}`).toEqual([]);
    expect(failedRequests, `failed requests:\n${failedRequests.join("\n")}`).toEqual([]);

    const broken = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((i) => !(i as HTMLImageElement).complete || (i as HTMLImageElement).naturalWidth === 0)
        .map((i) => (i as HTMLImageElement).currentSrc || i.src),
    );
    expect(broken, "broken images").toEqual([]);
  });

  test("no em dashes in user-visible copy", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Text a visitor actually reads.
    const visible = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const hits: string[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = (n.textContent || "").trim();
        if (t && /[\u2014\u2013]/.test(t)) hits.push(t.slice(0, 80));
      }
      return hits;
    });
    expect(visible, `em/en dashes in visible text: ${visible.join(" | ")}`).toEqual([]);

    // And the document title / meta descriptions.
    const meta = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
      og: document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "",
    }));
    for (const [key, value] of Object.entries(meta)) {
      expect(value, `${key} contains a dash: ${value}`).not.toMatch(/[\u2014\u2013]/);
    }
  });
});