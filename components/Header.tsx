"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./Header.module.css";
import { nav, site } from "@/content/site.generated";

/** Must match the max-width: 640px breakpoint in Header.module.css. */
const PHONE = "(max-width: 640px)";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const sync = () => {
      setIsPhone(mq.matches);
      // Growing out of the phone layout should not leave the panel open, or
      // rotating the device strands a full-screen menu over a layout that no
      // longer shows the button that opened it.
      if (!mq.matches) setOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // On a phone the nav is a full-screen overlay, so Escape has to close it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, close]);

  /* The panel is visibility:hidden when closed, which stops it rendering.
     inert additionally takes the links out of the tab order and the
     accessibility tree, so a screen reader is not offered links the user
     cannot see or reach. Scoped to the phone overlay on purpose: above the
     breakpoint the same nav is laid out inline, visible and usable, so
     marking it inert there would make the desktop site unusable. */
  const inert = isPhone && !open;

  return (
    <header className={styles.header} data-header data-open={open || undefined}>
      <a className={styles.brand} data-brand href="#top" onClick={close}>
        {site.name}
      </a>

      {/* display:none above 640px, where the inline links are visible anyway
          and this button would be a second route to the same place. */}
      <button
        className={styles.menuBtn}
        data-menu-btn
        type="button"
        aria-expanded={open}
        aria-controls="primary-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.menuBars} data-menu-bars aria-hidden="true" />
        Menu
      </button>

      <nav
        className={open ? `${styles.nav} is-open` : styles.nav}
        id="primary-nav"
        data-nav
        aria-label="Primary"
        inert={inert || undefined}
      >
        {nav.map((item) => (
          <a key={item.href} href={item.href} onClick={close}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}