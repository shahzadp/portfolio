/**
 * Reads content/portfolio.db and writes content/site.generated.ts.
 *
 *   node scripts/db/generate.mjs
 *
 * This is the read half of the SQLite pipeline: the database is the source of
 * truth, and this emits the typed module the React components import. Runs
 * automatically before `npm run build`.
 */
import { DatabaseSync } from "node:sqlite";
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB_PATH = join(ROOT, "content", "portfolio.db");
const OUT = join(ROOT, "content", "site.generated.ts");

if (!existsSync(DB_PATH)) {
  console.error("content/portfolio.db is missing. Run: npm run db:seed");
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });

const profile = Object.fromEntries(
  db.prepare("SELECT key, value FROM profile").all().map((r) => [r.key, r.value]),
);

const about = {
  heading: profile.aboutHeading,
  paragraphs: db.prepare("SELECT body FROM about_paragraph ORDER BY sort").all().map((r) => r.body),
};

const groups = db.prepare("SELECT id, label FROM stack_group ORDER BY sort").all();
const items = db.prepare("SELECT group_id, label FROM stack_item ORDER BY group_id, sort").all();
const stackGroups = groups.map((g) => ({
  label: g.label,
  items: items.filter((i) => i.group_id === g.id).map((i) => i.label),
}));

const projects = db
  .prepare("SELECT * FROM project WHERE visibility = 'public' ORDER BY sort")
  .all()
  .map((p) => ({
    id: p.id,
    title: p.title,
    repo: p.repo,
    blurb: p.blurb,
    description: p.description,
    problem: p.problem ?? undefined,
    stack: JSON.parse(p.stack),
    image: p.image,
    status: p.status,
    liveUrl: p.live_url,
    repoUrl: p.repo_url ?? undefined,
    highlights: p.highlights ? JSON.parse(p.highlights) : undefined,
    impact: p.impact ?? undefined,
  }));

const education = db
  .prepare("SELECT qualification, institution, location, period FROM education ORDER BY sort")
  .all();

const freelance = {
  fiverrUrl: profile.fiverrUrl,
  fiverrHandle: profile.fiverrHandle,
  blurb: profile.freelanceBlurb,
  services: db.prepare("SELECT label FROM freelance_service ORDER BY sort").all().map((r) => r.label),
};

const nav = db.prepare("SELECT label, href FROM nav_link ORDER BY sort").all();

const contact = {
  heading: profile.contactHeading,
  blurb: profile.contactBlurb,
  links: db
    .prepare("SELECT label, href, kind FROM contact_link ORDER BY sort")
    .all()
    .map((l) => ({ label: l.label, href: l.href, external: l.kind !== "email" })),
};

db.close();

const site = {
  name: profile.name,
  role: profile.role,
  status: profile.contactBlurb,
  bio: profile.bio,
  email: profile.email,
  location: profile.location,
  timezone: profile.timezone,
  portrait: profile.portrait,
  url: profile.url,
  github: profile.github,
  githubHandle: profile.githubHandle,
  whatsappNumber: profile.whatsappNumber,
  whatsappDisplay: profile.whatsappDisplay,
  resumeUrl: profile.resumeUrl || null,
};

const q = (s) => JSON.stringify(s);

/** Emit a JS-literal-ish object. Long strings are emitted as concatenations. */
function emit(value, indent = 0) {
  const pad = "  ".repeat(indent);
  if (typeof value === "string") {
    if (value.length <= 90 && !value.includes("\n")) return q(value);
    // Split long prose into chunks so the generated file stays readable.
    // Each chunk is trimmed, so the *continuation* carries the leading space:
    // trimming the chunk that ends a line would silently join two words
    // together in the rendered output.
    const words = value.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > 82) {
        lines.push(cur.trim());
        cur = w;
      } else {
        cur = (cur + " " + w).trim();
      }
    }
    if (cur) lines.push(cur);
    return lines
      .map((l, i) => {
        // Continuation chunks carry the leading space that trimming removed
        // from the end of the chunk before them. The first chunk gets none.
        const chunk = (i > 0 ? " " : "") + l;
        return i === lines.length - 1 ? q(chunk) : `${q(chunk)} +\n${pad}    `;
      })
      .join("");
  }
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    if (value.every((v) => typeof v === "string")) {
      return "[" + value.map((v) => q(v)).join(", ") + "]";
    }
    const inner = value
      .map((v) => `${pad}  ${emit(v, indent + 1)}`)
      .join(",\n");
    return `[\n${inner}\n${pad}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    const inner = entries
      .map(([k, v]) => `${pad}  ${k}: ${emit(v, indent + 1)},`)
      .join("\n");
    return `{\n${inner}\n${pad}}`;
  }
  return String(value);
}

const banner = `/* ==========================================================================
   GENERATED FILE — DO NOT EDIT BY HAND.

   Source:  content/portfolio.db  (SQLite)
   Rebuild: npm run db:generate   (also runs automatically on npm run build)

   To change content, edit one of:
     content/site.ts  then  npm run db:seed
     or the .db directly with any SQLite browser, then npm run db:generate
   ========================================================================== */

export type Project = {
  id: string;
  title: string;
  repo: string;
  blurb: string;
  description: string;
  problem?: string;
  stack: string[];
  image?: string | null;
  status?: "live" | "building";
  liveUrl?: string | null;
  repoUrl?: string;
  highlights?: string[];
  impact?: string;
};

export type Education = {
  qualification: string;
  institution: string;
  location: string;
  period: string;
  note?: string;
};

/** wa.me deep link, optionally prefilled with a message. */
export function whatsappUrl(message?: string) {
  const base = \`https://wa.me/\${site.whatsappNumber}\`;
  return message ? \`\${base}?text=\${encodeURIComponent(message)}\` : base;
}

`;

writeFileSync(
  OUT,
  banner +
    `export const site = ${emit(site)};\n\n` +
    `export const about = ${emit(about)};\n\n` +
    `export const stackGroups = ${emit(stackGroups)};\n\n` +
    `export const projects: Project[] = ${emit(projects)};\n\n` +
    `export const education: Education[] = ${emit(education)};\n\n` +
    `export const freelance = ${emit(freelance)};\n\n` +
    `export const nav = ${emit(nav)};\n\n` +
    `export const contact = ${emit(contact)};\n`,
  "utf8",
);

console.log(
  `generated content/site.generated.ts  (${projects.length} projects, ${education.length} education, ${stackGroups.length} stack groups)`,
);