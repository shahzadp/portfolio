/* ==========================================================================
   site.ts — single source of truth for all site content.
   ──────────────────────────────────────────────────────────────────────────
   THIS IS THE FILE YOU EDIT to change anything on the site.

   Every field here mirrors the JSON the Rust + SQLite API (apps/api)
   will eventually return, so swapping to a live backend later means
   replacing this import with a fetch — no component changes.
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
  featured?: boolean;
  status?: "live" | "building";
  liveUrl?: string | null;
  repoUrl?: string;
  highlights?: string[];
  impact?: string;
  accessNote?: string;
};

export const site = {
  name: "Sikander Mughal",
  role: "Freelancer",
  tagline: `${"Freelancer"} · Lahore, Pakistan`,
  status: "Available for new work",
  bio:
    "I'm a full stack developer who loves solving software-related challenges, especially " +
    "the ones where the hard part is working out the right approach rather than just " +
    "writing the code. I'm open to freelance work and interesting problems, so get in " +
    "touch and let's get things done.",
  email: "sikandershahzad53@gmail.com",
  location: "Lahore, Pakistan",
  timezone: "PKT · UTC+5",
  portrait: "/portrait.jpg",
  url: "https://shahzadp.github.io/portfolio/",
  github: "https://github.com/shahzadp",
  githubHandle: "shahzadp",

  /* WhatsApp — digits only, no +, spaces or dashes. That is the format
     wa.me expects. `whatsappDisplay` is what people read. */
  whatsappNumber: "923288304524",
  whatsappDisplay: "+92 328 8304524",

  /* Where the generated CV lives. Build it with 
pm run cv.
     Keep this set: 
pm run db:reset re-seeds SQLite from this file, so a null
     here would silently switch the Download CV button back off. */
  resumeUrl: "/resume.pdf" as string | null,
};

/** wa.me deep link, optionally prefilled with a message. */
export function whatsappUrl(message?: string) {
  const base = `https://wa.me/${site.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/* About ------------------------------------------------------------------- */
export const about = {
  heading: "About",
  paragraphs: [
    "I've been obsessed with computers since I was a child, taking things apart to see what " +
      "was going on inside, then putting them back together and wondering whether I could build " +
      "one myself. That curiosity is still what drives my work.",
    "It turned into a full stack career: designing the interface, building the API behind it, " +
      "and wiring up the data so the whole thing holds together. I like problems that genuinely " +
      "need thought, and I care about software that is still easy to work with long after it ships.",
  ],
};

/* The mockup's About panel: three labelled columns ----------------------- */
export const stackGroups = [
  { label: "Languages", items: ["English", "Urdu", "Punjabi"] },
  { label: "Frameworks", items: ["Next.js", "Flutter", "Capacitor", "Playwright"] },
  { label: "Tools", items: ["Git", "Node.js + pnpm", "Neovim", "PyTorch", "OpenCode"] },
];

/* ==========================================================================
   PROJECTS BLOCK — replacement for `projects` in site.ts
   Verified against local git history in D:\GitHub Projects.
   ========================================================================== */

export const projects: Project[] = [
  {
    id: "p1",
    title: "DoL by Alex",
    repo: "DoL-by-Alex",
    blurb:
      "An Android port of an open source Twine interactive fiction game, migrated twice and shipped offline.",
    description:
      "A native Flutter shell around a 50 MB single file SugarCube 2 story. Runs fully offline: " +
      "no network calls at runtime, no ads, no tracking. The shell has been rebuilt twice, " +
      "Cordova to Capacitor and then Capacitor to Flutter, and each migration surfaced a layer " +
      "of bugs that had been hiding behind the one before it.",
    problem:
      "A Twine story is just an HTML file. Making it an app players trust with their saves means " +
      "owning storage, assets, export and signing, none of which the game itself ever had to " +
      "worry about.",
    stack: ["Flutter", "Dart", "Android", "WebView"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/DoL-by-Alex",
    highlights: [
      "Second full shell migration: Cordova to Capacitor to Flutter 3.47.7",
      "Fixed export failing silently across four layers at once",
      "Re-encoded 18,593 PNGs to lossless WebP, cutting artwork 60.9% and the release APK 7.5 MB",
      "Measured every optimisation instead of assuming: lossy WebP was larger, so it was rejected",
      "Traced 2,073 silently missing images to percent-encoded asset keys with spaces in paths",
      "Reuses the previous signing key, so it installs as an in-place update over the old build",
    ],
    impact:
      "Release APK down to 34.2 MB, and arm64-only cuts that roughly in half again. Builds, " +
      "signs, passes its own test suite and runs on a device.",
  },
  {
    id: "p2",
    title: "4 Games by Alex",
    repo: "4GamesbyAlex",
    blurb:
      "Four playable games in one Android app, including chess driven by the real Stockfish 19 engine.",
    description:
      "A Jetpack Compose app bundling four small games together. The chess mode embeds the " +
      "Stockfish 19 engine compiled to WebAssembly, runs it off the main thread in a worker, and " +
      "supports playing the bot as well as hot seat, with an opening explorer and move history.",
    problem:
      "Embedding a real chess engine means WebAssembly has to load fast, think without freezing " +
      "the UI, and hand moves back to the Compose layer cleanly. Worker lifecycle and illegal " +
      "move generation were the two things that broke.",
    stack: ["Kotlin", "Jetpack Compose", "Stockfish", "WebAssembly"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/4GamesbyAlex",
    highlights: [
      "Stockfish 19 lite packaged as a 1.7 MB WASM module inside the APK",
      "Worker based engine so the interface never blocks while the bot calculates",
      "Fixed illegal move generation and worker lifecycle bugs found on device",
      "R8 obfuscation and resource shrinking for release builds",
    ],
    impact: "Four games in one APK, with a genuine chess engine rather than a scripted bot.",
  },
  {
    id: "p3",
    title: "Photo Editor by Alex",
    repo: "PhotoEditorbyAlex",
    blurb:
      "A native Android photo editor built with Compose: layers, filters, text, drawing and cutouts.",
    description:
      "A layered image editor written from scratch in Kotlin and Jetpack Compose. A non " +
      "destructive layer stack feeds an adjustment pipeline, plus background removal, filters, " +
      "colour grading, text and freehand draw layers, each with its own gesture handling.",
    problem:
      "Every editing action needs to be undoable without destroying pixels. Keeping a layer " +
      "stack non destructive means the renderer has to replay every adjustment each frame, " +
      "which is where naive editors get slow.",
    stack: ["Kotlin", "Jetpack Compose", "ExifInterface", "Kotlin Coroutines"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/PhotoEditorbyAlex",
    highlights: [
      "42 Kotlin files split cleanly into a core engine and a Compose UI layer",
      "Separate gesture stage per layer type for transform, draw, text and tap select",
      "Project autosave and a native SAF export sheet",
      "Background removal through cutout composition",
    ],
    impact: "A complete non destructive editing pipeline in a single native app.",
  },
];
/* ==========================================================================
   EDUCATION + FREELANCE BLOCK
   ========================================================================== */

export type Education = {
  qualification: string;
  institution: string;
  location: string;
  period: string;
  note?: string;
};

/* Education --------------------------------------------------------------- */
export const education: Education[] = [
  {
    qualification: "Intermediate (FA)",
    institution: "Private student",
    location: "Lahore, Pakistan",
    period: "2025",
  },
  {
    qualification: "Matriculation",
    institution: "CDG Boys High School",
    location: "Lahore, Pakistan",
    period: "2021",
  },
];

/* Freelance --------------------------------------------------------------- */
export const freelance = {
  fiverrUrl: "https://www.fiverr.com/sikander49/",
  fiverrHandle: "sikander49",
  blurb:
    "I take on freelance work through Fiverr, covering web, Android and full stack builds. " +
    "If something is on that page you need, send me a message and we can talk scope.",
  services: [
    "Android app development",
    "Web application development",
    "Flutter and cross platform builds",
    "Image editing and photo tools",
  ],
};
/* Nav -------------------------------------------------------------------- */
export const nav = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#projects" },
  { label: "Education", href: "#education" },
  { label: "Contact", href: "#contact" },
];

/* Footer / contact ------------------------------------------------------- */
export const contact = {
  heading: "Let us work together.",
  blurb: "Tell me what you're building and I'll get back to you within a day or two.",
  links: [
    { label: "WhatsApp", href: whatsappUrl(), external: true },
    { label: site.whatsappDisplay, href: whatsappUrl(), external: true },
    { label: site.email, href: `mailto:${site.email}`, external: false },
    { label: "GitHub", href: site.github, external: true },
  ],
};