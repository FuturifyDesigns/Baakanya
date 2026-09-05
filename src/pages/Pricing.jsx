import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAccess } from "../lib/access";
import { getAccessCta } from "../lib/accessCta";
import { getAccessDestination, isRenewalStatus } from "../lib/accessRoutes";
import { useAuth } from "../lib/auth";

const benefits = [
  "CV, invoice and conversion tools",
  "Private browser-based file handling",
  "English and Setswana interface",
  "No card required for the free trial",
];

export default function Pricing() {
  const {
    user,
    isAdmin,
    loading: authLoading,
    roleLoading,
  } = useAuth();
  const access = useAccess();
  const primaryCta = getAccessCta({
    user,
    isAdmin,
    authLoading,
    roleLoading,
    access,
  });
  const signedIn = Boolean(user);
  const renewing =
    signedIn &&
    (isRenewalStatus(access.status) ||
      access.status === "credits_available" ||
      access.isReturningUser);
  const showTrial = !signedIn || access.trialEligible === true;
  const showTrialUsed = signedIn && access.trialEligible === false;
  const renewHref =
    signedIn && getAccessDestination(access)
      ? getAccessDestination(access)
      : "/access";

  return (
    <Layout>
      <section className="pricing-hero" data-cursor-theme="dark">
        <div className="container pricing-hero-grid">
          <div>
            <span className="micro-label light">PRICING</span>
            <h1>
              {renewing
                ? "Renew or top up your Baakanya access."
                : "Clear prices. Access is chosen after you verify your account."}
            </h1>
            <p>
              {renewing
                ? signedIn && access.hasUsedTrial
                  ? "You have already used the free trial. Choose credits or monthly access below — the same prices as when you first joined."
                  : "Pick credits or monthly access to keep working. Prices stay the same whether you are topping up or starting fresh."
                : "This page shows what each option costs. After you create and verify your account, you choose free trial, credits, or monthly access before entering the workspace."}
            </p>
          </div>
          <aside className="pricing-quick-guide">
            <span>{renewing ? "RETURNING USER" : "THE QUICK ANSWER"}</span>
            <h2>{renewing ? "What fits now?" : "Which option is best?"}</h2>
            <div>
              <b>Up to 5 documents</b>
              <p>Choose credits. Pay once and keep them until you need them.</p>
            </div>
            <div>
              <b>6+ documents in 30 days</b>
              <p>Choose monthly. It is usually the better value.</p>
            </div>
            {renewing && access.hadCredits && (
              <div>
                <b>Used credits before</b>
                <p>Buy another P25 pack — your history and settings stay on your account.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
      <section className="pricing-page container">
        {showTrial ? (
          <div className="trial-banner">
            <div>
              <span>7 DAYS</span>
              <h2>Free trial is selected after verification.</h2>
            </div>
            <p>
              Pricing here is informational only. After signup and email
              verification, choose trial or paid access in the app.
            </p>
            <Link className="btn btn-ink" to={primaryCta.href}>
              {primaryCta.label} <ArrowRight />
            </Link>
          </div>
        ) : showTrialUsed ? (
          <div className="trial-banner returning-pricing-banner">
            <div>
              <span>RETURNING USER</span>
              <h2>Free trial is not available again.</h2>
            </div>
            <p>
              Your account, device or network has already used the one-time trial. Choose
              credits or monthly access to unlock the workspace again.
            </p>
            <Link className="btn btn-ink" to={renewHref}>
              Renew access <ArrowRight />
            </Link>
          </div>
        ) : null}
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
              {renewing && access.hadCredits
                ? "Top up with another pack whenever you run out."
                : "Activated from account creation or payment after trial."}
            </p>
            {signedIn && (
              <Link className="btn btn-outline pricing-option-cta" to={`${renewHref}${renewHref.includes("?") ? "&" : "?"}plan=credits`}>
                Choose credits <ArrowRight size={16} />
              </Link>
            )}
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
              {renewing && access.hadSubscription
                ? "Renew for another 30 days when your current period ends."
                : "Activated from account creation or payment after trial."}
            </p>
            {signedIn && (
              <Link
                className="btn btn-blue pricing-option-cta"
                to={`${renewHref}${renewHref.includes("?") ? "&" : "?"}plan=subscription`}
              >
                Choose monthly <ArrowRight size={16} />
              </Link>
            )}
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
            {showTrial ? (
              <article>
                <span>03</span>
                <h3>Still deciding</h3>
                <p>
                  Choose the seven-day trial during account creation. You do not
                  need a card to understand which tools you use most.
                </p>
                <b>Best fit: Free trial</b>
              </article>
            ) : (
              <article>
                <span>03</span>
                <h3>Coming back after a break</h3>
                <p>
                  If you used Baakanya before, skip the trial — credits or
                  monthly access picks up where you left off.
                </p>
                <b>Best fit: {access.hadSubscription ? "Monthly" : "Credits"}</b>
              </article>
            )}
          </div>
        </section>
        <div className="included">
          <span className="micro-label">EVERY OPTION INCLUDES</span>
          <div>
            {benefits
              .filter(
                (item) =>
                  showTrial || item !== "No card required for the free trial",
              )
              .map((item) => (
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
                {signedIn
                  ? "Open Renew access from your account or workspace, or use the buttons above."
                  : "During account creation. The pricing page only explains the costs."}
              </p>
            </article>
            <article>
              <h3>What uses a credit?</h3>
              <p>
                Confirming a finished document (CV, cover letter, invoice or
                quotation) or running a file conversion uses one credit. Opening
                the editor to edit does not. PDF and Word from the same confirmed
                draft do not charge again.
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
              <h3>Can I get another free trial?</h3>
              <p>
                {showTrial
                  ? "Each account, device and network gets one trial. After that, choose credits or monthly access."
                  : "No — the free trial is one-time per account, device and network. Returning users renew with credits or monthly access."}
              </p>
            </article>
          </div>
        </section>
      </section>
    </Layout>
  );
}
