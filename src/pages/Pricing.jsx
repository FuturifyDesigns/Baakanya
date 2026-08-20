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
      <section className="page-hero page-hero-ink">
        <div className="container">
          <span className="micro-label light">PRICING</span>
          <h1>Simple enough to decide in a minute.</h1>
          <p>
            Start with seven full-access days. Continue only if Baakanya saves
            you time.
          </p>
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
          <article className="pricing-option">
            <span className="micro-label">FOR THE URGENT JOB</span>
            <div className="big-price">
              <small>P</small>25
            </div>
            <h2>Five document credits.</h2>
            <p>Buy once, use across any tool and keep what you do not use.</p>
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
          <article className="pricing-option blue">
            <span className="micro-label">FOR REGULAR USE</span>
            <div className="big-price">
              <small>P</small>40<i>/month</i>
            </div>
            <h2>Unlimited documents.</h2>
            <p>
              For applications, client work and file admin that keeps coming
              back.
            </p>
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
      </section>
    </Layout>
  );
}
