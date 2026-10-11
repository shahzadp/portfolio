/**
 * Builds public/resume.pdf from content/portfolio.db.
 *
 *   npm run cv
 *
 * Everything on the CV comes out of SQLite, so it can never drift from the
 * site. Renders an A4 HTML document and prints it with Chromium.
 *
 * After building, it records the path in the database and regenerates the
 * site content so the Download CV button switches itself on.
 */
import { DatabaseSync } from "node:sqlite";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB_PATH = join(ROOT, "content", "portfolio.db");
const PDF_PATH = join(ROOT, "public", "resume.pdf");

if (!existsSync(DB_PATH)) {
  console.error("content/portfolio.db is missing. Run: npm run db:seed");
  process.exit(1);
}

/* ------------------------------------------------------------------ read */
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const profile = Object.fromEntries(
  db.prepare("SELECT key, value FROM profile").all().map((r) => [r.key, r.value]),
);
const stackGroups = db
  .prepare("SELECT id, label FROM stack_group ORDER BY sort")
  .all()
  .map((g) => ({
    label: g.label,
    items: db.prepare("SELECT label FROM stack_item WHERE group_id=? ORDER BY sort").all(g.id).map((i) => i.label),
  }));
const projects = db
  .prepare("SELECT title, blurb, description, problem, stack, highlights, repo_url, status FROM project WHERE visibility='public' ORDER BY sort")
  .all()
  .map((p) => ({
    ...p,
    stack: JSON.parse(p.stack),
    highlights: p.highlights ? JSON.parse(p.highlights) : [],
  }));
const education = db
  .prepare("SELECT qualification, institution, location, period FROM education ORDER BY sort")
  .all();
db.close();

/* --------------------------------------------------------------- helpers */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const contact = [
  ["Email", profile.email],
  ["Phone", profile.whatsappDisplay],
  ["GitHub", profile.github.replace("https://", "")],
  ["Fiverr", profile.fiverrUrl.replace("https://www.", "")],
  ["Location", profile.location],
]
  .filter(([, v]) => v)
  .map(([k, v]) => `<span class="c"><b>${esc(k)}</b> ${esc(v)}</span>`)
  .join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(profile.name)} — CV</title>
<style>
  @page { size: A4; margin: 14mm 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
    font-size: 10.2pt;
    line-height: 1.42;
    color: #2b2620;
  }
  header { border-bottom: 2px solid #a9441f; padding-bottom: 8px; margin-bottom: 12px; }
  h1 {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 30pt; line-height: 1; margin: 0 0 2px; letter-spacing: -0.01em;
  }
  .role {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 8.6pt; letter-spacing: 0.14em; text-transform: uppercase; color: #a9441f;
  }
  .contact { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 7px; font-size: 8.8pt; color: #4a4033; }
  .contact b { font-weight: 600; color: #2b2620; }
  h2 {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 13pt; margin: 15px 0 7px; padding-bottom: 3px;
    border-bottom: 1px solid #cdbf9f; letter-spacing: 0.01em;
  }
  h3 { font-size: 10.6pt; margin: 0 0 2px; }
  .entry { margin-bottom: 11px; break-inside: avoid; }
  .entry:last-child { margin-bottom: 0; }
  .meta { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  .when { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 8.4pt; color: #a9441f; white-space: nowrap; }
  .org { font-size: 9.2pt; color: #4a4033; margin-bottom: 3px; }
  p { margin: 0 0 4px; }
  ul { margin: 3px 0 0; padding-left: 15px; }
  li { margin-bottom: 2px; }
  .tags { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px; }
  .tag {
    font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 7.6pt;
    border: 1px solid #cdbf9f; padding: 1px 5px; color: #5a4f3f;
  }
  .stack-row { display: flex; gap: 8px; margin-bottom: 5px; align-items: baseline; }
  .stack-label {
    font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 8pt;
    letter-spacing: 0.1em; text-transform: uppercase; color: #a9441f;
    min-width: 82px; flex: none;
  }
  .summary { color: #4a4033; margin-bottom: 2px; }
  footer { margin-top: 14px; padding-top: 6px; border-top: 1px solid #cdbf9f; font-size: 8pt; color: #7b6f61; }
</style></head>
<body>
  <header>
    <h1>${esc(profile.name)}</h1>
    <div class="role">${esc(profile.role)} · Full Stack Developer</div>
    <div class="contact">${contact}</div>
  </header>

  <h2>Profile</h2>
  <p class="summary">${esc(profile.bio)}</p>

  <h2>Skills</h2>
  ${stackGroups
    .map(
      (g) =>
        `<div class="stack-row"><span class="stack-label">${esc(g.label)}</span><span>${g.items.map(esc).join(", ")}</span></div>`,
    )
    .join("")}

  <h2>Projects</h2>
  ${projects
    .map(
      (p) => `<div class="entry">
      <div class="meta"><h3>${esc(p.title)}</h3>${p.status === "building" ? '<span class="when">In progress</span>' : ""}</div>
      <p>${esc(p.blurb)}</p>
      ${p.highlights.length ? `<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
      <div class="tags">${p.stack.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>
    </div>`,
    )
    .join("")}

  <h2>Education</h2>
  ${education
    .map(
      (e) => `<div class="entry">
      <div class="meta"><h3>${esc(e.qualification)}</h3><span class="when">${esc(e.period)}</span></div>
      <div class="org">${esc(e.institution)} · ${esc(e.location)}</div>
    </div>`,
    )
    .join("")}

  <footer>
    Generated from ${esc(profile.name)}'s portfolio. Full project write-ups and private repository access on request.
  </footer>
</body></html>`;

/* ---------------------------------------------------------------- render */
mkdirSync(dirname(PDF_PATH), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: PDF_PATH,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", right: "14mm", bottom: "12mm", left: "14mm" },
});
await browser.close();

const { statSync } = await import("node:fs");
const { size } = statSync(PDF_PATH);
console.log(`wrote public/resume.pdf  (${(size / 1024).toFixed(0)} KB)`);

/* Sanity check: the site only shows a working Download CV button when
   profile.resumeUrl points at a file that actually exists. */
if (profile.resumeUrl !== "/resume.pdf") {
  console.warn(
    `\n  WARNING: profile.resumeUrl is "${profile.resumeUrl}" but the CV was just\n` +
      `  written to /resume.pdf. Set resumeUrl: "/resume.pdf" in content/site.ts\n` +
      `  and run: npm run db:reset\n`,
  );
} else {
  console.log("site will serve this at /resume.pdf");
}