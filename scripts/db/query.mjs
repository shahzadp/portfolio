/**
 * Inspects content/portfolio.db with plain SQL.
 *
 *   npm run db:query
 */
import { DatabaseSync } from "node:sqlite";
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const db = new DatabaseSync(join(ROOT, "content", "portfolio.db"), { readOnly: true });

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name);

console.log("tables:", tables.join(", "));
console.log("size:  ", statSync(join(ROOT, "content", "portfolio.db")).size, "bytes\n");

console.log("projects");
for (const p of db.prepare("SELECT sort, title, repo, repo_url, status FROM project ORDER BY sort").all()) {
  console.log(`  ${p.sort}. ${p.title.padEnd(22)} repo=${p.repo.padEnd(16)} ${p.repo_url ?? "(none)"}`);
}

console.log("\neducation");
for (const e of db.prepare("SELECT period, qualification, institution FROM education ORDER BY sort").all()) {
  console.log(`  ${e.period}  ${e.qualification.padEnd(20)} ${e.institution}`);
}

console.log("\nstack");
for (const g of db.prepare("SELECT id, label FROM stack_group ORDER BY sort").all()) {
  const items = db.prepare("SELECT label FROM stack_item WHERE group_id=? ORDER BY sort").all(g.id);
  console.log(`  ${g.label.padEnd(12)} ${items.map((i) => i.label).join(", ")}`);
}

console.log("\ncontact links");
for (const c of db.prepare("SELECT label, href, kind FROM contact_link ORDER BY sort").all()) {
  console.log(`  [${c.kind}] ${c.label.padEnd(22)} ${c.href.slice(0, 56)}`);
}

db.close();