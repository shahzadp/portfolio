/**
 * Renders the CV HTML to a PNG so it can be eyeballed without opening a PDF
 * viewer. Headless Chromium downloads PDFs rather than rendering them, so
 * this screenshots the same template the PDF is printed from.
 *
 *   node scripts/cv/preview.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { buildCvHtml } from "./template.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, ".cv-preview");

const db = new DatabaseSync(join(ROOT, "content", "portfolio.db"), { readOnly: true });
const profile = Object.fromEntries(
  db.prepare("SELECT key, value FROM profile").all().map((r) => [r.key, r.value]),
);

// Embed the portrait as a base64 data URL so it renders in the preview too.
const portraitRel = profile.portrait;
const portraitPath = portraitRel ? join(ROOT, "public", portraitRel.replace(/^\//, "")) : "";
const portraitDataUrl =
  portraitPath && existsSync(portraitPath)
    ? `data:image/jpeg;base64,${readFileSync(portraitPath).toString("base64")}`
    : "";
const stackGroups = db
  .prepare("SELECT id, label FROM stack_group ORDER BY sort")
  .all()
  .map((g) => ({
    label: g.label,
    items: db.prepare("SELECT label FROM stack_item WHERE group_id=? ORDER BY sort").all(g.id).map((i) => i.label),
  }));
const projects = db
  .prepare("SELECT title, blurb, stack, highlights, status FROM project WHERE visibility='public' ORDER BY sort")
  .all()
  .map((p) => ({ ...p, stack: JSON.parse(p.stack), highlights: p.highlights ? JSON.parse(p.highlights) : [] }));
const education = db
  .prepare("SELECT qualification, institution, location, period FROM education ORDER BY sort")
  .all();
db.close();

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
// A4 at 96dpi is roughly 794 x 1123 CSS px.
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.setContent(
  buildCvHtml({ profile, stackGroups, projects, education, portraitDataUrl }),
  { waitUntil: "load" },
);
await page.screenshot({ path: join(OUT, "cv.png"), fullPage: true });

const height = await page.evaluate(() => document.body.scrollHeight);
await browser.close();

console.log(`.cv-preview/cv.png written  (content height ${height}px, about ${Math.ceil(height / 1123)} A4 pages)`);