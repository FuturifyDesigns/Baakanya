import { ArrowRight, Check, Download, Search, UploadCloud } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Layout from "../components/Layout";

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks() {
  const root = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const chapters = gsap.utils.toArray(".process-chapter");
      gsap.set(chapters.slice(1), { autoAlpha: 0, y: 24 });
      let activeChapter = -1;
      const showChapter = (index) => {
        if (index === activeChapter) return;
        activeChapter = index;
        chapters.forEach((chapter, i) => {
          if (i === index)
            gsap.to(chapter, {
              autoAlpha: 1,
              y: 0,
              duration: 0.25,
              overwrite: true,
            });
          else
            gsap.to(chapter, {
              autoAlpha: 0,
              y: -18,
              duration: 0.2,
              overwrite: true,
            });
        });
      };
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".process-story",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
          onUpdate: (self) =>
            showChapter(Math.min(3, Math.floor(self.progress * 4))),
        },
      });
      tl.to(".demo-fill", { width: "84%", stagger: 0.08, duration: 0.7 })
        .to(".process-cursor", { x: 95, y: 55, duration: 0.35 }, 0.1)
        .to(
          ".demo-form-screen",
          { xPercent: -120, opacity: 0, duration: 0.7 },
          1,
        )
        .fromTo(
          ".demo-research-screen",
          { xPercent: 120, opacity: 0 },
          { xPercent: 0, opacity: 1, duration: 0.7 },
          1,
        )
        .to(
          ".research-ring",
          { scale: 1.75, opacity: 0, repeat: 2, duration: 0.35 },
          1.25,
        )
        .to(
          ".demo-research-screen",
          { xPercent: -120, opacity: 0, duration: 0.7 },
          2,
        )
        .fromTo(
          ".demo-document-screen",
          { xPercent: 120, opacity: 0 },
          { xPercent: 0, opacity: 1, duration: 0.7 },
          2,
        )
        .from(
          ".generated-line",
          { scaleX: 0, transformOrigin: "left", stagger: 0.06, duration: 0.45 },
          2.25,
        )
        .to(".demo-document-screen", { scale: 0.92, y: -25, duration: 0.55 }, 3)
        .fromTo(
          ".demo-download",
          { y: 70, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 },
          3.05,
        );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <Layout>
      <div ref={root}>
        <section className="page-hero page-hero-sky">
          <div className="container">
            <span className="micro-label">HOW BAAKANYA WORKS</span>
            <h1>Watch a document come together.</h1>
            <p>
              Keep scrolling. The demonstration follows the same four steps you
              use inside the workspace.
            </p>
          </div>
        </section>
        <section className="process-story">
          <div className="process-stage container">
            <div className="process-copy">
              <article className="process-chapter">
                <span>01 / CHOOSE</span>
                <h2>Start with the outcome.</h2>
                <p>
                  Choose a CV, invoice or file job. Baakanya opens only the
                  fields that matter.
                </p>
              </article>
              <article className="process-chapter">
                <span>02 / ADD</span>
                <h2>Give us the useful details.</h2>
                <p>
                  A short guided form replaces blank-page anxiety and formatting
                  decisions.
                </p>
              </article>
              <article className="process-chapter">
                <span>03 / SORT</span>
                <h2>Baakanya does the document work.</h2>
                <p>
                  Company context, calculations and clean layout happen behind
                  one calm screen.
                </p>
              </article>
              <article className="process-chapter">
                <span>04 / MOVE</span>
                <h2>Download and get on with it.</h2>
                <p>
                  Your finished PDF stays ready to send, print or merge with
                  supporting documents.
                </p>
              </article>
            </div>
            <div className="process-visual">
              <div className="process-browser">
                <div className="browser-bar">
                  <i />
                  <i />
                  <i />
                  <span>baakanya / career documents</span>
                </div>
                <div className="browser-canvas">
                  <div className="demo-form-screen">
                    <span className="demo-kicker">YOUR DETAILS</span>
                    <h3>Tell us what you’re applying for.</h3>
                    {["Target role", "Company", "Experience", "Skills"].map(
                      (label) => (
                        <div className="demo-field" key={label}>
                          <span>{label}</span>
                          <i className="demo-fill" />
                        </div>
                      ),
                    )}
                    <button>
                      Continue <ArrowRight />
                    </button>
                  </div>
                  <div className="demo-research-screen">
                    <div className="research-orbit">
                      <div className="research-ring" />
                      <Search />
                    </div>
                    <span>SEARCHING PUBLIC SOURCES</span>
                    <h3>Learning what the company values.</h3>
                    <div className="search-result">
                      <Check />
                      Official website found
                    </div>
                    <div className="search-result">
                      <Check />
                      Relevant company detail selected
                    </div>
                  </div>
                  <div className="demo-document-screen">
                    <div className="generated-page">
                      <span>BAAKANYA / APPLICATION</span>
                      <h3>Kagiso B.</h3>
                      <p>Project Coordinator</p>
                      {[95, 72, 86, 55, 90, 70].map((w, i) => (
                        <i
                          className="generated-line"
                          style={{ width: `${w}%` }}
                          key={i}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="demo-download">
                    <div>
                      <Check />
                      Your documents are ready
                    </div>
                    <button>
                      <Download />
                      Download PDF
                    </button>
                  </div>
                  <div className="process-cursor" />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="process-notes">
          <div className="container process-notes-grid">
            <div>
              <UploadCloud />
              <h3>Uploads stay private</h3>
              <p>
                Conversion work happens on your device. Payment receipts use
                private Supabase storage.
              </p>
            </div>
            <div>
              <Search />
              <h3>Research is deliberate</h3>
              <p>
                Company search only runs when you choose it and only adds
                public, relevant context.
              </p>
            </div>
            <div>
              <Download />
              <h3>The output is yours</h3>
              <p>
                Download clean PDFs that are ready to send, print or combine.
              </p>
            </div>
          </div>
        </section>
        <section className="simple-cta blue">
          <div className="container">
            <h2>Ready to make one?</h2>
            <Link className="btn btn-ink" to="/workspace">
              Open your workspace <ArrowRight />
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
