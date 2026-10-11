import styles from "./Freelance.module.css";
import { freelance, site, whatsappUrl } from "@/content/site.generated";

export default function Freelance() {
  return (
    <section id="freelance" className={styles.section}>
      <div className={styles.card}>
        <div className={styles.head}>
          <div className={styles.eyebrow}>Freelance</div>
          <h2 className={styles.heading}>Available for hire</h2>
          <p className={styles.blurb}>{freelance.blurb}</p>
        </div>

        <ul className={styles.services}>
          {freelance.services.map((s) => (
            <li key={s} className={styles.service}>
              {s}
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <a
            className={styles.fiverr}
            href={freelance.fiverrUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Hire me on Fiverr
            <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <a
            className={styles.ghost}
            href={whatsappUrl(`Hi ${site.name.split(" ")[0]}, I found your portfolio and I'd like to discuss a project.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message on WhatsApp
          </a>
        </div>

        <p className={styles.handle}>
          fiverr.com/{freelance.fiverrHandle}
        </p>
      </div>
    </section>
  );
}