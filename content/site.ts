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
  { label: "Frameworks", items: ["Next.js", "Flutter", "Kotlin", "Rust", "Capacitor", "Playwright"] },
  { label: "Tools", items: ["Git", "Node.js + pnpm", "Neovim", "PyTorch", "OpenCode"] },
];

/* ==========================================================================
   PROJECTS BLOCK — replacement for `projects` in site.ts
   Verified against local git history in D:\GitHub-Projects.
   ========================================================================== */

export const projects: Project[] = [
  {
    id: "p1",
    title: "Recorder by Alex",
    repo: "Recorder-by-Alex",
    blurb:
      "An Android recorder with a live HLS dashboard served by the phone itself, built without a backend.",
    description:
      "A native Kotlin recorder for camera video and audio-only capture, with a foreground service " +
      "that keeps recording with the screen off. The same app serves a small HTTP dashboard over " +
      "Wi-Fi: live HLS video, remote start and stop, and a JSON status endpoint that reports the " +
      "codec, frame count and feed state, so a fault on the phone can be read from a browser " +
      "instead of logcat.",
    problem:
      "A live stream from an Android camera is a chain of containers: YUV planes into a hardware " +
      "H.264 encoder, fragments into an MP4 muxer, then a playlist a browser will accept. Every " +
      "link had to be verified at byte level before the preview was anything but black.",
    stack: ["Kotlin", "CameraX", "Media3", "H.264"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/Recorder-by-Alex",
    highlights: [
      "Hand-written HTTP server and HLS dashboard served by the phone, with no backend",
      "Camera frames copied plane by plane into a hardware H.264 encoder, strides included",
      "Fragmenter injects the missing tfdt and clears the tfhd base offset so MSE will play the stream",
      "Fixed a black preview that traced back to an empty video track and a rejected moof box",
      "Foreground service keeps recording with the screen off; 31 unit tests cover the container chain",
      "About 3 MB signed release APK with R8 and resource shrinking",
    ],
    impact:
      "Live video, remote recording control and diagnostics all work from a browser on the same " +
      "Wi-Fi, including while a recording is running.",
  },
  {
    id: "p2",
    title: "Alex Store",
    repo: "store",
    blurb:
      "A static storefront with no backend: SQLite compiled to WebAssembly in the browser, and semantic search on device.",
    description:
      "A zero-dependency storefront built with plain HTML, CSS and JavaScript. The product catalog " +
      "is a real SQLite database loaded with sql.js, semantic search runs the ternlight encoder in " +
      "WebAssembly, and product vectors ship precomputed inside the catalog, so visitors only embed " +
      "their query. Orders go straight to WhatsApp, with the product, price and description already " +
      "written into the message.",
    problem:
      "A shop with no server still needs a catalog, a search index and an order path. The catalog " +
      "had to stay editable and diffable, and the search model could not be a CDN dependency that " +
      "silently leaves the storefront blank.",
    stack: ["JavaScript", "SQLite", "sql.js", "WebAssembly"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/store",
    liveUrl: "https://shahzadp.github.io/store/",
    highlights: [
      "SQLite in the browser via vendored sql.js, with no backend and no CDN in the critical path",
      "384-dimension semantic search with ternlight in WebAssembly; vectors ship precomputed",
      "Generated static pages from a zero-dependency build script",
      "PKR prices stored as integer paisa, with no floating point anywhere",
      "WhatsApp-only checkout, with the order prefilled from the catalog",
      "Seven pages, 8 products and 3 collections in about 930 KB with no package manager",
    ],
    impact:
      "A live storefront that runs entirely on GitHub Pages, with search that answers by meaning " +
      "rather than keywords.",
  },
  {
    id: "p3",
    title: "Alex Store for Android",
    repo: "alex-store-app",
    blurb:
      "The Android app for Alex Store, with the same semantic search running natively through Rust and dart:ffi.",
    description:
      "A Flutter app that reads the same catalog.json as the storefront and performs semantic search " +
      "on device. Dart cannot host WebAssembly, so the ternlight engine is compiled to native Rust " +
      "and called through a hand-written dart:ffi boundary. The result ranks with exactly the " +
      "vectors the site publishes, offline, with no model download at query time.",
    problem:
      "The web storefront searches with a WebAssembly encoder that Dart cannot run. A lexical " +
      "fallback would be cheaper, but it cannot answer a query like 'something to drink out of'. " +
      "The same model had to run natively without changing the index.",
    stack: ["Flutter", "Dart", "Rust", "FFI"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/alex-store-app",
    highlights: [
      "ternlight compiled to native Rust and called through dart:ffi",
      "Parity test checks 384-dimension vectors and ranking order against the site within 1e-3",
      "Signed release APK verified by a script that checks the certificate, R8 and model checksum",
      "Launch video overlay runs under the first Flutter frame so the catalog is ready when it fades",
      "On-device index built from the same catalog.json the website serves",
      "No interop codegen: the FFI boundary is a matched pair of Rust and Dart files",
    ],
    impact:
      "Offline semantic search on a handset, using the same embeddings and ranking as the live store.",
  },
  {
    id: "p4",
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
    id: "p5",
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
    id: "p6",
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