import { ArrowRight, FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const updated = "6 September 2026";

export default function Terms() {
  return (
    <Layout>
      <section className="legal-hero legal-hero-terms" data-cursor-theme="light">
        <div className="container legal-hero-grid">
          <div>
            <span className="micro-label">TERMS OF USE</span>
            <h1>Clear terms.<br /><em>Useful tools.</em></h1>
            <p>These terms explain the agreement between you and Baakanya when you create an account or use the service.</p>
          </div>
          <div className="legal-hero-card"><FileCheck2 aria-hidden="true" /><b>A fair, practical agreement</b><span>Effective and last reviewed: {updated}</span></div>
        </div>
      </section>

      <div className="container legal-layout">
        <aside className="legal-toc" aria-label="Terms contents">
          <span>ON THIS PAGE</span>
          <a href="#agreement">The agreement</a>
          <a href="#accounts">Accounts and access</a>
          <a href="#payments">Payments</a>
          <a href="#documents">Your documents</a>
          <a href="#acceptable-use">Acceptable use</a>
          <a href="#contact">Contact</a>
        </aside>

        <article className="legal-document">
          <section id="agreement"><span className="legal-number">01</span><h2>The agreement</h2><p>Baakanya is a document workspace operated by Futurify Designs in Gaborone, Botswana. By creating an account, selecting “Continue with Google,” purchasing access or using the service, you agree to these Terms and acknowledge our <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the service.</p><p>You must be legally able to enter this agreement. If you use Baakanya for an organisation, you confirm that you have authority to bind it.</p></section>

          <section id="accounts"><span className="legal-number">02</span><h2>Accounts, security and access</h2><ul><li>Provide accurate information and keep your login details secure.</li><li>Tell us promptly if you suspect unauthorised access.</li><li>One person may receive only one free trial. We may use account, device and network signals to prevent repeat trials or account switching.</li><li>Do not share, sell or transfer access in a way that bypasses a plan limit.</li></ul><p>We may temporarily restrict access to investigate fraud, protect users, comply with law, perform maintenance or address a serious breach of these Terms. We will act reasonably and restore access when the reason is resolved.</p></section>

          <section id="payments"><span className="legal-number">03</span><h2>Trials, credits and payments</h2><p>The current pricing page forms part of these Terms. A trial is promotional, limited to one eligible person and may be changed or withdrawn for future users. Document credits are used for the actions described at purchase. Monthly access lasts for the stated period and does not automatically renew unless the checkout expressly says otherwise.</p><p>Where payment is verified manually, access begins only after approval. You are responsible for submitting a genuine, legible receipt. If a payment is rejected or appears fraudulent, access will not be granted. Statutory consumer rights and remedies under Botswana law are not excluded by these Terms.</p></section>

          <section id="documents"><span className="legal-number">04</span><h2>Your content and generated documents</h2><p>You keep ownership of content you submit. You give us a limited permission to process it only as needed to provide, secure and improve the requested service. You confirm that you have the right to use submitted content and that it does not violate another person's rights or the law.</p><p>Templates, generated wording and converted files are practical assistance, not legal, financial, medical, employment or other professional advice. Review names, dates, figures, claims, formatting and suitability before sending or relying on a document. You are responsible for the final document and how you use it.</p></section>

          <section id="acceptable-use"><span className="legal-number">05</span><h2>Acceptable use</h2><p>You may not use Baakanya to break the law; harm, harass or deceive; upload malware; infringe privacy or intellectual-property rights; probe or bypass security; scrape or overload the service; impersonate another person; or create fraudulent documents, receipts or accounts.</p><p>Baakanya's software, brand, templates and interface remain ours or our licensors'. We grant you a limited, revocable, non-transferable right to use the service for its intended purpose.</p></section>

          <section><span className="legal-number">06</span><h2>Availability and responsibility</h2><p>We work to keep Baakanya reliable, but uninterrupted or error-free operation cannot be guaranteed. Features may change as the service develops. To the extent permitted by law, we are not responsible for indirect or consequential loss, lost opportunities caused by unreviewed documents, or failures outside our reasonable control. Nothing in these Terms limits liability that cannot lawfully be limited.</p></section>

          <section><span className="legal-number">07</span><h2>Ending use and changes</h2><p>You may stop using the service and request account deletion. Some records may remain where required for security, fraud prevention, payment records or law, as explained in the Privacy Policy. We may update these Terms for legal, security or service changes and will post the revised date. Material changes will be brought to users' attention where reasonably required.</p></section>

          <section><span className="legal-number">08</span><h2>Governing law</h2><p>These Terms are governed by the laws of Botswana. The parties should first try to resolve a dispute in good faith. If that fails, Botswana's courts have jurisdiction, subject to any mandatory consumer right to use another forum.</p></section>

          <section id="contact" className="legal-contact"><FileCheck2 aria-hidden="true" /><div><span className="micro-label">QUESTIONS</span><h2>Let’s make it clear.</h2><p>Contact us before using the service if anything in these terms is unclear.</p></div><a className="btn btn-ink" href="mailto:futurifydesigns@gmail.com?subject=Baakanya%20terms%20question">Contact us <ArrowRight /></a></section>
        </article>
      </div>
    </Layout>
  );
}
