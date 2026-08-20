import { ArrowRight, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

export default function About() {
  return (
    <Layout>
      <section className="page-hero page-hero-sky about-hero">
        <div className="container">
          <span className="micro-label">ABOUT BAAKANYA</span>
          <h1>Less paperwork. More forward motion.</h1>
          <p>
            Baakanya is a practical document and automation workspace built to
            help people finish everyday admin without expensive software or
            complicated processes.
          </p>
        </div>
      </section>
      <section className="about-story container">
        <span className="micro-label">WHY IT EXISTS</span>
        <h2>
          Good opportunities should not be lost to formatting, file problems or
          unfinished admin.
        </h2>
        <div className="about-story-grid">
          <p>
            Baakanya brings career documents, business paperwork and file tools
            into one calm workspace. It guides you through the details, handles
            the repetitive work and produces something ready to send.
          </p>
          <p>
            The platform was started in Botswana with local needs in mind:
            straightforward pricing, Botswana-ready documents, mobile-friendly
            tools and payment options people can actually use.
          </p>
        </div>
      </section>
      <section className="about-principles">
        <div className="container about-principles-grid">
          <article>
            <FileCheck2 />
            <span>01</span>
            <h3>Useful before impressive</h3>
            <p>Every tool starts with a real task somebody needs to finish.</p>
          </article>
          <article>
            <ShieldCheck />
            <span>02</span>
            <h3>Private by default</h3>
            <p>File work stays on your device wherever the job allows it.</p>
          </article>
          <article>
            <Sparkles />
            <span>03</span>
            <h3>Growing around users</h3>
            <p>
              Future automations will be shaped by the requests people send.
            </p>
          </article>
        </div>
      </section>
      <section className="simple-cta blue">
        <div className="container">
          <h2>Bring one unfinished job.</h2>
          <Link className="btn btn-ink" to="/auth?mode=signup">
            Start free <ArrowRight />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
