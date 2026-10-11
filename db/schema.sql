-- Portfolio content schema.
--
-- This SQLite file is the source of truth for everything the site renders.
-- `npm run db:seed` loads it from content/site.ts; `npm run db:generate`
-- reads it back out into content/site.generated.ts, which the app imports.
--
-- The same file is readable by the Rust + axum backend planned for the next
-- phase, so nothing has to move when that arrives.

PRAGMA foreign_keys = ON;

-- Simple key/value settings (name, email, github, whatsapp, bio, ...).
CREATE TABLE IF NOT EXISTS profile (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- About section prose, one row per paragraph.
CREATE TABLE IF NOT EXISTS about_paragraph (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  sort INTEGER NOT NULL,
  body TEXT    NOT NULL
);

-- Languages / Frameworks / Tools.
CREATE TABLE IF NOT EXISTS stack_group (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT    NOT NULL,
  sort  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stack_item (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES stack_group(id) ON DELETE CASCADE,
  label    TEXT    NOT NULL,
  sort     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS project (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  repo        TEXT NOT NULL,
  blurb       TEXT NOT NULL,
  description TEXT NOT NULL,
  problem     TEXT,
  stack       TEXT NOT NULL, -- JSON array
  image       TEXT,
  status      TEXT NOT NULL DEFAULT 'live',
  repo_url    TEXT,
  live_url    TEXT,
  highlights  TEXT,          -- JSON array
  impact      TEXT,
  visibility  TEXT NOT NULL DEFAULT 'public',
  sort        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS education (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  qualification TEXT NOT NULL,
  institution   TEXT NOT NULL,
  location      TEXT NOT NULL,
  period        TEXT NOT NULL,
  sort          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS freelance_service (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  sort  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nav_link (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  href  TEXT NOT NULL,
  sort  INTEGER NOT NULL
);

-- Contact links. `kind` drives how each one is rendered.
CREATE TABLE IF NOT EXISTS contact_link (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  href  TEXT NOT NULL,
  kind  TEXT NOT NULL, -- whatsapp | email | github
  sort  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stack_item_group ON stack_item(group_id);
CREATE INDEX IF NOT EXISTS idx_project_sort    ON project(sort);
CREATE INDEX IF NOT EXISTS idx_project_vis     ON project(visibility);