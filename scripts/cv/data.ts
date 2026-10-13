/**
 * Single loader for everything the CV renders.
 *
 * Imported by both scripts/cv/build.mjs and tests/cv.spec.ts. The staleness
 * hash in public/resume.hash is computed over this function's output, so the
 * two must never diverge -- which is why the query lives here once instead of
 * being written out twice.
 */
import { DatabaseSync } from "node:sqlite";

import { createHash } from "node:crypto";

export type CvProject = {
  title: string;
  blurb: string;
  description: string;
  problem: string | null;
  repo_url: string | null;
  status: string;
  stack: string[];
  highlights: string[];
};

export type CvData = {
  profile: Record<string, string>;
  stackGroups: { label: string; items: string[] }[];
  projects: CvProject[];
  education: Record<string, string>[];
};

export function loadCvData(dbPath: string): CvData {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const profile = Object.fromEntries(
      db.prepare("SELECT key, value FROM profile ORDER BY key").all().map((r) => [r.key, r.value]),
    );

    const stackGroups = db
      .prepare("SELECT id, label FROM stack_group ORDER BY sort")
      .all()
      .map((g) => ({
        label: String(g.label),
        items: db
          .prepare("SELECT label FROM stack_item WHERE group_id=? ORDER BY sort")
          .all(g.id)
          .map((i) => String(i.label)),
      }));

    const projects: CvProject[] = db
      .prepare(
        `SELECT title, blurb, description, problem, stack, highlights, repo_url, status
         FROM project WHERE visibility='public' ORDER BY sort`,
      )
      .all()
      .map((p) => {
        const row = p as Record<string, unknown>;
        return {
          title: String(row.title),
          blurb: String(row.blurb),
          description: String(row.description),
          problem: row.problem == null ? null : String(row.problem),
          repo_url: row.repo_url == null ? null : String(row.repo_url),
          status: String(row.status),
          stack: JSON.parse(String(row.stack)),
          highlights: row.highlights ? JSON.parse(String(row.highlights)) : [],
        };
      });

    const education = db
      .prepare("SELECT qualification, institution, location, period FROM education ORDER BY sort")
      .all() as unknown as Record<string, string>[];

    return { profile, stackGroups, projects, education };
  } finally {
    db.close();
  }
}

/** Hash used to detect a CV that no longer matches its database. */
export function hashCvData(data: CvData): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}