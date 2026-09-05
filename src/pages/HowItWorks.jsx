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
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAccessCta } from "../lib/accessCta";

const cursorStops = [
  { left: "51%", top: "68%" },
  { left: "76%", top: "48%" },
  { left: "78%", top: "76%" },
  { left: "68%", top: "88%" },
];

const chapters = [
  {
    step: "01 / SIGN UP",
    title: "Create one secure workspace.",
    body: "Register with your name and email, verify your address and start the seven-day trial. No card is required.",
  },
  {
    step: "02 / CHOOSE A TOOL",
    title: "Start with what you need finished.",
    body: "Choose career documents, business paperwork or file tools. Each workspace only asks for information relevant to the job.",
  },
  {
    step: "03 / AUTOMATE",
    title: "Baakanya handles the repetitive work.",
    body: "Guided inputs, professional wording, calculations and document formatting turn your details into useful output.",
  },
  {
    step: "04 / DOWNLOAD",
    title: "Review, download and move forward.",
    body: "Get a clean PDF ready to send, print or combine with other files. The result belongs to you.",
  },
];

function DemoSignup({ active = false }) {
  return (
    <div
      className={`demo-signup-screen process-screen${active ? " is-active" : ""}`}
    >
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
      <button type="button">
        Start my free trial <ArrowRight />
      </button>
      <small className="demo-secure-note">
        <ShieldCheck /> Email verification protects your account
      </small>
    </div>
  );
}

function DemoTools({ active = false }) {
  return (
    <div
      className={`demo-tools-screen process-screen${active ? " is-active" : ""}`}
    >
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
  );
}

function DemoAutomation({ active = false }) {
  return (
    <div
      className={`demo-automation-screen process-screen${active ? " is-active" : ""}`}
    >
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
          <span>Your notes, professionally worded</span>
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
  );
}

function DemoDownload({ active = false }) {
  return (
    <div
      className={`demo-document-screen process-screen${active ? " is-active" : ""}`}
    >
      <div className="generated-page informative">
        <span>BAAKANYA / APPLICATION</span>
        <h3>Kagiso Botswana</h3>
        <p>Project Coordinator</p>
        <h4>PROFILE</h4>
        <p>
          Organised project professional with hands-on client service and
          reporting experience.
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
        <button type="button">
          <Download /> Download PDFs
        </button>
      </div>
    </div>
  );
}

const demos = [DemoSignup, DemoTools, DemoAutomation, DemoDownload];

function BrowserShell({ children }) {
  return (
    <div className="process-browser">
      <div className="browser-bar">
        <div className="browser-controls">
          <i />
          <i />
          <i />
        </div>
        <span className="browser-address">https://baakanya.co.bw/workspace</span>
      </div>
      <div className="browser-canvas">
        {children}
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const primaryCta = useAccessCta();
  const root = useRef(null);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const desktop = root.current?.querySelector(".process-desktop");
    if (!desktop) return undefined;

    let animationFrame;
    const updateChapter = () => {
      animationFrame = undefined;
      const bounds = desktop.getBoundingClientRect();
      const scrollDistance = Math.max(desktop.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(-bounds.top / scrollDistance, 0), 1);
      const nextChapter = Math.min(
        Math.round(progress * (chapters.length - 1)),
        chapters.length - 1,
      );
      setActiveChapter(nextChapter);
    };

    const handleScroll = () => {
      if (animationFrame === undefined) {
        animationFrame = window.requestAnimationFrame(updateChapter);
      }
    };

    updateChapter();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <Layout>
      <div ref={root}>
        <section className="page-hero page-hero-sky">
          <div className="container">
            <span className="micro-label">HOW BAAKANYA WORKS</span>
            <h1>From sign-up to finished document.</h1>
            <p>
              Follow the journey: create an account, choose a tool, add the
              useful details and download the result.
            </p>
          </div>
        </section>

        <section className="process-story">
          <div className="process-desktop">
            <div className="process-stage-wrap">
              <div className="process-stage container">
                <div className="process-copy">
                  {chapters.map((chapter, index) => (
                    <article
                      key={chapter.step}
                      className={`process-chapter${index === activeChapter ? " is-active" : ""}`}
                    >
                      <span>{chapter.step}</span>
                      <h2>{chapter.title}</h2>
                      <p>{chapter.body}</p>
                    </article>
                  ))}
                </div>
                <div className="process-visual">
                  <BrowserShell>
                    {demos.map((Demo, index) => (
                      <Demo
                        key={chapters[index].step}
                        active={activeChapter === index}
                      />
                    ))}
                    <div
                      className="process-cursor"
                      style={cursorStops[activeChapter]}
                    />
                  </BrowserShell>
                </div>
              </div>
            </div>
          </div>

          <div className="process-mobile container">
            {chapters.map((chapter, index) => {
              const Demo = demos[index];
              return (
                <article className="process-mobile-step" key={chapter.step}>
                  <div className="process-mobile-copy">
                    <span>{chapter.step}</span>
                    <h2>{chapter.title}</h2>
                    <p>{chapter.body}</p>
                  </div>
                  <BrowserShell>
                    <Demo active />
                  </BrowserShell>
                </article>
              );
            })}
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
              <h3>Your details stay in your control</h3>
              <p>
                Add the company details that matter to you and Baakanya formats
                them naturally for your cover letter.
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
            <Link className="btn btn-ink" to={primaryCta.href}>
              {primaryCta.label} <ArrowRight />
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
