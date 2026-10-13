import styles from "./Education.module.css";
import { education } from "@/content/site.generated";

export default function Education() {
  return (
    <section id="education" className={styles.section}>
      <div className={styles.head} data-reveal>
        <div className={styles.eyebrow}>Education</div>
        <h2 className={styles.heading}>Education history</h2>
      </div>

      <ol className={styles.list}>
        {education.map((e, i) => (
          <li
            key={`${e.qualification}-${e.period}`}
            className={styles.item}
            data-reveal
            style={{ "--i": i } as React.CSSProperties}
          >
            <div className={styles.marker} aria-hidden="true">
              <span className={styles.dot} />
            </div>
            <div className={styles.body}>
              <div className={styles.row}>
                <h3 className={styles.qualification}>{e.qualification}</h3>
                <span className={styles.period}>{e.period}</span>
              </div>
              <p className={styles.institution}>
                {e.institution}
                <span className={styles.sep} aria-hidden="true">
                  {" "}
                  &middot;{" "}
                </span>
                {e.location}
              </p>
              {e.note && <p className={styles.note}>{e.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}