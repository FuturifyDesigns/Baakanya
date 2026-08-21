import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2 } from "lucide-react";
import Layout from "../components/Layout";
import RequireAuth from "../components/RequireAuth";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const DRAFT_KEYS = [
  "baakanya-career-draft",
  "baakanya-business-draft",
  "baakanya-document-editor",
];

function AccountBody() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const wipeLocal = () => {
    DRAFT_KEYS.forEach((key) => localStorage.removeItem(key));
  };

  const deleteAccount = async (event) => {
    event.preventDefault();
    if (!user?.email || !supabase) return;
    const confirmed = window.confirm(
      "This permanently deletes your Baakanya account, payments, credits, trial data link, and saved drafts on this device. Continue?",
    );
    if (!confirmed) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc("delete_own_account", {
      confirm_email: confirmEmail.trim(),
    });
    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }
    wipeLocal();
    await signOut();
    setBusy(false);
    navigate("/?deleted=1", { replace: true });
    if (!data?.deleted) {
      setMessage("Account deletion completed.");
    }
  };

  return (
    <Layout>
      <section className="account-page container">
        <Link className="back-link" to="/workspace">
          ← Back to workspace
        </Link>
        <span className="kicker">ACCOUNT</span>
        <h1>Manage your Baakanya account</h1>
        <p className="account-lead">
          Signed in as <b>{user?.email}</b>
          {user?.user_metadata?.name ? ` · ${user.user_metadata.name}` : ""}.
        </p>

        <div className="account-danger">
          <div className="account-danger-head">
            <AlertTriangle />
            <div>
              <h2>Delete account</h2>
              <p>
                This wipes your profile, credits, subscriptions, payment
                submissions, generation history, uploaded receipts, and signs
                you out. Trial abuse fingerprints stay anonymised so free trials
                cannot be reused.
              </p>
            </div>
          </div>
          <form onSubmit={deleteAccount} className="account-delete-form">
            <label>
              Type your email to confirm
              <input
                required
                type="email"
                autoComplete="email"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                placeholder={user?.email || "you@example.com"}
              />
            </label>
            <button className="btn btn-danger" disabled={busy}>
              <Trash2 />
              {busy ? "Deleting…" : "Delete my account permanently"}
            </button>
          </form>
          {message && (
            <div className="form-message validation-error" role="alert">
              {message}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

export default function Account() {
  return (
    <RequireAuth title="Sign in to manage your account">
      <AccountBody />
    </RequireAuth>
  );
}
