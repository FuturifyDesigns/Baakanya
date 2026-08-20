import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  FileOutput,
  Files,
  LockKeyhole,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Layout from "../components/Layout";
import { useLanguage } from "../lib/i18n";
gsap.registerPlugin(ScrollTrigger);
const toolCards = [
  {
    number: "01",
    icon: BriefcaseBusiness,
    title: "CV + Cover Letter",
    desc: "Turn your experience into an ATS-friendly CV and a tailored cover letter.",
    tag: "Smart writing",
    path: "/tools/career",
    color: "blue",
  },
  {
    number: "02",
    icon: FileOutput,
    title: "Invoice & Quotation",
    desc: "Create polished invoices, calculate VAT and keep track of what is paid.",
    tag: "Instant PDF",
    path: "/tools/invoice",
    color: "dark",
  },
  {
    number: "03",
    icon: Files,
    title: "File Converter",
    desc: "Convert Word or images to PDF, or combine PDFs in the order you need.",
    tag: "Private & local",
    path: "/tools/convert",
    color: "pale",
  },
];
export default function Landing() {
  const root = useRef(null);
  const { t } = useLanguage();
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-copy > *", {
        y: 28,
        opacity: 0,
        stagger: 0.09,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from(".paper-stack", {
        x: 55,
        rotate: 4,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });
      gsap.utils.toArray(".reveal").forEach((el) =>
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: "top 86%" },
          y: 30,
          opacity: 0,
          duration: 0.7,
        }),
      );
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <Layout>
      <div ref={root}>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="flag-dot" />
                {t.eyebrow}
              </div>
              <h1>{t.hero}</h1>
              <p className="hero-sub">{t.sub}</p>
              <div className="hero-actions">
                <Link className="btn btn-blue" to="/auth?mode=signup">
                  {t.start}
                  <ArrowRight size={18} />
                </Link>
                <a className="text-link" href="#tools">
                  {t.explore}
                  <ArrowRight size={16} />
                </a>
              </div>
              <p className="trust">
                <LockKeyhole size={15} />
                {t.trust}
              </p>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="paper-stack">
                <div className="paper paper-back">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="paper paper-main">
                  <div className="paper-head">
                    <div className="avatar">KB</div>
                    <div>
                      <b>Kagiso B.</b>
                      <small>Project Coordinator</small>
                    </div>
                  </div>
                  <div className="paper-rule dark" />
                  <div className="paper-rule long" />
                  <div className="paper-rule" />
                  <div className="paper-rule short" />
                  <div className="paper-section">EXPERIENCE</div>
                  <div className="paper-rule dark medium" />
                  <div className="paper-rule long" />
                  <div className="paper-rule" />
                  <div className="approved">
                    <BadgeCheck />
                    Ready to send
                  </div>
                </div>
                <div className="mini-card">
                  <Sparkles size={18} />
                  <span>
                    <b>Cover letter</b>
                    <small>Tailored to the role</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="ticker">
          <div className="container ticker-inner">
            <span>
              <Check />
              Professional PDFs
            </span>
            <span>
              <Check />
              Works on any device
            </span>
            <span>
              <Check />
              Botswana VAT ready
            </span>
            <span>
              <Check />
              English + Setswana
            </span>
          </div>
        </section>
        <section id="tools" className="section container">
          <div className="section-head reveal">
            <div>
              <span className="kicker">ONE PLACE. LESS ADMIN.</span>
              <h2>Get it done, then get on with your day.</h2>
            </div>
            <p>
              Purpose-built tools for the documents Batswana create and send
              every day.
            </p>
          </div>
          <div className="tool-grid">
            {toolCards.map(({ icon: Icon, ...tool }) => (
              <Link
                to={tool.path}
                className={`tool-card ${tool.color} reveal`}
                key={tool.title}
              >
                <div className="tool-top">
                  <span>{tool.number}</span>
                  <div className="tool-icon">
                    <Icon />
                  </div>
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.desc}</p>
                <div className="tool-bottom">
                  <span>{tool.tag}</span>
                  <ArrowRight />
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section id="how" className="how">
          <div className="container how-grid">
            <div className="reveal">
              <span className="kicker light">SIMPLE BY DESIGN</span>
              <h2>From blank page to done in minutes.</h2>
              <p>
                No complicated software. No formatting battles. Just answer a
                few questions and download a clean result.
              </p>
              <Link className="btn btn-white" to="/workspace">
                Open your workspace
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="steps">
              {[
                [
                  "1",
                  "Choose a tool",
                  "Pick the document job you need to finish.",
                ],
                [
                  "2",
                  "Add your details",
                  "Use a short, guided form — we handle the layout.",
                ],
                [
                  "3",
                  "Download & send",
                  "Get a polished PDF ready to print, share or merge.",
                ],
              ].map((x) => (
                <div className="step reveal" key={x[0]}>
                  <span>{x[0]}</span>
                  <div>
                    <h3>{x[1]}</h3>
                    <p>{x[2]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="pricing" className="section pricing container">
          <div className="pricing-intro reveal">
            <span className="kicker">STRAIGHTFORWARD PRICING</span>
            <h2>Start free. Pay only when Baakanya earns its keep.</h2>
            <p>
              Every new account gets the complete toolkit for seven days. No
              card, no surprise debit.
            </p>
          </div>
          <div className="price-grid">
            <article className="price-card reveal">
              <span className="price-label">ONCE-OFF</span>
              <div className="price">
                <small>P</small>25
              </div>
              <h3>5 document credits</h3>
              <p>
                For an urgent application, invoice or file job. Credits never
                expire.
              </p>
              <ul>
                <li>
                  <Check />
                  Use across all tools
                </li>
                <li>
                  <Check />
                  No monthly commitment
                </li>
                <li>
                  <Check />
                  Keep unused credits
                </li>
              </ul>
              <Link className="btn btn-outline" to="/payment?plan=credits">
                Buy credits
              </Link>
            </article>
            <article className="price-card featured reveal">
              <div className="popular">BEST VALUE</div>
              <span className="price-label">MONTHLY</span>
              <div className="price">
                <small>P</small>40<span>/month</span>
              </div>
              <h3>Unlimited documents</h3>
              <p>
                For regular applications, business documents and everyday file
                admin.
              </p>
              <ul>
                <li>
                  <Check />
                  Unlimited use of all tools
                </li>
                <li>
                  <Check />
                  7-day full-access trial
                </li>
                <li>
                  <Check />
                  Cancel by not renewing
                </li>
              </ul>
              <Link className="btn btn-blue" to="/auth?mode=signup">
                Start 7 days free
              </Link>
            </article>
          </div>
        </section>
        <section className="closing">
          <div className="container closing-card reveal">
            <div>
              <Zap />
              <span>BAAKANYA</span>
            </div>
            <h2>
              Less time fighting documents.
              <br />
              More time moving forward.
            </h2>
            <Link className="btn btn-ink" to="/auth?mode=signup">
              Start free today
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
