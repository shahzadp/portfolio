import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Education from "@/components/Education";
import Freelance from "@/components/Freelance";
import Contact from "@/components/Contact";
import { projects, site } from "@/content/site.generated";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />

        <Projects
          id="projects"
          eyebrow="From GitHub"
          heading="Selected Projects"
          sub="Shipped work, from native Android apps to the web tooling around them."
          projects={projects}
          githubUrl={site.github}
          githubLabel={`github.com/${site.githubHandle}`}
        />

        <Education />
        <Freelance />
      </main>
      <Contact />
    </>
  );
}