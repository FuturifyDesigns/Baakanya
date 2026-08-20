import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BaakanyaSystemGraphic,
  GrowthMark,
  PrivacyMark,
  UsefulMark,
} from "../components/BrandIllustrations";
import Layout from "../components/Layout";

export default function About() {
  return (
    <Layout>
      <section className="about-hero" data-cursor-theme="light">
        <div className="container about-hero-grid">
          <div className="about-hero-copy">
            <span className="micro-label">ABOUT BAAKANYA</span>
            <h1>
              Less paperwork.
              <br />
              <em>More forward motion.</em>
            </h1>
            <p>
              Baakanya is a practical document workspace that helps people turn
              everyday admin into finished, professional work.
            </p>
            <div className="about-hero-actions">
              <Link className="btn btn-ink" to="/auth?mode=signup">
                Get started <ArrowRight />
              </Link>
              <Link className="plain-arrow" to="/tools">
                Explore the tools <ArrowRight />
              </Link>
            </div>
          </div>
          <div className="about-hero-graphic">
            <BaakanyaSystemGraphic />
          </div>
        </div>
        <div className="container about-scope-strip">
          <span>01 / Career documents</span>
          <span>02 / Business paperwork</span>
          <span>03 / File preparation</span>
        </div>
      </section>
      <section className="about-story container">
        <div className="about-story-label">
          <span className="micro-label">WHY IT EXISTS</span>
          <span className="about-story-number">01</span>
        </div>
        <div className="about-story-body">
          <h2>
            Good opportunities should not be lost to formatting, file problems
            or unfinished admin.
          </h2>
          <div className="about-story-grid">
            <p>
              Baakanya brings career documents, business paperwork and file
              tools into one calm workspace. It guides you through the details,
              handles the repetitive work and produces something ready to send.
            </p>
            <p>
              It was started in Botswana with local realities in mind: clear
              pricing, mobile-friendly tools and payment options people can
              actually use.
            </p>
          </div>
        </div>
      </section>
      <section className="about-principles">
        <div className="container about-principles-head">
          <span className="micro-label light">HOW WE BUILD</span>
          <h2>Three principles.<br />No unnecessary complexity.</h2>
        </div>
        <div className="container about-principles-grid">
          <article className="about-principle-card">
            <UsefulMark />
            <span>01</span>
            <h3>Useful before impressive</h3>
            <p>Every tool starts with a real task somebody needs to finish.</p>
          </article>
          <article className="about-principle-card">
            <PrivacyMark />
            <span>02</span>
            <h3>Private by default</h3>
            <p>File work stays on your device wherever the job allows it.</p>
          </article>
          <article className="about-principle-card">
            <GrowthMark />
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
          <span className="micro-label">YOUR NEXT DOCUMENT</span>
          <h2>Bring one unfinished job.<br />Leave with something ready.</h2>
          <Link className="btn btn-ink" to="/auth?mode=signup">
            Get started <ArrowRight />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
