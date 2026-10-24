import Image from "next/image";
import styles from "./Hero.module.css";
import { site } from "@/content/site.generated";
import { assetUrl } from "@/app/paths";

export default function Hero() {
  return (
    <section id="top" className={styles.hero} data-hero>
      <div className={styles.copy}>
        <div className={styles.eyebrow} data-reveal>
          <span className={styles.dot} data-dot aria-hidden="true" />
          {site.role} · {site.location}
        </div>

        <h1 className={styles.title} data-reveal style={{ "--i": 1 } as React.CSSProperties}>
          {site.name}, building cutting-edge software.
        </h1>

        <p className={styles.bio} data-reveal style={{ "--i": 2 } as React.CSSProperties}>
          {site.bio}
        </p>

        <div className={styles.actions} data-reveal style={{ "--i": 3 } as React.CSSProperties}>
          {site.resumeUrl ? (
            <a className={styles.btnSolid} href={assetUrl(site.resumeUrl)!} download>
              Download CV
            </a>
          ) : (
            <span className={`${styles.btnSolid} ${styles.btnDisabled}`} title="Add your CV at public/resume.pdf">
              Download CV
            </span>
          )}
          <a className={styles.btnOutline} href="#projects">
            View Projects
          </a>
        </div>
      </div>

      <figure className={styles.portrait} data-hero-portrait data-reveal style={{ "--i": 2 } as React.CSSProperties}>
        <Image
          src={assetUrl(site.portrait)!}
          alt={`Portrait of ${site.name}`}
          width={864}
          height={864}
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 900px) 280px, 320px"
          className={styles.portraitImg}
        />
        <figcaption className={styles.caption}>
          <a href={site.github} target="_blank" rel="noopener noreferrer">
            github.com/{site.githubHandle}
          </a>
        </figcaption>
      </figure>
    </section>
  );
}