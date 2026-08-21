import { ArrowRight, Clock3, Settings, ShieldCheck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import {
  BusinessMark,
  CareerMark,
  FilesMark,
} from "../components/BrandIllustrations";
import Layout from "../components/Layout";
import RequireAuth from "../components/RequireAuth";
import { useAccess } from "../lib/access";
import { getAccessDestination } from "../lib/accessRoutes";
import { useAuth } from "../lib/auth";

const tools = [
  {
    icon: CareerMark,
    title: "CV + Cover Letter",
    copy: "Build an application-ready CV and cover letter.",
    href: "/tools/career",
  },
  {
    icon: BusinessMark,
    title: "Invoice & Quotation",
    copy: "Create a professional, VAT-ready business document.",
    href: "/tools/invoice",
  },
  {
    icon: FilesMark,
    title: "Convert & Merge",
    copy: "Turn Word and images into PDF or combine PDF files.",
    href: "/tools/convert",
  },
];

function WorkspaceBody() {
  const { user } = useAuth();
  const access = useAccess();

  if (!access.loading && !access.allowed) {
    const destination = getAccessDestination(access);
    return <Navigate to={destination || "/access"} replace />;
  }

  return (
    <Layout>
      <section className="workspace container">
        <div className="workspace-head">
          <div>
            <span className="kicker">YOUR WORKSPACE</span>
            <h1>
              Dumela
              {user?.user_metadata?.name
                ? `, ${user.user_metadata.name.split(" ")[0]}`
                : ""}
              .
            </h1>
            <p>What are we sorting out today?</p>
          </div>
          <div className="access-pill">
            {access.status === "trial_active" ||
            access.status === "subscription_active" ? (
              <Clock3 />
            ) : (
              <ShieldCheck />
            )}
            <span>
              <b>
                {access.status === "trial_active"
                  ? "7-day trial"
                  : access.status === "subscription_active"
                    ? "Monthly access"
                    : access.status === "credits_available"
                      ? `${access.credits} credit${access.credits === 1 ? "" : "s"}`
                      : "Account ready"}
              </b>
              <small>
                {access.status === "trial_active"
                  ? `${access.trialCountdown} remaining`
                  : access.status === "subscription_active"
                    ? `${access.subscriptionCountdown} remaining`
                    : access.reason}
              </small>
            </span>
          </div>
        </div>

        {access.status === "trial_active" && (
          <div className="trial-countdown-banner" role="status">
            <div>
              <span>LIVE TRIAL COUNTDOWN</span>
              <strong>{access.trialCountdown}</strong>
            </div>
            <p>
              When this timer hits zero you leave the workspace and must choose
              credits or monthly access to continue.
            </p>
            <Link
              className="btn btn-outline"
              to="/access?step=pay&reason=trial_ended"
            >
              Pay early to continue <ArrowRight />
            </Link>
          </div>
        )}

        {access.status === "subscription_active" && (
          <div
            className="trial-countdown-banner subscription-countdown-banner"
            role="status"
          >
            <div>
              <span>MONTHLY ACCESS ENDS IN</span>
              <strong>{access.subscriptionCountdown}</strong>
            </div>
            <p>
              Unlimited documents until this timer ends. Renew with another
              monthly payment or switch to credits before it hits zero.
            </p>
            <Link
              className="btn btn-outline"
              to="/access?step=pay&plan=subscription&reason=renew"
            >
              Renew monthly <ArrowRight />
            </Link>
          </div>
        )}

        {access.status === "credits_available" && (
          <div className="trial-countdown-banner credits-balance-banner" role="status">
            <div>
              <span>CREDITS ON YOUR ACCOUNT</span>
              <strong>
                {access.credits} left
              </strong>
            </div>
            <p>
              Each confirmed document or conversion uses one credit. When you
              reach zero you will leave the workspace until you renew.
            </p>
            <Link
              className="btn btn-outline"
              to="/access?step=pay&plan=credits&reason=renew"
            >
              Buy more credits <ArrowRight />
            </Link>
          </div>
        )}

        <div className="workspace-grid">
          {tools.map(({ icon: Icon, ...tool }) => (
            <Link to={tool.href} className="workspace-tool" key={tool.title}>
              <div className="workspace-icon">
                <Icon />
              </div>
              <h2>{tool.title}</h2>
              <p>{tool.copy}</p>
              <span>
                Open tool
                <ArrowRight />
              </span>
            </Link>
          ))}
        </div>
        <div className="workspace-note">
          <b>Privacy by default</b>
          <p>
            Conversion files stay in your browser and are not uploaded. Payment
            receipts and account details are stored securely and used only to
            provide the service.
          </p>
          <Link className="btn btn-outline" to="/account">
            <Settings size={16} /> Account settings
          </Link>
        </div>
      </section>
    </Layout>
  );
}

export default function Workspace() {
  return (
    <RequireAuth title="Sign in to open your workspace">
      <WorkspaceBody />
    </RequireAuth>
  );
}
