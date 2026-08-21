import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAccess } from "../lib/access";
import { getAccessDestination, isRenewalStatus } from "../lib/accessRoutes";
import { useAuth } from "../lib/auth";
import Layout from "./Layout";

export default function ToolShell({ eyebrow, title, description, children }) {
  const { user, loading: authLoading } = useAuth();
  const access = useAccess();

  if (!authLoading && !access.loading && user && !access.allowed) {
    return <Navigate to={getAccessDestination(access) || "/access"} replace />;
  }

  return (
    <Layout>
      <section className="tool-page container">
        <Link className="back-link" to="/workspace">
          <ArrowLeft />
          Back to workspace
        </Link>
        <div className="tool-title">
          <div>
            <span className="kicker">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="privacy">
            <ShieldCheck />
            <span>
              <b>Private by design</b>
              <small>Files are processed on your device</small>
            </span>
          </div>
        </div>
        {(access.status === "trial_active" ||
          access.status === "subscription_active" ||
          access.status === "credits_available") && (
          <div className="tool-access-meter" role="status">
            {access.status === "trial_active" && (
              <span>
                Trial · <b>{access.trialCountdown}</b> left
              </span>
            )}
            {access.status === "subscription_active" && (
              <span>
                Monthly · <b>{access.subscriptionCountdown}</b> left
              </span>
            )}
            {access.status === "credits_available" && (
              <span>
                <b>{access.credits}</b> credit
                {access.credits === 1 ? "" : "s"} left
              </span>
            )}
          </div>
        )}
        {authLoading || access.loading ? (
          <div className="empty-state">Checking your access…</div>
        ) : !user ? (
          <div className="locked-card">
            <ShieldCheck />
            <span className="kicker">SIGN IN REQUIRED</span>
            <h2>Only signed-in accounts can use this tool</h2>
            <p>Create an account or log in to continue.</p>
            <div>
              <Link className="btn btn-blue" to="/auth?mode=signin">
                Sign in
              </Link>
              <Link className="btn btn-outline" to="/auth?mode=signup">
                Create account
              </Link>
            </div>
          </div>
        ) : access.allowed ? (
          children
        ) : access.status === "awaiting_mode" ? (
          <div className="locked-card">
            <ShieldCheck />
            <span className="kicker">CHOOSE ACCESS</span>
            <h2>Select free trial or paid access</h2>
            <p>Finish setup before using the tools.</p>
            <div>
              <Link className="btn btn-blue" to="/access">
                Choose access
              </Link>
            </div>
          </div>
        ) : access.status === "under_review" ? (
          <div className="locked-card">
            <ShieldCheck />
            <span className="kicker">UNDER REVIEW</span>
            <h2>Your payment receipt is being reviewed</h2>
            <p>
              Tools stay locked until an admin verifies your receipt. You cannot
              change plans while review is pending.
            </p>
            <div>
              <Link className="btn btn-blue" to="/access?step=review">
                View review status
              </Link>
            </div>
          </div>
        ) : access.status === "awaiting_payment" ? (
          <div className="locked-card">
            <ShieldCheck />
            <span className="kicker">PAYMENT REQUIRED</span>
            <h2>Complete your selected plan</h2>
            <p>
              You have not started a trial. Finish payment for the option you
              chose to unlock the workspace.
            </p>
            <div>
              <Link
                className="btn btn-blue"
                to={`/access?step=pay&plan=${access.signupIntent === "credits" ? "credits" : "subscription"}`}
              >
                Continue payment
              </Link>
              <Link className="btn btn-outline" to="/access">
                Change mode
              </Link>
            </div>
          </div>
        ) : (
          <div className="locked-card">
            <ShieldCheck />
            <span className="kicker">
              {isRenewalStatus(access.status) ? "RENEW ACCESS" : "ACCESS PAUSED"}
            </span>
            <h2>{access.reason}</h2>
            <p>
              Workspace tools are locked. Choose credits or monthly access to
              continue.
            </p>
            <div>
              <Link
                className="btn btn-blue"
                to={getAccessDestination(access) || "/access"}
              >
                Renew access
              </Link>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}
