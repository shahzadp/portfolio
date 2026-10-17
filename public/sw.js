/* ==========================================================================
   Portfolio service worker

   Plain static file rather than a Next.js route, because `output: "export"`
   cannot emit dynamic handlers. Everything here is written relative to the
   worker's own URL, so it works unchanged at "/" and under a project-site
   base path like "/portfolio/".
   ========================================================================== */

/** Bump on any change to what is precached or how the cache behaves.
 *  Old caches are deleted wholesale on activate, so this is the only lever
 *  needed to push an update out.
 *
 *  v2: icons enlarged.
 *  v3: any and maskable icons unified, artwork at 86% of the tile in both.
 *      The icons are in PRECACHE, so without this an already installed copy
 *      keeps serving the old bitmaps from cache. Note this does not change an
 *      app icon Android already captured at install time; that still needs an
 *      uninstall and reinstall. */
const VERSION = "v3";
const SHELL = `portfolio-shell-${VERSION}`;
const ASSETS = `portfolio-assets-${VERSION}`;

/** Directory this worker is served from, e.g. "/" or "/portfolio/". */
const BASE = new URL("./", self.location.href).pathname;

/** The minimum needed to render something meaningful with no network at all. */
const PRECACHE = [
  "./",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon.svg",
  "./icons/apple-touch-icon.png",
  "./portrait.jpg",
];

/**
 * Pulls in the CSS and JS the document actually asks for.
 *
 * On a first visit the worker is not yet controlling the page, so the
 * stylesheet and scripts have already been fetched by the time it installs
 * and never pass through the fetch handler. Without this, going offline
 * before the second visit serves the HTML with no stylesheet: technically a
 * successful load, visibly a broken page.
 *
 * Best-effort by design. These filenames are content-hashed by the build and
 * may not exist at all on a later layout, so each is added individually and
 * failures are ignored -- unlike PRECACHE, which stays atomic.
 */
async function precacheBuildOutput() {
  // Wrapped whole-body on purpose. A throw anywhere in here rejects the
  // install promise, which discards the worker silently and leaves the
  // already-populated cache behind with nothing serving it. Best-effort code
  // must never be able to take the worker down.
  try {
    const res = await fetch(BASE, { cache: "no-store" });
    if (!res.ok) return;
    const html = await res.text();

    const found = new Set();
    // CSS and JS carry the layout; the woff2 preloads carry the typography.
    // Leaving the fonts out renders an offline page in system serifs, which
    // reads as a different site rather than a cached copy of this one.
    const pattern = /<(?:link|script)[^>]+?(?:href|src)="([^"]+\.(?:css|js|woff2)[^"]*)"/g;
    for (const m of html.matchAll(pattern)) {
      // Resolved against self.location, not BASE: BASE is a path, and
      // URL(path) with a relative base throws.
      const url = new URL(m[1], self.location.href);
      if (url.origin !== self.location.origin) continue;
      found.add(url.pathname + url.search);
    }

    // Into ASSETS, not SHELL: this is exactly what the fetch handler serves
    // hashed build output from, and precaching into the wrong cache produces
    // a worker that holds a stylesheet it never looks for.
    const cache = await caches.open(ASSETS);
    await Promise.allSettled([...found].map((u) => cache.add(u)));
  } catch (err) {
    // Offline capability degrades to "second visit onwards". Nothing else.
    // Logged rather than swallowed: an earlier version caught this silently
    // and hid a real bug (a null cache) for far too long.
    console.warn("[sw] could not precache build output:", err);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(async (cache) => {
        // addAll is atomic: if any one entry 404s the whole install fails and
        // no half-populated shell is left behind to serve a broken offline
        // page. Note it resolves with undefined, so the cache object has to
        // be threaded through explicitly rather than chained.
        await cache.addAll(PRECACHE);
        await precacheBuildOutput();
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Navigation: network first, cache as the fallback.
 *
 * Deliberately not cache-first. The document carries the whole visible
 * portfolio, and a visitor who has been away for a week should get the
 * current copy, not last week's. Offline still works because the shell entry
 * is already precached.
 */
async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const root = await cache.match(BASE);
    if (root) return root;
    throw err;
  }
}

/**
 * Hashed build output: cache first, and never revalidate.
 *
 * Next.js puts a content hash in every /_next/static filename, so a given URL
 * can only ever mean one thing. Re-fetching would be pure waste.
 */
async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await fetch(request);
  // opaque responses carry status 0 and cannot be validated; skip them.
  if (fresh.ok && fresh.type === "basic") cache.put(request, fresh.clone());
  return fresh;
}

/** Everything else same-origin: serve from cache when present, refresh behind. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((fresh) => {
      if (fresh.ok && fresh.type === "basic") cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => undefined);
  return hit ?? (await network) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Analytics and anything else cross-origin passes straight through. The
  // worker must never cache, delay or reorder a third-party beacon.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith(`${BASE}_next/static/`)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

/** Lets the page tell a waiting worker to take over immediately. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});