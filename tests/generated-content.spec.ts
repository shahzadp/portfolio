import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

/**
 * Guards the SQLite -> TypeScript generator.
 *
 * The generator splits long prose across concatenated string literals for
 * readability. It once trimmed each chunk, which silently joined words
 * together ("challenges,especially") in every long string on the site. These
 * tests compare the *rendered page* against the text stored in SQLite, so any
 * future edit that mangles whitespace fails loudly.
 */

const DB_PATH = join(process.cwd(), "content", "portfolio.db");
const db = () => new DatabaseSync(DB_PATH, { readOnly: true });
type Row = Record<string, string>;
const one = (sql: string) => String((db().prepare(sql).get() as Row).value);
const many = (sql: string) => db().prepare(sql).all() as unknown as Row[];

/** Collapse whitespace so HTML wrapping / indentation never trips a comparison. */
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

test.describe("generated content matches the database", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hero bio renders with correct word spacing", async ({ page }) => {
    const expected = one("SELECT value FROM profile WHERE key='bio'");
    expect(expected).not.toMatch(/[a-z],[A-Za-z]/); // no "word,next" joins

    const bio = norm(await page.locator("#top p").last().innerText());
    expect(bio).toBe(norm(expected));
  });

  test("about paragraphs render with correct word spacing", async ({ page }) => {
    const paragraphs = many("SELECT body FROM about_paragraph ORDER BY sort");
    expect(paragraphs.length).toBeGreaterThan(0);

    for (const [i, row] of paragraphs.entries()) {
      expect(row.body, `paragraph ${i} has joined words`).not.toMatch(/[a-z],[A-Za-z]/);
      const rendered = norm(await page.locator("#about p").nth(i).innerText());
      expect(rendered, `about paragraph ${i} differs from the database`).toBe(norm(row.body));
    }
  });

  test("every project description and highlight renders verbatim", async ({ page }) => {
    const projects = db()
      .prepare("SELECT title, blurb, description FROM project WHERE visibility='public' ORDER BY sort")
      .all() as unknown as Array<Record<string, string>>;

    for (const p of projects) {
      for (const field of ["blurb", "description"] as const) {
        const value = p[field];
        if (!value) continue;
        expect(value, `${p.title}: ${field} has joined words`).not.toMatch(/[a-z],[A-Za-z]/);
      }
      const card = page.locator("#projects a", { hasText: p.title });
      await expect(card, `${p.title} not rendered`).toBeVisible();
      await expect(card, `${p.title} blurb differs`).toContainText(norm(p.blurb));
    }
  });

  test("no rendered text has words glued together", async ({ page }) => {
    const text = await page.locator("body").innerText();
    // A lowercase letter or comma directly followed by a capital, with no
    // space, is the signature of a dropped space at a chunk boundary.
    const glued = text.match(/\b[a-z]{3},[A-Z][a-z]{2,}\b/g) ?? [];
    expect(glued, `glued words found: ${glued.join(", ")}`).toEqual([]);
  });

  test("education and freelance copy render verbatim", async ({ page }) => {
    const freelanceBlurb = one("SELECT value FROM profile WHERE key='freelanceBlurb'");
    await expect(page.locator("#freelance")).toContainText(norm(freelanceBlurb));

    const services = many("SELECT label FROM freelance_service ORDER BY sort");
    for (const s of services) {
      await expect(page.locator("#freelance")).toContainText(s.label);
    }

    for (const e of many("SELECT qualification, institution FROM education ORDER BY sort")) {
      await expect(page.locator("#education")).toContainText(e.qualification);
      await expect(page.locator("#education")).toContainText(e.institution);
    }
  });
});