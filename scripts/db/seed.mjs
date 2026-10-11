/**
 * Seeds content/portfolio.db from content/site.ts.
 *
 *   node scripts/db/seed.mjs
 *
 * The SQLite file is the source of truth the site actually builds from; this
 * script is the importer that fills it from the typed content module.
 * Re-run it after editing content/site.ts.
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB_PATH = join(ROOT, "content", "portfolio.db");
const SCHEMA = join(ROOT, "db", "schema.sql");

// content/site.ts is TypeScript; Node 24 strips the types natively.
// pathToFileURL matters on Windows, where a bare drive path is not a valid
// ESM specifier.
const src = await import(pathToFileURL(join(ROOT, "content", "site.ts")).href);

if (!existsSync(DB_PATH)) mkdirSync(dirname(DB_PATH), { recursive: true });

// Rebuild from scratch so the DB never drifts from the content module.
if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(readFileSync(SCHEMA, "utf8"));

/* ---------------------------------------------------------------- profile */
const profile = {
  name: src.site.name,
  role: src.site.role,
  bio: src.site.bio,
  email: src.site.email,
  location: src.site.location,
  timezone: src.site.timezone,
  portrait: src.site.portrait,
  url: src.site.url,
  github: src.site.github,
  githubHandle: src.site.githubHandle,
  whatsappNumber: src.site.whatsappNumber,
  whatsappDisplay: src.site.whatsappDisplay,
  resumeUrl: src.site.resumeUrl ?? "",
  aboutHeading: src.about.heading,
  contactHeading: src.contact.heading,
  contactBlurb: src.contact.blurb,
  freelanceBlurb: src.freelance.blurb,
  fiverrUrl: src.freelance.fiverrUrl,
  fiverrHandle: src.freelance.fiverrHandle,
};

const insProfile = db.prepare("INSERT INTO profile(key, value) VALUES (?, ?)");
db.exec("DELETE FROM profile;");
for (const [k, v] of Object.entries(profile)) {
  insProfile.run(k, v == null ? "" : String(v));
}

/* ------------------------------------------------------------------ about */
db.exec("DELETE FROM about_paragraph;");
const insAbout = db.prepare("INSERT INTO about_paragraph(sort, body) VALUES (?, ?)");
src.about.paragraphs.forEach((p, i) => insAbout.run(i, p));

/* ----------------------------------------------------------------- stack */
db.exec("DELETE FROM stack_item; DELETE FROM stack_group;");
const insGroup = db.prepare("INSERT INTO stack_group(label, sort) VALUES (?, ?)");
const insItem = db.prepare("INSERT INTO stack_item(group_id, label, sort) VALUES (?, ?, ?)");
src.stackGroups.forEach((g, gi) => {
  insGroup.run(g.label, gi);
  const gid = db.prepare("SELECT last_insert_rowid() AS id").get().id;
  g.items.forEach((item, ii) => insItem.run(Number(gid), item, ii));
});

/* -------------------------------------------------------------- projects */
db.exec("DELETE FROM project;");
const insProject = db.prepare(`
  INSERT INTO project
    (id, title, repo, blurb, description, problem, stack, image, status,
     repo_url, live_url, highlights, impact, visibility, sort)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);
src.projects.forEach((p, i) => {
  insProject.run(
    p.id,
    p.title,
    p.repo,
    p.blurb,
    p.description ?? "",
    p.problem ?? null,
    JSON.stringify(p.stack ?? []),
    p.image ?? null,
    p.status ?? "live",
    p.repoUrl ?? null,
    p.liveUrl ?? null,
    p.highlights ? JSON.stringify(p.highlights) : null,
    p.impact ?? null,
    p.visibility ?? "public",
    i,
  );
});

/* ------------------------------------------------------------- education */
db.exec("DELETE FROM education;");
const insEdu = db.prepare(
  "INSERT INTO education(qualification, institution, location, period, sort) VALUES (?,?,?,?,?)",
);
src.education.forEach((e, i) => insEdu.run(e.qualification, e.institution, e.location, e.period, i));

/* ------------------------------------------------------------- freelance */
db.exec("DELETE FROM freelance_service;");
const insService = db.prepare("INSERT INTO freelance_service(label, sort) VALUES (?, ?)");
src.freelance.services.forEach((s, i) => insService.run(s, i));

/* ------------------------------------------------------------------- nav */
db.exec("DELETE FROM nav_link;");
const insNav = db.prepare("INSERT INTO nav_link(label, href, sort) VALUES (?,?,?)");
src.nav.forEach((n, i) => insNav.run(n.label, n.href, i));

/* --------------------------------------------------------------- contact */
db.exec("DELETE FROM contact_link;");
const insContact = db.prepare("INSERT INTO contact_link(label, href, kind, sort) VALUES (?,?,?,?)");
src.contact.links.forEach((l, i) => {
  const kind = l.href.startsWith("mailto:")
    ? "email"
    : l.href.includes("wa.me")
      ? "whatsapp"
      : l.href.includes("github")
        ? "github"
        : "link";
  insContact.run(l.label, l.href, kind, i);
});

db.close();

console.log("seeded  content/portfolio.db");
console.log(
  `  profile ${Object.keys(profile).length}  about ${src.about.paragraphs.length}  ` +
    `stack ${src.stackGroups.length}  projects ${src.projects.length}  ` +
    `education ${src.education.length}  nav ${src.nav.length}  contact ${src.contact.links.length}`,
);