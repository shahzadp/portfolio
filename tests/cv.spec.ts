import { test, expect } from "./fixtures";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadCvData, hashCvData } from "../scripts/cv/data";

/**
 * The CV is a committed binary artefact generated from SQLite, so it can
 * silently drift from the content it claims to describe. `npm run cv` records
 * a hash of the data it rendered; this spec recomputes that hash using the
 * same loader and fails if the database has moved on.
 */

const ROOT = process.cwd();
const PDF = join(ROOT, "public", "resume.pdf");
const HASH = join(ROOT, "public", "resume.hash");
const DB = join(ROOT, "content", "portfolio.db");

test.describe("generated CV", () => {
  test("the PDF and its hash both exist", () => {
    expect(existsSync(PDF), "public/resume.pdf is missing").toBe(true);
    expect(existsSync(HASH), "public/resume.hash is missing").toBe(true);
    expect(statSync(PDF).size).toBeGreaterThan(5000);
    expect(readFileSync(PDF).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("the CV is not stale — it matches the current database", () => {
    const data = loadCvData(DB);
    const expected = hashCvData(data);
    const actual = readFileSync(HASH, "utf8").trim();

    expect(actual, "public/resume.pdf is out of date with the database — run: npm run cv").toBe(
      expected,
    );
  });

  test("the CV is built from every visible project", () => {
    const { projects } = loadCvData(DB);
    expect(projects.length).toBeGreaterThan(0);
    for (const p of projects) {
      expect(p.title, "project with no title").toBeTruthy();
      expect(p.blurb, `${p.title} has no blurb`).toBeTruthy();
      expect(p.stack.length, `${p.title} has no stack tags`).toBeGreaterThan(0);
    }
  });

  test("the CV carries the contact details people need", () => {
    const { profile } = loadCvData(DB);
    expect(profile.name).toBeTruthy();
    expect(profile.email).toMatch(/@/);
    expect(profile.whatsappNumber).toMatch(/^\d{10,15}$/);
    expect(profile.github).toMatch(/^https:\/\//);
  });
});