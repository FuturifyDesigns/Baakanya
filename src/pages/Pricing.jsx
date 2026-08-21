import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const benefits = [
  "CV, invoice and conversion tools",
  "Private browser-based file handling",
  "English and Setswana interface",
  "No card required for the free trial",
];

export default function Pricing() {
  return (
    <Layout>
      <section className="pricing-hero" data-cursor-theme="dark">
        <div className="container pricing-hero-grid">
          <div>
            <span className="micro-label light">PRICING</span>
            <h1>Clear prices. Access is chosen when you create an account.</h1>
            <p>
              This page shows what each option costs. During account creation
              you choose free trial, credits, or monthly access before entering
              the workspace.
            </p>
          </div>
          <aside className="pricing-quick-guide">
            <span>THE QUICK ANSWER</span>
            <h2>Which option is best?</h2>
            <div>
              <b>Up to 5 documents</b>
              <p>Choose credits. Pay once and keep them until you need them.</p>
            </div>
            <div>
              <b>6+ documents in 30 days</b>
              <p>Choose monthly. It is usually the better value.</p>
            </div>
          </aside>
        </div>
      </section>
      <section className="pricing-page container">
        <div className="trial-banner">
          <div>
            <span>7 DAYS</span>
            <h2>Free trial is selected at signup.</h2>
          </div>
          <p>
            Pricing here is informational only. Activate trial or paid access
            when you create your account.
          </p>
          <Link className="btn btn-ink" to="/auth?mode=signup">
            Create account <ArrowRight />
          </Link>
        </div>
        <div className="pricing-split">
          <article className="pricing-option credits-option">
            <span className="micro-label">CREDITS</span>
            <div className="big-price">
              <small>P</small>25
            </div>
            <h2>Five document credits.</h2>
            <p>Buy once, use across any tool and keep what you do not use.</p>
            <div className="price-math">P5 per credit</div>
            <ul>
              <li>
                <Check />
                No expiry
              </li>
              <li>
                <Check />
                No recurring payment
              </li>
              <li>
                <Check />
                Shared across all tools
              </li>
            </ul>
            <p className="pricing-note">
              Activated from account creation or payment after trial.
            </p>
          </article>
          <article className="pricing-option blue recommended-option">
            <div className="recommended-badge">BEST FOR REGULAR USE</div>
            <span className="micro-label">MONTHLY</span>
            <div className="big-price">
              <small>P</small>40<i>/month</i>
            </div>
            <h2>Unlimited documents.</h2>
            <p>
              For applications, client work and file admin that keeps coming
              back.
            </p>
            <div className="price-math">Unlimited use for 30 days</div>
            <ul>
              <li>
                <Check />
                Unlimited tool use
              </li>
              <li>
                <Check />
                Manual monthly renewal
              </li>
              <li>
                <Check />
                No automatic debit
              </li>
            </ul>
            <p className="pricing-note">
              Activated from account creation or payment after trial.
            </p>
          </article>
        </div>
        <section className="pricing-scenarios">
          <div className="pricing-section-head">
            <span className="micro-label">CHOOSE BY SITUATION</span>
            <h2>A practical way to decide.</h2>
          </div>
          <div className="pricing-scenario-grid">
            <article>
              <span>01</span>
              <h3>One job application</h3>
              <p>
                A CV, cover letter and a few file conversions fit comfortably
                inside five credits.
              </p>
              <b>Best fit: Credits</b>
            </article>
            <article>
              <span>02</span>
              <h3>Frequent client work</h3>
              <p>
                If invoices, quotations or applications arrive every week,
                monthly access removes the need to count documents.
              </p>
              <b>Best fit: Monthly</b>
            </article>
            <article>
              <span>03</span>
              <h3>Still deciding</h3>
              <p>
                Choose the seven-day trial during account creation. You do not
                need a card to understand which tools you use most.
              </p>
              <b>Best fit: Free trial</b>
            </article>
          </div>
        </section>
        <div className="included">
          <span className="micro-label">EVERY OPTION INCLUDES</span>
          <div>
            {benefits.map((item) => (
              <p key={item}>
                <Check />
                {item}
              </p>
            ))}
          </div>
        </div>
        <section className="pricing-faq">
          <div className="pricing-section-head">
            <span className="micro-label">GOOD TO KNOW</span>
            <h2>Clear before you pay.</h2>
          </div>
          <div className="pricing-faq-list">
            <article>
              <h3>Where do I activate a plan?</h3>
              <p>
                During account creation. The pricing page only explains the
                costs.
              </p>
            </article>
            <article>
              <h3>What uses a credit?</h3>
              <p>
                Each document-generation or file-conversion action uses one
                credit. Your remaining balance stays on your account.
              </p>
            </article>
            <article>
              <h3>Does monthly access renew automatically?</h3>
              <p>
                No. Monthly access lasts 30 days and only renews when you make
                another payment.
              </p>
            </article>
            <article>
              <h3>What happens when the trial ends?</h3>
              <p>
                You are removed from the workspace until you pay for credits or
                monthly access.
              </p>
            </article>
          </div>
        </section>
      </section>
    </Layout>
  );
}
