import { Landmark, Smartphone, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
export default function Payment() {
  const [params] = useSearchParams();
  const [plan, setPlan] = useState(
    params.get("plan") === "credits" ? "credits" : "subscription",
  );
  const [receipt, setReceipt] = useState(null);
  const [method, setMethod] = useState("bank");
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const bank = {
    name: import.meta.env.VITE_BANK_NAME || "FNB Botswana",
    account: import.meta.env.VITE_BANK_ACCOUNT_NAME || "Leon Maunge",
    number: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "62870770297",
    branch: import.meta.env.VITE_BANK_BRANCH_CODE || "283567",
    branchName: import.meta.env.VITE_BANK_BRANCH_NAME || "Airport Junction",
    ewallet: import.meta.env.VITE_EWALLET_NUMBER || "+267 77 783 823",
  };
  const submit = async () => {
    if (!user || !supabase) {
      setMessage("Sign in to submit a receipt once Supabase is connected.");
      return;
    }
    if (!receipt) {
      setMessage("Choose a receipt image first.");
      return;
    }
    const path = `${user.id}/${crypto.randomUUID()}-${receipt.name}`;
    const upload = await supabase.storage
      .from("payment-receipts")
      .upload(path, receipt);
    if (upload.error) {
      setMessage(upload.error.message);
      return;
    }
    const amount = plan === "credits" ? 25 : 40;
    const result = await supabase.from("payment_submissions").insert({
      user_id: user.id,
      amount,
      plan_type: plan,
      payment_method: method,
      receipt_image_path: path,
    });
    setMessage(
      result.error
        ? result.error.message
        : "Receipt submitted. We will review it and update your access.",
    );
  };
  return (
    <Layout>
      <section className="payment-page container">
        <span className="kicker">MANUAL PAYMENT</span>
        <h1>Choose access that fits.</h1>
        <div className="payment-grid">
          <div className="form-card">
            <div className="plan-select">
              <button
                className={plan === "credits" ? "active" : ""}
                onClick={() => setPlan("credits")}
              >
                <b>P25 once-off</b>
                <span>5 credits · no expiry</span>
              </button>
              <button
                className={plan === "subscription" ? "active" : ""}
                onClick={() => setPlan("subscription")}
              >
                <b>P40 monthly</b>
                <span>Unlimited documents</span>
              </button>
            </div>
            <h3>1. Choose a payment method</h3>
            <div className="payment-methods">
              <button
                className={method === "bank" ? "active" : ""}
                onClick={() => setMethod("bank")}
              >
                <Landmark size={18} /> Bank transfer
              </button>
              <button
                className={method === "ewallet" ? "active" : ""}
                onClick={() => setMethod("ewallet")}
              >
                <Smartphone size={18} /> E-Wallet
              </button>
            </div>
            {method === "bank" ? (
              <dl className="bank-details">
                <div>
                  <dt>Bank</dt>
                  <dd>{bank.name}</dd>
                </div>
                <div>
                  <dt>Account name</dt>
                  <dd>{bank.account}</dd>
                </div>
                <div>
                  <dt>Account number</dt>
                  <dd>{bank.number}</dd>
                </div>
                <div>
                  <dt>Branch code</dt>
                  <dd>{bank.branch}</dd>
                </div>
                <div>
                  <dt>Branch</dt>
                  <dd>{bank.branchName}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>P{plan === "credits" ? "25" : "40"}</dd>
                </div>
              </dl>
            ) : (
              <dl className="bank-details">
                <div>
                  <dt>Pay to cell</dt>
                  <dd>{bank.ewallet}</dd>
                </div>
                <div>
                  <dt>Recipient</dt>
                  <dd>{bank.account}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>P{plan === "credits" ? "25" : "40"}</dd>
                </div>
              </dl>
            )}
            <h3>2. Upload proof of payment</h3>
            <label className="receipt-upload">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceipt(e.target.files[0])}
              />
              <UploadCloud />
              <span>
                {receipt ? receipt.name : "Choose receipt image or PDF"}
              </span>
            </label>
            <button className="btn btn-blue" onClick={submit}>
              Submit for review
            </button>
            {message && <div className="form-message">{message}</div>}
          </div>
          <aside className="payment-aside">
            <h2>What happens next?</h2>
            <ol>
              <li>
                <span>1</span>We receive your proof of payment.
              </li>
              <li>
                <span>2</span>A Baakanya admin verifies the payment.
              </li>
              <li>
                <span>3</span>Your credits or monthly access are activated.
              </li>
            </ol>
            <p>Most payments are reviewed during Botswana business hours.</p>
          </aside>
        </div>
      </section>
    </Layout>
  );
}
