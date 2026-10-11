import styles from "./About.module.css";
import { about, stackGroups } from "@/content/site.generated";

export default function About() {
  return (
    <section id="about" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.story}>
          <h2 className={styles.heading}>{about.heading}</h2>
          {about.paragraphs.map((p, i) => (
            <p key={i} className={styles.para}>
              {p}
            </p>
          ))}
        </div>

        <div className={styles.panel}>
          {stackGroups.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.label}>{group.label}</div>
              <ul className={styles.items}>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}