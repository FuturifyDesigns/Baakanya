import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Layout from "../components/Layout";

const updated = "6 September 2026";

export default function Privacy() {
  return (
    <Layout>
      <section className="legal-hero" data-cursor-theme="light">
        <div className="container legal-hero-grid">
          <div>
            <span className="micro-label">PRIVACY AT BAAKANYA</span>
            <h1>Your information,<br /><em>handled with care.</em></h1>
            <p>
              This policy explains what Baakanya collects, why we use it, who
              helps us process it, and the choices available to you.
            </p>
          </div>
          <div className="legal-hero-card">
            <ShieldCheck aria-hidden="true" />
            <b>Plain-language privacy</b>
            <span>Effective and last reviewed: {updated}</span>
          </div>
        </div>
      </section>

      <div className="container legal-layout">
        <aside className="legal-toc" aria-label="Privacy policy contents">
          <span>ON THIS PAGE</span>
          <a href="#controller">Who is responsible</a>
          <a href="#collect">What we collect</a>
          <a href="#use">How we use it</a>
          <a href="#sharing">Service providers</a>
          <a href="#rights">Your rights</a>
          <a href="#contact">Contact us</a>
        </aside>

        <article className="legal-document">
          <section id="controller">
            <span className="legal-number">01</span>
            <h2>Who is responsible for your information</h2>
            <p>
              Baakanya is operated by Futurify Designs in Gaborone, Botswana.
              For the personal data described here, we act as the data
              controller. This policy is intended to support our obligations
              under Botswana's Data Protection Act, 2024 (Act No. 18 of 2024),
              which commenced on 14 January 2025.
            </p>
          </section>

          <section id="collect">
            <span className="legal-number">02</span>
            <h2>Information we collect</h2>
            <div className="legal-cards">
              <div><b>Account and identity</b><p>Name, email address, authentication identifiers, profile details and, when you choose Google sign-in, identity details Google makes available such as your name and email.</p></div>
              <div><b>Documents and activity</b><p>Information you enter into document tools, document history and generation records. Some tools work in your browser; features that require conversion or storage send the necessary file or data to our service.</p></div>
              <div><b>Payments and support</b><p>Your selected plan, payment method, transaction details, receipt image, review status, and information you include in support or automation requests.</p></div>
              <div><b>Security and access</b><p>IP-derived and device-derived identifiers, installation identifiers, user-agent information, timestamps, and security events. Where practical, these identifiers are protected with one-way keyed hashing.</p></div>
            </div>
            <p>
              We also use essential browser storage for sign-in sessions,
              security, language and workspace continuity. We do not use this
              storage for third-party advertising.
            </p>
          </section>

          <section id="use">
            <span className="legal-number">03</span>
            <h2>Why and how we use it</h2>
            <ul>
              <li>Provide accounts, document tools, downloads and support.</li>
              <li>Process access selections and manually verify payments.</li>
              <li>Enforce the one-trial rule and prevent fraud, misuse and account switching.</li>
              <li>Keep the service secure, reliable and understandable.</li>
              <li>Comply with legal, accounting and regulatory obligations.</li>
            </ul>
            <p>
              Depending on the context, we process information to perform our
              agreement with you, with your consent, to meet legal obligations,
              or for legitimate interests such as service security and fraud
              prevention. You may withdraw consent where consent is the basis,
              without affecting earlier lawful processing.
            </p>
          </section>

          <section id="sharing">
            <span className="legal-number">04</span>
            <h2>Service providers and international processing</h2>
            <p>
              We use carefully selected providers for authentication, database
              and file storage, content delivery and security, Google sign-in,
              email delivery and document conversion. They receive only the
              information needed for their function and process it under their
              own contractual and security obligations. A document submitted
              for server-based conversion may be transferred to a specialist
              conversion provider and is not intended to be kept after the
              conversion finishes.
            </p>
            <p>
              Some providers may process information outside Botswana. Where
              personal data is transferred internationally, we use appropriate
              contractual, technical and organisational safeguards and assess
              the transfer as required by applicable law. We do not sell your
              personal information.
            </p>
          </section>

          <section>
            <span className="legal-number">05</span>
            <h2>Retention and security</h2>
            <p>
              We keep account and service records only as long as needed for
              the purposes above and applicable legal obligations. Payment and
              accounting records are retained for the legally required period.
              Temporary conversion files are removed after processing wherever
              the service permits. Pseudonymous trial identifiers may be kept
              while the one-trial programme remains in operation so that a
              deleted or replacement account cannot restart the same trial.
            </p>
            <p>
              We use encrypted transport, access controls, private storage,
              row-level database rules, rate limits and restricted
              administrative access. No online system is risk-free; if a breach
              creates a legally reportable risk, we will notify the appropriate
              authority and affected people as required.
            </p>
          </section>

          <section id="rights">
            <span className="legal-number">06</span>
            <h2>Your data-protection rights</h2>
            <p>
              Subject to the Act and lawful exceptions, you may ask us to
              confirm whether we hold your data; access it; correct incomplete
              or inaccurate data; erase it; restrict or object to processing;
              receive portable data where applicable; and withdraw consent.
              You may also object to a decision based only on automated
              processing where the law gives that right.
            </p>
            <p>
              We may need to verify your identity before completing a request.
              You may also raise a complaint with Botswana's Information and
              Data Protection Commission or pursue another remedy available
              under Botswana law.
            </p>
          </section>

          <section>
            <span className="legal-number">07</span>
            <h2>Children and policy updates</h2>
            <p>
              Baakanya is not directed to children. A person who cannot legally
              agree to these terms must use the service only with permission
              and supervision from a parent or legal guardian. We may update
              this policy when the service or law changes; the current version
              and review date will always appear on this page.
            </p>
          </section>

          <section id="contact" className="legal-contact">
            <LockKeyhole aria-hidden="true" />
            <div><span className="micro-label">PRIVACY REQUESTS</span><h2>Ask, correct or delete.</h2><p>Email us from the address connected to your account and describe your request.</p></div>
            <a className="btn btn-ink" href="mailto:futurifydesigns@gmail.com?subject=Baakanya%20privacy%20request"><Mail /> Email privacy contact</a>
          </section>
        </article>
      </div>
    </Layout>
  );
}
