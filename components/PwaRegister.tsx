"use client";

import { useEffect } from "react";
import { assetUrl } from "@/app/paths";

/**
 * Registers the service worker.
 *
 * Registration is client-side and deliberately does nothing in development:
 * a worker that caches hashed chunks will happily serve the previous build
 * and make hot reload look broken.
 *
 * Scope matters on a project site. A worker served from /portfolio/sw.js may
 * only control /portfolio/, so both the URL and the scope are run through
 * assetUrl() rather than hardcoded to "/".
 */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    const url = assetUrl("/sw.js");
    const scope = assetUrl("/");
    if (!url || !scope) return;

    navigator.serviceWorker
      .register(url, {
        scope,
        // Without this the browser may serve the worker script itself from
        // its own HTTP cache, so a new VERSION can sit unnoticed for hours.
        updateViaCache: "none",
      })
      .catch((err) => {
        // A missing or rejected worker costs offline support and nothing
        // else; the page is already on screen and fully usable.
        console.warn("[pwa] service worker registration failed:", err);
      });
  }, []);

  return null;
}