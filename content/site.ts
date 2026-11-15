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
      "Live HLS buffer shortened to cut stream latency",
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
      "Content-Security-Policy on every page; catalog and vectors stay self-hosted",
      "Tiered delivery pricing: struck-through +50% below Rs 1,000, +10% above",
      "Food & Drinks menu with a free-delivery voucher, priced delivery-included",
      "PKR prices stored as integer paisa, with no floating point anywhere",
      "WhatsApp-only checkout, with the order prefilled from the catalog",
      "Seven pages, 12 products and 3 collections in about 1 MB with no package manager",
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
      "Food & Drinks menu, free-delivery voucher and delivery-included pricing, carried through catalog.json",
      "Tiered delivery pricing ported from the site: struck-through +50% below Rs 1,000",
      "Manifest hardened in v1.2.3: no backups, no cleartext traffic, system CAs only",
      "Signed release APK verified by a script that checks the certificate, R8 and model checksum",
      "Launch video overlay runs under the first Flutter frame so the catalog is ready when it fades",
      "On-device index built from the same catalog.json the website serves",
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
      "Synced with upstream 0.5.13.6 and rebuilt the release APK",
      "Public release with upstream attribution; CC BY-NC-SA 4.0, non-commercial",
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
      "Four playable games in one offline, ad-free Android app, including chess driven by the real Stockfish 19 engine and a native Horizon client.",
    description:
      "A Jetpack Compose app bundling four games together: chess against Stockfish 19 compiled to WebAssembly, running off the main thread in a worker, with hot seat, an opening explorer and a legal-move quiz mode; Flappy Bird; a Virtual Pet 3D rendered with three.js, with optional chat via a user-supplied API key stored on device; and Horizon, a native Android build of the open-source Minecraft Java client, staged into the APK at packaging time.",
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
      "Opening explorer, legal-move quiz mode and two-player hot seat",
      "Horizon, the open-source Minecraft Java client, staged natively at packaging time; no Mojang assets ship in the repo or APK",
      "Virtual Pet 3D renders with three.js; chat is optional and uses a key you supply, stored on device",
      "Cburnett chess pieces (CC BY-SA 3.0) redrawn as bold outline figures",
      "Signed APKs published on GitHub Releases; offline, ad-free, no account required",
    ],
    impact:
      "Four games in one offline, ad-free APK, with a genuine chess engine and a native Minecraft client rather than scripted demos.",
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
      "Background removal with on-device MediaPipe segmentation; nothing leaves the phone",
      "v1.0: first public release, signed APK on GitHub Releases",
    ],
    impact: "A complete non destructive editing pipeline in a single native app.",
  },
  {
    id: "p7",
    title: "Project Alice by Alex",
    repo: "Project-Alice-Android-by-Alex",
    blurb:
      "Victoria 2, running natively on Android: the open-source Project Alice engine compiled for ARM64 with OpenGL ES 3.2.",
    description:
      "Project Alice is an open-source engine for Victoria 2. This is a native Android port: the " +
      "same C++ code compiled for ARM64, drawn with OpenGL ES 3.2, with touch controls mapped to " +
      "mouse and keyboard. It starts from the Android v0.6 port by Vitorio-Kuroski and reworks it " +
      "for release: the port and its interface translated from Chinese to English, a Victoria II " +
      "look with pop-type pie charts and column banners, and a signed public release. The original " +
      "Victoria 2 game files are required and are not included.",
    problem:
      "The upstream Android port shipped with a Chinese-language interface and commercial fonts. " +
      "Making it release-ready meant translating the whole UI to English, swapping the fonts for " +
      "an OFL-licensed face, and giving the windows a Victoria II look, all without breaking a " +
      "renderer that has no test harness for its UI.",
    stack: ["C++", "Java", "OpenGL ES", "CMake"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/Project-Alice-Android-by-Alex",
    highlights: [
      "Forked from the Android v0.6 port (Vitorio-Kuroski/Project-Alice-mobile) and taken to a signed public release",
      "Translated the port and its interface from Chinese to English",
      "Victoria II-style UI: pie charts of population by stratum, six demographic charts in the population window, maroon column banners with gold rules",
      "Replaced commercial Chinese fonts with Noto Serif SC (OFL)",
      "Adaptive launcher icon generated from SVG; app renamed to Project Alice by Alex",
      "Release signing via a project-local keystore, with keys and passwords kept out of the repo",
      "Runs on a real device (Moto One Hyper, Android 11, Adreno 612); still a test version",
    ],
    impact:
      "Victoria 2 runs natively on a phone: engine, renderer and UI, with the original game files you bring yourself.",
  },
  {
    id: "p8",
    title: "Alexyomi",
    repo: "Alexyomi",
    blurb:
      "An AniYomi fork with the local library and backup stripped out, rebuilt entirely around MyAnimeList: sync, seasons, an in-app MPV player and a Movies tab.",
    description:
      "A MyAnimeList-centric anime app fork of AniYomi. It drops the local library and backup machinery entirely: your MAL list is the app, with two-way progress sync, seasonal lists, " +
      "top and search, a MAL profile with logout, and Add-to-MAL from any entry. Watching an episode updates MAL in both directions, with a letter-for-letter identity check so it " +
      "never links the wrong show; otherwise you get a picker. The player is in-app MPV with custom mpv.conf and input.conf, a Movies tab with an in-app browser and built-in " +
      "ad blocker, and a saved-links manager with folder grouping, drag-and-drop and plain-text backup/restore. No local library, no backup, no other trackers, no AniYomi branding.",
    problem:
      "AniYomi is built for a local library that Alexyomi users never wanted. Every surface — list, search, tracking, playback, settings, crashes — had to be re-plumbed around " +
      "MyAnimeList, which means tracking, identity matching, and the player had to agree on what an episode is without breaking on SAME-title shows.",
    stack: ["Kotlin", "Jetpack Compose", "MPV", "MyAnimeList API", "SQLite"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/Alexyomi",
    highlights: [
      "Two-way MAL progress sync: watched episodes update app and MAL in both directions",
      "Letter-for-letter title identity check before auto-linking, with a picker fallback when it can't be sure",
      "No local library, no backup, no other trackers — MyAnimeList is the app",
      "Movies tab with in-app browser, 87k-host ad blocker and fullscreen custom-view playback",
      "Saved links manager: named links, folders with unique colours, long-press drag and drop",
      "Plain-text backup/restore for saved links (line-scanned, no PDF internals)",
      "Crash logs written to alexyomi_crash_logs.txt with verbose MAL sync events included",
      "Single arm64 APK per release, stable RSA signing key, 19 releases shipped",
    ],
    impact:
      "A MAL-first anime app that replaces a full local library with stable two-way sync, with every release signed by the same key.",
  },
  {
    id: "p9",
    title: "Alex App Manager",
    repo: "Alex-App-Manager",
    blurb:
      "The Android app manager for the apps I publish: a bundled catalogue, live release detection over GitHub, and in-place downloads and installs with certificate verification.",
    description:
      "An Android app manager for everything I publish. The catalogue ships in the APK so fresh installs work offline; on launch the app checks the public release feed of each " +
      "repository, skips routine API calls in favour of the unbilled releases feed, and only hits the releases API on an actual tag change. Each app shows its real icon fetched " +
      "from a tiny release asset, or extracted from the APK. Installs and updates go through PackageInstaller with certificate verification, so an update is only ever " +
      "installed when the signing key matches what is already installed — the manager refuses a mismatched signature rather than overwriting it.",
    problem:
      "Keeping half a dozen self-published Android apps updated used to mean opening GitHub for each one, hunting for the APK asset, sideloading it, and hoping the signature " +
      "matched. The manager has to detect releases without hammering the unauthenticated API budget, verify every APK before it goes anywhere near the installer, and never " +
      "overwrite a correctly-signed install with an imposter.",
    stack: ["Kotlin", "Jetpack Compose", "Material 3 Expressive", "PackageInstaller"],
    image: null,
    featured: true,
    status: "live",
    repoUrl: "https://github.com/shahzadp/Alex-App-Manager",
    highlights: [
      "Bundled catalogue: fresh installs show the full list with no connection",
      "Release feed via releases.atom with ETag caching and a 30-minute TTL; steady-state GitHub API usage is effectively zero",
      "PackageInstaller-based install with certificate verification on every update",
      "Icon refresh from a tiny release asset, falling back to extracting the APK's own launcher icon",
      "Update flow that refuses a signature mismatch instead of breaking the install",
      "Self-updates itself, and Alexyomi ships inside its catalogue from v0.2.9",
      "Eight entries in the catalogue; 11 releases shipped, stable RSA-4096 key throughout",
    ],
    impact:
      "The whole GitHub-to-phone pipeline in one app: detection, download, verify, install, update — for every app in the catalogue and the manager itself.",
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