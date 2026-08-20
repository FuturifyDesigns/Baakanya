import { ArrowRight, Check, FileText, MoveRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Layout from "../components/Layout";
import { useLanguage } from "../lib/i18n";

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const root = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".editorial-hero-copy > *", {
        y: 50,
        opacity: 0,
        stagger: 0.11,
        duration: 0.9,
        ease: "power3.out",
      });
      gsap.from(".hero-document", {
        y: 90,
        rotate: 7,
        opacity: 0,
        duration: 1.15,
        ease: "power3.out",
      });
      gsap.to(".hero-document", {
        yPercent: -13,
        rotate: -2,
        scrollTrigger: { trigger: ".editorial-hero", scrub: 1.1 },
      });
      gsap.utils.toArray(".motion-line").forEach((line) =>
        gsap.from(line, {
          y: 70,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: line, start: "top 86%" },
        }),
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <Layout>
      <div ref={root} className="new-home">
        <section className="editorial-hero">
          <div className="container editorial-hero-grid">
            <div className="editorial-hero-copy">
              <span className="micro-label">{t.eyebrow}</span>
              <h1>
                Prepare.
                <br />
                Sort.
                <br />
                <em>Move.</em>
              </h1>
              <p>{t.sub}</p>
              <div className="hero-actions">
                <Link className="btn btn-ink" to="/auth?mode=signup">
                  {t.start} <ArrowRight size={18} />
                </Link>
                <Link className="plain-arrow" to="/how-it-works">
                  See how it works <MoveRight />
                </Link>
              </div>
            </div>
            <div className="hero-object" aria-hidden="true">
              <div className="hero-sun" />
              <div className="hero-document">
                <div className="document-fold" />
                <div className="doc-word">BAAKANYA / 01</div>
                <div className="doc-name">Kagiso B.</div>
                <div className="doc-role">Project coordinator</div>
                <div className="doc-rule strong" />
                <div className="doc-rule" />
                <div className="doc-rule short" />
                <div className="doc-section">EXPERIENCE</div>
                <div className="doc-rule strong medium" />
                <div className="doc-rule" />
                <div className="doc-rule short" />
                <div className="doc-stamp">
                  <Check /> Ready
                </div>
              </div>
              <div className="hero-chip chip-one">PDF</div>
              <div className="hero-chip chip-two">ATS</div>
            </div>
          </div>
        </section>

        <section className="home-statement container">
          <p className="motion-line">
            Paperwork should not stand between you and your next move.
          </p>
          <div className="statement-meta motion-line">
            <span>Built for Botswana</span>
            <p>
              Baakanya turns document admin into a short, clear process that
              works on the phone already in your hand.
            </p>
          </div>
        </section>

        <section className="home-tools-intro">
          <div className="container">
            <span className="micro-label light">
              THREE JOBS. ONE CALM WORKSPACE.
            </span>
            <h2 className="motion-line">
              Choose the thing you need to finish.
            </h2>
          </div>
          <Link className="home-tool-row sky motion-line" to="/tools/career">
            <span>01</span>
            <h3>Apply for the role</h3>
            <p>CV + cover letter</p>
            <ArrowRight />
          </Link>
          <Link className="home-tool-row ink motion-line" to="/tools/invoice">
            <span>02</span>
            <h3>Bill the client</h3>
            <p>Invoices + quotations</p>
            <ArrowRight />
          </Link>
          <Link className="home-tool-row sand motion-line" to="/tools/convert">
            <span>03</span>
            <h3>Get the file ready</h3>
            <p>Convert + merge PDFs</p>
            <ArrowRight />
          </Link>
          <div className="container explore-all motion-line">
            <Link className="plain-arrow" to="/tools">
              Explore all tools <MoveRight />
            </Link>
          </div>
        </section>

        <section className="process-callout">
          <div className="container process-callout-grid">
            <div className="motion-line">
              <span className="micro-label light">
                WATCH THE WORK DISAPPEAR
              </span>
              <h2>From details to a finished document.</h2>
              <p>
                Scroll through the complete Baakanya process and see exactly
                what happens before you start.
              </p>
              <Link className="btn btn-white" to="/how-it-works">
                Play the process <ArrowRight />
              </Link>
            </div>
            <div className="mini-process motion-line" aria-hidden="true">
              <div>
                <span>1</span>
                <FileText /> Add details
              </div>
              <i />
              <div>
                <span>2</span>
                <div className="mini-spinner" /> Baakanya sorts
              </div>
              <i />
              <div>
                <span>3</span>
                <Check /> Download
              </div>
            </div>
          </div>
        </section>

        <section className="home-final container">
          <h2 className="motion-line">One less thing hanging over you.</h2>
          <Link className="btn btn-blue motion-line" to="/auth?mode=signup">
            Start seven days free <ArrowRight />
          </Link>
        </section>
      </div>
    </Layout>
  );
}
