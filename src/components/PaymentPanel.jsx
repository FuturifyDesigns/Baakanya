import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Landmark, Smartphone, UploadCloud } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAccess } from "../lib/access";
import { supabase } from "../lib/supabase";

const bank = {
  name: import.meta.env.VITE_BANK_NAME || "FNB Botswana",
  account: import.meta.env.VITE_BANK_ACCOUNT_NAME || "Leon Maunge",
  number: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "62870770297",
  branch: import.meta.env.VITE_BANK_BRANCH_CODE || "283567",
  branchName: import.meta.env.VITE_BANK_BRANCH_NAME || "Airport Junction",
  ewallet: import.meta.env.VITE_EWALLET_NUMBER || "+267 77 783 823",
};

export function PaymentReviewStatus({ plan, submittedAt }) {
  const label =
    plan === "credits"
      ? "P25 document credits"
      : plan === "subscription"
        ? "P40 monthly unlimited"
        : "Paid access";
  return (
    <div className="payment-review-card" role="status" aria-live="polite">
      <div className="payment-review-icon">
        <CheckCircle2 size={34} />
      </div>
      <span className="kicker">UNDER REVIEW</span>
      <h2>Your account is in review</h2>
      <p>
        We received your proof of payment. Please wait for a Baakanya admin to
        verify your receipt. Your workspace stays locked until approval.
      </p>
      <ul>
        <li>Selected plan: {label}</li>
        {submittedAt && (
          <li>Submitted: {new Date(submittedAt).toLocaleString()}</li>
        )}
        <li>Reviews usually happen during Botswana business hours</li>
        <li>You can sign out and return later — your submission is saved</li>
      </ul>
    </div>
  );
}

export default function PaymentPanel({
  initialPlan = "subscription",
  onPlanChange,
  onSubmitted,
  locked = false,
  allowSubscription = true,
}) {
  const [plan, setPlan] = useState(
    initialPlan === "credits" || !allowSubscription
      ? "credits"
      : "subscription",
  );
  const [receipt, setReceipt] = useState(null);
  const [method, setMethod] = useState("bank");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const access = useAccess();

  useEffect(() => {
    if (!allowSubscription) {
      setPlan("credits");
      return;
    }
    setPlan(initialPlan === "credits" ? "credits" : "subscription");
  }, [initialPlan, allowSubscription]);

  if (locked || access.status === "under_review") {
    return (
      <PaymentReviewStatus
        plan={access.pendingPlan || plan}
        submittedAt={access.pendingSubmittedAt}
      />
    );
  }

  const updatePlan = (next) => {
    if (next === "subscription" && !allowSubscription) {
      setMessage(
        "Your monthly access is still active. You can renew after it expires.",
      );
      return;
    }
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
    if (file.size > 8 * 1024 * 1024) {
      setReceipt(null);
      setMessage("The receipt must be smaller than 8 MB.");
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
    const extension = (receipt.name.split(".").pop() || "png").toLowerCase();
    const safeExt = ["png", "jpg", "jpeg", "webp", "pdf"].includes(extension)
      ? extension
      : "png";
    const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;
    const upload = await supabase.storage
      .from("payment-receipts")
      .upload(path, receipt, {
        contentType: receipt.type || undefined,
        upsert: false,
      });
    if (upload.error) {
      setMessage(upload.error.message);
      setBusy(false);
      return;
    }

    const { data, error } = await supabase.rpc("submit_payment_proof", {
      selected_plan: plan,
      selected_method: method,
      receipt_path: path,
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    setReceipt(null);
    access.refresh?.();
    onSubmitted?.(data);
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
            disabled={!allowSubscription}
            onClick={() => updatePlan("subscription")}
            title={
              allowSubscription
                ? undefined
                : "Renew monthly only after your current month ends"
            }
          >
            <b>P40 monthly</b>
            <span>
              {allowSubscription
                ? "Unlimited documents"
                : "Available after current month ends"}
            </span>
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
        {message && (
          <div className="form-message validation-error" role="alert">
            {message}
          </div>
        )}
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
