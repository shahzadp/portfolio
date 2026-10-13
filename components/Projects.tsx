import type { Project } from "@/content/site.generated";
import { whatsappUrl } from "@/content/site.generated";
import styles from "./Projects.module.css";

type Props = {
  id: string;
  eyebrow: string;
  heading: string;
  sub: string;
  projects: Project[];
  githubUrl?: string;
  githubLabel?: string;
};

export default function Projects({
  id,
  eyebrow,
  heading,
  sub,
  projects,
  githubUrl,
  githubLabel,
}: Props) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.head} data-reveal>
        <div>
          <div className={styles.eyebrow}>{eyebrow}</div>
          <h2 className={styles.heading}>{heading}</h2>
          <p className={styles.sub}>{sub}</p>
        </div>
        {githubUrl && (
          <a className={styles.ghLink} href={githubUrl} target="_blank" rel="noopener noreferrer">
            {githubLabel} →
          </a>
        )}
      </div>

      <div className={styles.grid}>
        {projects.map((p, i) => {
          /* Falls back to WhatsApp so a project with no public link is still
             contactable. */
          const href = p.repoUrl || p.liveUrl || whatsappUrl();
          const external = Boolean(p.repoUrl || p.liveUrl);

          return (
            <a
              key={p.id}
              className={styles.card}
              href={href}
              target={external ? "_blank" : undefined}
              rel="noopener noreferrer"
              data-reveal
              style={{ "--i": i } as React.CSSProperties}
            >
              <h3 className={styles.cardTitle}>
                {p.title}
                {p.status === "building" && <span className={styles.badge}>In progress</span>}
              </h3>
              <p className={styles.cardBlurb}>{p.blurb}</p>
              <div className={styles.tags}>
                {p.stack.slice(0, 3).map((s) => (
                  <span key={s} className={styles.tag}>
                    {s}
                  </span>
                ))}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}