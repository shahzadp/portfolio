import { test, expect } from "./fixtures";
import { DatabaseSync } from "node:sqlite";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Playwright runs from the config root, so cwd is the project directory.
// (import.meta is not available in this transform.)
const ROOT = process.cwd();
const DB_PATH = join(ROOT, "content", "portfolio.db");
const GENERATED = join(ROOT, "content", "site.generated.ts");

/** node:sqlite returns plain records; narrow once, here. */
type Row = Record<string, string>;
const open = () => new DatabaseSync(DB_PATH, { readOnly: true });
const all = (sql: string, ...params: unknown[]) => open().prepare(sql).all(...(params as never[])) as Row[];

test.describe("SQLite is the source of truth", () => {
  test("the database file exists and is a real SQLite database", () => {
    expect(existsSync(DB_PATH), "content/portfolio.db is missing").toBe(true);
    expect(statSync(DB_PATH).size).toBeGreaterThan(1000);
    expect(readFileSync(DB_PATH).subarray(0, 16).toString(), "not a SQLite 3 file").toContain(
      "SQLite format 3",
    );
  });

  test("expected tables exist", () => {
    const tables = all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).map((r) => r.name);

    expect(tables).toEqual(
      expect.arrayContaining([
        "about_paragraph",
        "contact_link",
        "education",
        "freelance_service",
        "nav_link",
        "profile",
        "project",
        "stack_group",
        "stack_item",
      ]),
    );
  });

  test("content is queryable with real values", () => {
    const projects = all(
      "SELECT title, repo, repo_url FROM project WHERE visibility='public' ORDER BY sort",
    );
    expect(projects.map((p) => p.title)).toEqual([
      "DoL by Alex",
      "4 Games by Alex",
      "Photo Editor by Alex",
    ]);
    for (const p of projects) expect(p.repo_url).toMatch(/^https:\/\/github\.com\//);

    expect(Number(all("SELECT COUNT(*) AS n FROM education")[0].n)).toBe(2);
    expect(Number(all("SELECT COUNT(*) AS n FROM stack_group")[0].n)).toBe(3);
    expect(Number(all("SELECT COUNT(*) AS n FROM nav_link")[0].n)).toBe(4);

    const wa = all("SELECT value FROM profile WHERE key='whatsappNumber'")[0];
    expect(wa.value).toMatch(/^\d{10,15}$/);

    const resume = all("SELECT value FROM profile WHERE key='resumeUrl'")[0];
    expect(resume.value, "resumeUrl should point at the generated PDF").toBe("/resume.pdf");
  });

  test("join across stack_group and stack_item works", () => {
    const rows = all(
      `SELECT i.label AS item FROM stack_group g
       JOIN stack_item i ON i.group_id = g.id
       WHERE g.label = 'Frameworks' ORDER BY i.sort`,
    ).map((r) => r.item);

    expect(rows).toEqual(["Next.js", "Flutter", "Capacitor", "Playwright"]);
  });

  test("the generated module is derived from the database", () => {
    expect(existsSync(GENERATED), "content/site.generated.ts is missing").toBe(true);
    const ts = readFileSync(GENERATED, "utf8");
    expect(ts, "generated file must warn against hand edits").toContain("DO NOT EDIT");

    for (const t of all("SELECT title FROM project ORDER BY sort")) {
      expect(ts).toContain(t.title);
    }
  });

  test("the live site matches the database", async ({ page }) => {
    const titles = all("SELECT title FROM project WHERE visibility='public' ORDER BY sort").map(
      (r) => r.title,
    );
    const periods = all("SELECT period FROM education ORDER BY sort").map((r) => r.period);

    await page.goto("/");
    for (const t of titles) await expect(page.locator("#projects")).toContainText(t);
    for (const p of periods) await expect(page.locator("#education")).toContainText(p);
  });
});