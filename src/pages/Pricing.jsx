import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const benefits = [
  "CV, invoice and conversion tools",
  "Private browser-based file handling",
  "English and Setswana interface",
  "No card required to begin",
];
export default function Pricing() {
  return (
    <Layout>
      <section className="pricing-hero" data-cursor-theme="dark">
        <div className="container pricing-hero-grid">
          <div>
            <span className="micro-label light">PRICING</span>
            <h1>Pay for the pace that fits your work.</h1>
            <p>
              Try every tool for seven days, then choose occasional credits or
              unlimited monthly access. No automatic debit.
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
            <h2>Everything is open while you decide.</h2>
          </div>
          <p>No bank card. Verify your email and your trial begins.</p>
          <Link className="btn btn-ink" to="/auth?mode=signup">
            Start free <ArrowRight />
          </Link>
        </div>
        <div className="pricing-split">
          <article className="pricing-option credits-option">
            <span className="micro-label">FOR THE URGENT JOB</span>
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
            <Link className="plain-arrow" to="/payment?plan=credits">
              Buy five credits <ArrowRight />
            </Link>
          </article>
          <article className="pricing-option blue recommended-option">
            <div className="recommended-badge">BEST FOR REGULAR USE</div>
            <span className="micro-label">FOR REGULAR USE</span>
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
            <Link className="btn btn-ink" to="/payment?plan=subscription">
              Choose monthly <ArrowRight />
            </Link>
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
                Use the full seven-day trial first. You do not need a card or a
                payment to understand which tools you use most.
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
              <h3>Do unused credits expire?</h3>
              <p>No. Purchased credits remain available until you use them.</p>
            </article>
            <article>
              <h3>When is access activated?</h3>
              <p>
                Payment submissions are reviewed before credits or monthly
                access are added to your account.
              </p>
            </article>
          </div>
        </section>
      </section>
    </Layout>
  );
}
