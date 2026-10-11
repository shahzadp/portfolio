# Portfolio

**Sikander Mughal — Freelancer, Lahore**

Live: **https://shahzadp.github.io/portfolio/**

A Next.js site replicating the supplied *Portfolio — Home* design mockup, with SQLite as the
content store.

> **This folder is the repository.** `D:\GitHub Projects\Portfolio` is a clone of
> `https://github.com/shahzadp/portfolio` — there is no nested project and no second copy.

## Stack

This is a **Next.js** project. Not Capacitor, and not a hybrid of the two.

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router) + TypeScript |
| Styling | CSS Modules + a design-token layer in `app/globals.css` |
| Content store | **SQLite** (`content/portfolio.db`), read at build time |
| Output | Static export to `out/`, published by GitHub Actions |
| Tests | Playwright across five device profiles |

Native Android packaging is **not in scope**. If it happens later, Flutter is the intended path
rather than a Capacitor wrapper.

## Layout

```
.
├─ app/                 routes, layout, globals.css, paths.ts (base-path helper)
├─ components/          Header, Hero, About, Projects, Education, Freelance, Contact
├─ content/
│   ├─ site.ts             ← EDIT THIS (typed authoring source)
│   ├─ portfolio.db        ← SQLite, the source of truth
│   └─ site.generated.ts   generated, do not edit
├─ db/schema.sql        table definitions
├─ scripts/
│   ├─ db/                 seed · generate · query
│   ├─ cv/                 build · preview
│   └─ preview.mjs       static server for out/
├─ public/              portrait.jpg, resume.pdf
├─ tests/               Playwright suites
├─ out/                 static build output (generated)
└─ .github/workflows/deploy.yml
```

## Content flow

```
content/site.ts ──db:seed──► content/portfolio.db ──db:generate──► site.generated.ts ──► components
```

`npm run build` runs the generate step automatically. Inspect the database any time with
`npm run db:query`, or open `content/portfolio.db` in any SQLite browser.

## Commands

```bash
npm install

npm run dev          # http://localhost:3000
npm run build        # static build into out/
npm run preview      # serve out/ on http://localhost:4321
npm run preview:lan  # serve on the LAN so a phone can load it

npm run db:seed      # load SQLite from content/site.ts
npm run db:generate  # SQLite -> site.generated.ts
npm run db:query     # print the database contents
npm run db:reset     # seed + generate
npm run cv           # rebuild public/resume.pdf from SQLite

npm test             # Playwright, all five device profiles
npm run test:desktop
npm run test:mobile
npm run test:ui
```

After editing `content/site.ts`, run `npm run db:reset` (or just `npm run dev` / `npm run build`,
which do it for you).

## Editing content

| Want to change… | Edit |
|---|---|
| Name, email, WhatsApp, GitHub, hero copy | `site` |
| About paragraphs | `about` |
| Languages / Frameworks / Tools | `stackGroups` |
| Projects | `projects` |
| Education | `education` |
| Freelance services + Fiverr | `freelance` |
| Nav links | `nav` |
| Contact links | `contact` |

Drop project screenshots into `public/` and set `image` on the project. Rebuild the CV with
`npm run cv` so it stays in sync.

## Tests

```bash
npx playwright install chromium webkit   # one-time
npm test
```

Covers responsive layout (13 widths, 320px → 2560px), touch input on real phone and tablet
profiles, the WhatsApp contact flow, accessibility (WCAG AA contrast, focus, landmarks), the
SQLite pipeline, and design fidelity against the mockup. See `tests/README.md`.

## Deployment

Pushes to `main` deploy automatically via `.github/workflows/deploy.yml`:
`npm ci` → `db:generate` → `npm run build` → upload artifact → publish to GitHub Pages.

The build verifies `index.html`, `resume.pdf` and `portrait.jpg` all exist, so a broken deploy
fails loudly rather than publishing a dead Download CV button.

**Deployment path is driven by the repo name.** A repo named `<username>.github.io` is served
from the domain root; any other name is a project site served from a sub-path. The `BASE_PATH`
repository variable handles this — it is set to `/portfolio`. If the repo is ever renamed, that
variable and `site.url` in `content/site.ts` are the two things to update.

## Design

Replicated from the supplied mockup — cream ground, tan rules, rust accent, and the three fonts
it specifies (Cormorant Garamond display, Source Sans 3 body, IBM Plex Mono labels), self-hosted
through `next/font` so there is no runtime request to Google.

| Token | Value |
|---|---|
| cream ground | `#EFE6D2` |
| card | `#F8F2E3` |
| about band | `#E8DDC3` |
| ink / footer | `#2B2620` |
| muted text | `#4A4033` |
| accent (rust) | `#A9441F` → `#8F3516` hover |
| rules | `#CDBF9F` |

Every text/background pair meets **WCAG AA (≥4.5:1)**; most reach AAA.

## Notes

- **Static export** (`output: "export"`) — no Node server at runtime, so the site deploys to
  any static host. `npm run build` writes plain files to `out/`.
- **SQLite is read at build time.** That is what static export allows. If you later want a live
  API, drop `output: "export"` and serve the database through a backend.
- **Every component is a server component**, so the exported bundle carries almost no
  client-side JavaScript.
- Next.js keeps agent guidance in `AGENTS.md`; its version-specific docs live in
  `node_modules/next/dist/docs/`. Read those before changing anything Next-related.