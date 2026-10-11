import styles from "./Header.module.css";
import { nav, site } from "@/content/site.generated";

export default function Header() {
  return (
    <header className={styles.header}>
      <a className={styles.brand} href="#top">
        {site.name}
      </a>
      <nav className={styles.nav} aria-label="Primary">
        {nav.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}