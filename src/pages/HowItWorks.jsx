import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Download,
  FileOutput,
  Files,
  Search,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
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
      const panels = gsap.utils.toArray(".process-screen");
      const cursorStops = [
        { left: "51%", top: "68%" },
        { left: "76%", top: "48%" },
        { left: "78%", top: "76%" },
        { left: "68%", top: "88%" },
      ];
      gsap.set(chapters.slice(1), { autoAlpha: 0, y: 24 });
      gsap.set(panels.slice(1), { autoAlpha: 0, xPercent: 18 });
      gsap.set(".process-cursor", cursorStops[0]);
      let activeChapter = 0;
      const showChapter = (index) => {
        if (index === activeChapter) return;
        activeChapter = index;
        chapters.forEach((chapter, i) => {
          if (i === index)
            gsap.to(chapter, {
              autoAlpha: 1,
              y: 0,
              duration: 0.32,
              overwrite: true,
            });
          else
            gsap.to(chapter, {
              autoAlpha: 0,
              y: -18,
              duration: 0.25,
              overwrite: true,
            });
        });
        panels.forEach((panel, i) => {
          gsap.to(panel, {
            autoAlpha: i === index ? 1 : 0,
            xPercent: i === index ? 0 : i < index ? -18 : 18,
            duration: 0.42,
            overwrite: true,
          });
        });
        gsap.to(".process-cursor", {
          ...cursorStops[index],
          duration: 0.55,
          ease: "power2.inOut",
          overwrite: true,
          onComplete: () =>
            gsap.fromTo(
              ".process-cursor",
              { scale: 1 },
              { scale: 0.72, yoyo: true, repeat: 1, duration: 0.12 },
            ),
        });
      };
      ScrollTrigger.create({
        trigger: ".process-story",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.7,
        onUpdate: (self) =>
          showChapter(Math.min(3, Math.floor(self.progress * 4))),
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <Layout>
      <div ref={root}>
        <section className="page-hero page-hero-sky">
          <div className="container">
            <span className="micro-label">HOW BAAKANYA WORKS</span>
            <h1>From sign-up to finished document.</h1>
            <p>
              Scroll through the real journey: create an account, choose a tool,
              add the useful details and download the result.
            </p>
          </div>
        </section>
        <section className="process-story">
          <div className="process-stage container">
            <div className="process-copy">
              <article className="process-chapter">
                <span>01 / SIGN UP</span>
                <h2>Create one secure workspace.</h2>
                <p>
                  Register with your name and email, verify your address and
                  start the seven-day trial. No card is required.
                </p>
              </article>
              <article className="process-chapter">
                <span>02 / CHOOSE A TOOL</span>
                <h2>Start with what you need finished.</h2>
                <p>
                  Choose career documents, business paperwork or file tools.
                  Each workspace only asks for information relevant to the job.
                </p>
              </article>
              <article className="process-chapter">
                <span>03 / AUTOMATE</span>
                <h2>Baakanya handles the repetitive work.</h2>
                <p>
                  Guided inputs, public company research, calculations and
                  document formatting turn your details into useful output.
                </p>
              </article>
              <article className="process-chapter">
                <span>04 / DOWNLOAD</span>
                <h2>Review, download and move forward.</h2>
                <p>
                  Get a clean PDF ready to send, print or combine with other
                  files. The result belongs to you.
                </p>
              </article>
            </div>
            <div className="process-visual">
              <div className="process-browser">
                <div className="browser-bar">
                  <div className="browser-controls">
                    <i />
                    <i />
                    <i />
                  </div>
                  <span className="browser-address">
                    https://baakanya.co.bw/#/workspace
                  </span>
                </div>
                <div className="browser-canvas">
                  <div className="demo-signup-screen process-screen">
                    <span className="demo-kicker">START FREE</span>
                    <h3>Create your Baakanya account</h3>
                    <div className="demo-real-field">
                      <span>Full name</span>
                      <b>Kagiso Botswana</b>
                    </div>
                    <div className="demo-real-field">
                      <span>Email address</span>
                      <b>kagiso@example.com</b>
                    </div>
                    <div className="demo-real-field">
                      <span>Password</span>
                      <b>••••••••••••</b>
                    </div>
                    <button>
                      Start my free trial <ArrowRight />
                    </button>
                    <small className="demo-secure-note">
                      <ShieldCheck /> Email verification protects your account
                    </small>
                  </div>

                  <div className="demo-tools-screen process-screen">
                    <span className="demo-kicker">MY WORKSPACE</span>
                    <h3>What do you need to finish?</h3>
                    <div className="demo-tool-choice selected">
                      <BriefcaseBusiness />
                      <div>
                        <b>Career documents</b>
                        <span>CV and tailored cover letter</span>
                      </div>
                      <Check />
                    </div>
                    <div className="demo-tool-choice">
                      <FileOutput />
                      <div>
                        <b>Invoice or quotation</b>
                        <span>Totals, VAT and client-ready PDF</span>
                      </div>
                    </div>
                    <div className="demo-tool-choice">
                      <Files />
                      <div>
                        <b>Convert and merge</b>
                        <span>Images, Word and PDF files</span>
                      </div>
                    </div>
                  </div>

                  <div className="demo-automation-screen process-screen">
                    <span className="demo-kicker">CAREER AUTOMATION</span>
                    <h3>Turn the job details into an application.</h3>
                    <div className="automation-facts">
                      <div>
                        <span>Target role</span>
                        <b>Project Coordinator</b>
                      </div>
                      <div>
                        <span>Company</span>
                        <b>Futurify Designs</b>
                      </div>
                      <div>
                        <span>Strongest skills</span>
                        <b>Planning · Client care · Excel</b>
                      </div>
                    </div>
                    <div className="automation-action">
                      <Search />
                      <div>
                        <b>Company context added</b>
                        <span>Public, relevant information only</span>
                      </div>
                      <Check />
                    </div>
                    <div className="automation-action">
                      <FileOutput />
                      <div>
                        <b>CV and cover letter formatted</b>
                        <span>ATS-friendly and ready to review</span>
                      </div>
                      <Check />
                    </div>
                  </div>

                  <div className="demo-document-screen process-screen">
                    <div className="generated-page informative">
                      <span>BAAKANYA / APPLICATION</span>
                      <h3>Kagiso Botswana</h3>
                      <p>Project Coordinator</p>
                      <h4>PROFILE</h4>
                      <p>
                        Organised project professional with hands-on client
                        service and reporting experience.
                      </p>
                      <h4>CORE SKILLS</h4>
                      <ul>
                        <li>Project planning and coordination</li>
                        <li>Client communication</li>
                        <li>Excel reporting</li>
                      </ul>
                    </div>
                    <div className="demo-download visible-download">
                      <div>
                        <Check /> Your documents are ready
                      </div>
                      <button>
                        <Download /> Download PDFs
                      </button>
                    </div>
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
            <Link className="btn btn-ink" to="/auth?mode=signup">
              Open your workspace <ArrowRight />
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
