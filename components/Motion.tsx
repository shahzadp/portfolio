"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal runtime.
 *
 * Adds .js-motion to <html>, then reveals each [data-reveal] element as it
 * first enters the viewport. Elements are unobserved after firing so the
 * animation never replays on scroll-up.
 *
 * Two deliberate choices:
 *
 *  - The hidden state lives behind .js-motion in CSS, so if this component
 *    never runs (no JS, blocked bundle, prerender stripped) the content is
 *    simply visible rather than permanently invisible.
 *  - Reduced motion and missing IntersectionObserver both resolve to
 *    "reveal everything immediately" rather than "never reveal".
 */
export default function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    const revealAll = () => {
      for (const n of nodes) n.classList.add("is-revealed");
    };

    root.classList.add("js-motion");

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      revealAll();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      },
      // Fire slightly before the element's top edge reaches the fold so the
      // movement is already underway by the time it is properly on screen.
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
    );

    /* opacity:0 does not remove an element from the tab order, so without
       this a keyboard user could tab into a link that is still invisible.
       Focusing an element scrolls it into view, which the observer would
       catch a moment later -- revealing on focus just removes the flash. */
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (el instanceof HTMLElement) {
        el.closest<HTMLElement>("[data-reveal]")?.classList.add("is-revealed");
      }
    };

    for (const n of nodes) io.observe(n);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      io.disconnect();
      document.removeEventListener("focusin", onFocusIn);
      root.classList.remove("js-motion");
    };
  }, []);

  return null;
}