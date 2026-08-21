import { useEffect, useState } from "react";
import { Landmark, Smartphone, UploadCloud } from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const bank = {
  name: import.meta.env.VITE_BANK_NAME || "FNB Botswana",
  account: import.meta.env.VITE_BANK_ACCOUNT_NAME || "Leon Maunge",
  number: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "62870770297",
  branch: import.meta.env.VITE_BANK_BRANCH_CODE || "283567",
  branchName: import.meta.env.VITE_BANK_BRANCH_NAME || "Airport Junction",
  ewallet: import.meta.env.VITE_EWALLET_NUMBER || "+267 77 783 823",
};

export default function PaymentPanel({
  initialPlan = "subscription",
  onPlanChange,
}) {
  const [plan, setPlan] = useState(
    initialPlan === "credits" ? "credits" : "subscription",
  );
  const [receipt, setReceipt] = useState(null);
  const [method, setMethod] = useState("bank");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setPlan(initialPlan === "credits" ? "credits" : "subscription");
  }, [initialPlan]);

  const updatePlan = (next) => {
    setPlan(next);
    onPlanChange?.(next);
  };

  const chooseReceipt = (file) => {
    setMessage("");
    if (!file) return setReceipt(null);
    const allowed = /^(image\/(jpeg|png|webp)|application\/pdf)$/i.test(
      file.type,
    );
    if (!allowed) {
      setReceipt(null);
      setMessage("Upload a JPG, PNG, WebP or PDF receipt.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceipt(null);
      setMessage("The receipt must be smaller than 10 MB.");
      return;
    }
    setReceipt(file);
  };

  const submit = async () => {
    if (!user || !supabase) {
      setMessage("Sign in to submit a receipt.");
      return;
    }
    if (!receipt) {
      setMessage("Choose a receipt image first.");
      return;
    }
    setBusy(true);
    setMessage("");
    const safeName = receipt.name.replace(/[^a-z0-9._-]/gi, "-");
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const upload = await supabase.storage
      .from("payment-receipts")
      .upload(path, receipt);
    if (upload.error) {
      setMessage(upload.error.message);
      setBusy(false);
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
    if (!result.error && supabase) {
      await supabase.rpc("choose_access_mode", {
        selected_mode: plan,
        reservation_token: null,
      });
    }
    setMessage(
      result.error
        ? result.error.message
        : "Receipt submitted. We will review it and unlock your access.",
    );
    setBusy(false);
  };

  return (
    <div className="payment-grid">
      <div className="form-card">
        <div className="plan-select">
          <button
            type="button"
            className={plan === "credits" ? "active" : ""}
            onClick={() => updatePlan("credits")}
          >
            <b>P25 once-off</b>
            <span>5 credits · no expiry</span>
          </button>
          <button
            type="button"
            className={plan === "subscription" ? "active" : ""}
            onClick={() => updatePlan("subscription")}
          >
            <b>P40 monthly</b>
            <span>Unlimited documents</span>
          </button>
        </div>
        <h3>1. Choose a payment method</h3>
        <div className="payment-methods">
          <button
            type="button"
            className={method === "bank" ? "active" : ""}
            onClick={() => setMethod("bank")}
          >
            <Landmark size={18} /> Bank transfer
          </button>
          <button
            type="button"
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
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => chooseReceipt(e.target.files[0])}
          />
          <UploadCloud />
          <span>{receipt ? receipt.name : "Choose receipt image or PDF"}</span>
        </label>
        <button
          type="button"
          className="btn btn-blue"
          onClick={submit}
          disabled={busy}
        >
          {busy ? "Submitting…" : "Submit for review"}
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
  );
}
