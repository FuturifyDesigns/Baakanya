import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAccess } from "../lib/access";
import { useAuth } from "../lib/auth";
import Layout from "./Layout";
export default function ToolShell({ eyebrow, title, description, children }) {
  const { user, loading: authLoading } = useAuth();
  const access = useAccess();
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
        ) : (
          <div className="locked-card">
            <ShieldCheck />
            <span className="kicker">ACCESS PAUSED</span>
            <h2>{access.reason}</h2>
            <p>
              Choose a once-off credit pack or monthly access to keep using
              Baakanya.
            </p>
            <div>
              <Link className="btn btn-blue" to="/payment">
                View payment options
              </Link>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}
