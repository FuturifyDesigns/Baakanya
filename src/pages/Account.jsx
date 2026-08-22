import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  CreditCard,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Layout from "../components/Layout";
import RequireAuth from "../components/RequireAuth";
import { useAccess } from "../lib/access";
import { getAccessDestination, isRenewalStatus } from "../lib/accessRoutes";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

import { LOCAL_DOCUMENT_HISTORY_KEY } from "../lib/documentHistory";

const DRAFT_KEYS = [
  "baakanya-career-draft",
  "baakanya-business-draft",
  "baakanya-document-editor",
  LOCAL_DOCUMENT_HISTORY_KEY,
];

function accessLabel(access) {
  switch (access.status) {
    case "trial_active":
      return {
        title: "Free trial",
        detail: `${access.trialCountdown} remaining`,
        icon: Clock3,
      };
    case "subscription_active":
      return {
        title: "Monthly unlimited",
        detail: `${access.subscriptionCountdown} remaining`,
        icon: Clock3,
      };
    case "credits_available":
      return {
        title: "Document credits",
        detail: `${access.credits} credit${access.credits === 1 ? "" : "s"} left`,
        icon: CreditCard,
      };
    case "under_review":
      return {
        title: "Payment under review",
        detail: "An admin is verifying your receipt",
        icon: ShieldCheck,
      };
    case "trial_expired":
      return {
        title: "Trial ended",
        detail: "Choose credits or monthly access to continue",
        icon: Clock3,
      };
    case "subscription_expired":
      return {
        title: "Monthly access ended",
        detail: "Renew monthly or switch to credits",
        icon: Clock3,
      };
    case "credits_exhausted":
      return {
        title: "Credits used up",
        detail: "Buy another pack or switch to monthly",
        icon: CreditCard,
      };
    default:
      return {
        title: access.reason || "Access",
        detail: "Manage how you use Baakanya",
        icon: ShieldCheck,
      };
  }
}

function AccountBody() {
  const { user, signOut } = useAuth();
  const access = useAccess();
  const navigate = useNavigate();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const displayName =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "Member";
  const status = accessLabel(access);
  const StatusIcon = status.icon;
  const renewHref =
    getAccessDestination(access) ||
    (isRenewalStatus(access.status)
      ? `/access?reason=${access.status === "trial_expired" ? "trial_ended" : access.status === "subscription_expired" ? "subscription_ended" : "credits_ended"}`
      : "/access");

  const wipeLocal = () => {
    DRAFT_KEYS.forEach((key) => localStorage.removeItem(key));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
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

        <header className="account-hero">
          <div>
            <span className="kicker">ACCOUNT</span>
            <h1>Baakanya</h1>
            <p>
              Signed in as <b>{user?.email}</b>
              {user?.user_metadata?.name ? ` · ${user.user_metadata.name}` : ""}.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleSignOut}
          >
            <LogOut size={16} /> Sign out
          </button>
        </header>

        <div className="account-grid">
          <article className="account-panel account-profile">
            <span className="kicker">PROFILE</span>
            <h2>{displayName}</h2>
            <dl>
              <div>
                <dt>Email</dt>
                <dd>{user?.email || "—"}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{user?.user_metadata?.name || "Not set yet"}</dd>
              </div>
            </dl>
            <p className="account-note">
              Drafts autosave on this device. Signing out keeps them until you
              clear browser storage or delete the account.
            </p>
          </article>

          <article className="account-panel account-access">
            <span className="kicker">ACCESS</span>
            <div className="account-access-status">
              <StatusIcon size={22} />
              <div>
                <b>{status.title}</b>
                <small>{access.loading ? "Checking access…" : status.detail}</small>
              </div>
            </div>
            <div className="account-access-actions">
              {access.hasUsedTrial && !access.allowed && (
                <p className="account-note">
                  Your free trial was already used on this account. Renew with
                  credits or monthly access.
                </p>
              )}
              {access.allowed ? (
                <Link className="btn btn-blue" to="/workspace">
                  Open workspace <ArrowRight size={16} />
                </Link>
              ) : (
                <Link className="btn btn-blue" to={renewHref}>
                  {isRenewalStatus(access.status)
                    ? "Renew access"
                    : access.isReturningUser
                      ? "Renew access"
                      : "Set up access"}{" "}
                  <ArrowRight size={16} />
                </Link>
              )}
              {access.status === "credits_available" && (
                <Link
                  className="btn btn-outline"
                  to="/access?step=pay&plan=credits&reason=renew"
                >
                  Buy more credits
                </Link>
              )}
              {access.status === "subscription_expired" && (
                <Link
                  className="btn btn-outline"
                  to="/access?step=pay&plan=subscription&reason=subscription_ended"
                >
                  Renew monthly
                </Link>
              )}
              <Link className="btn btn-outline" to="/pricing">
                Review pricing
              </Link>
            </div>
          </article>
        </div>

        <section className="account-danger-zone">
          <div className="account-danger-intro">
            <div>
              <span className="kicker">DANGER ZONE</span>
              <h2>Delete account</h2>
              <p>
                Permanently remove your profile, credits, subscriptions, payment
                history and drafts on this device. This cannot be undone.
              </p>
            </div>
            {!showDelete && (
              <button
                type="button"
                className="btn btn-outline account-danger-toggle"
                onClick={() => setShowDelete(true)}
              >
                I want to delete my account
              </button>
            )}
          </div>

          {showDelete && (
            <div className="account-danger">
              <div className="account-danger-head">
                <AlertTriangle />
                <div>
                  <h3>Confirm permanent deletion</h3>
                  <p>
                    This wipes your profile, credits, subscriptions, payment
                    submissions, generation history and uploaded receipts, then
                    signs you out. Trial abuse fingerprints stay anonymised so
                    free trials cannot be reused.
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
                <div className="account-delete-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowDelete(false);
                      setConfirmEmail("");
                      setMessage("");
                    }}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-danger" disabled={busy}>
                    <Trash2 size={16} />
                    {busy ? "Deleting…" : "Delete permanently"}
                  </button>
                </div>
              </form>
              {message && (
                <div className="form-message validation-error" role="alert">
                  {message}
                </div>
              )}
            </div>
          )}
        </section>
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
