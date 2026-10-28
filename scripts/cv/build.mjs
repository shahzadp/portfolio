/**
 * Builds public/resume.pdf from content/portfolio.db.
 *
 *   npm run cv
 *
 * Everything on the CV comes out of SQLite, so it can never drift from the
 * site. Renders an A4 HTML document and prints it with Chromium.
 *
 * Also writes public/resume.hash, a fingerprint of the data rendered here.
 * tests/cv.spec.ts recomputes it and fails if the database has moved on
 * without the CV being rebuilt.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { buildCvHtml } from "./template.mjs";
import { loadCvData, hashCvData } from "./data.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB_PATH = join(ROOT, "content", "portfolio.db");
const PDF_PATH = join(ROOT, "public", "resume.pdf");
const HASH_PATH = join(ROOT, "public", "resume.hash");

if (!existsSync(DB_PATH)) {
  console.error("content/portfolio.db is missing. Run: npm run db:seed");
  process.exit(1);
}

const { profile, stackGroups, projects, education } = loadCvData(DB_PATH);

mkdirSync(dirname(PDF_PATH), { recursive: true });

// Embed the portrait as a base64 data URL so the PDF is self-contained —
// Chromium's page.pdf() does not serve local files, so a plain path
// reference would come back blank.
const portraitRel = profile.portrait;
const portraitPath = portraitRel ? join(ROOT, "public", portraitRel.replace(/^\/+/, "")) : "";
const portraitDataUrl =
  portraitPath && existsSync(portraitPath)
    ? `data:image/jpeg;base64,${readFileSync(portraitPath).toString("base64")}`
    : "";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(
  buildCvHtml({ profile, stackGroups, projects, education, portraitDataUrl }),
  { waitUntil: "load" },
);
await page.pdf({
  path: PDF_PATH,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", right: "14mm", bottom: "12mm", left: "14mm" },
});
await browser.close();

const { size } = statSync(PDF_PATH);
console.log(`wrote public/resume.pdf  (${(size / 1024).toFixed(0)} KB)`);

const hash = hashCvData({ profile, stackGroups, projects, education });
writeFileSync(HASH_PATH, hash + "\n", "utf8");

if (profile.resumeUrl !== "/resume.pdf") {
  console.warn(
    `\n  WARNING: profile.resumeUrl is "${profile.resumeUrl}" but the CV was just\n` +
      `  written to /resume.pdf. Set resumeUrl: "/resume.pdf" in content/site.ts\n` +
      `  and run: npm run db:reset\n`,
  );
} else {
  console.log("site will serve this at /resume.pdf");
}