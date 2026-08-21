import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Layout from "../components/Layout";
import RequireAuth from "../components/RequireAuth";
import { useAccess } from "../lib/access";
import { useAuth } from "../lib/auth";
import { getDeviceFingerprint } from "../lib/fingerprint";
import { supabase } from "../lib/supabase";

function AccessModeBody() {
  const { user } = useAuth();
  const access = useAccess();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  if (!access.loading && access.allowed) {
    return <Navigate to="/workspace" replace />;
  }

  const choose = async (mode) => {
    if (!supabase || !user?.email) return;
    setBusy(mode);
    setMessage("");
    try {
      let reservationToken = null;
      if (mode === "trial") {
        const device = await getDeviceFingerprint();
        const gate = await supabase.functions.invoke("trial-gate", {
          body: {
            email: user.email,
            ...device,
            website: honeypot,
            clientTimestamp: new Date().toISOString(),
          },
        });
        if (gate.error || !gate.data?.reservationToken) {
          throw new Error(
            gate.data?.error ||
              "This account is not eligible for another free trial.",
          );
        }
        reservationToken = gate.data.reservationToken;
      }

      const { data, error } = await supabase.rpc("choose_access_mode", {
        selected_mode: mode,
        reservation_token: reservationToken,
      });
      if (error) throw error;

      if (mode === "trial" || data?.status === "trial_active") {
        navigate("/workspace", { replace: true });
        return;
      }
      navigate(
        `/payment?plan=${mode === "credits" ? "credits" : "subscription"}`,
        { replace: true },
      );
    } catch (error) {
      setMessage(error.message || "Could not save your access choice.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Layout>
      <section className="access-mode-page container">
        <span className="kicker">CHOOSE ACCESS</span>
        <h1>How do you want to use Baakanya?</h1>
        <p>
          Your email is verified. Pick a free trial or a paid option before
          entering the workspace.
        </p>
        <div className="bot-field" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex="-1"
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </label>
        </div>
        <div className="access-mode-select access-mode-page-grid" role="list">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => choose("trial")}
          >
            <b>Start free 7-day trial</b>
            <span>Full tools · no payment yet</span>
            <em>{busy === "trial" ? "Starting…" : "Select trial"}</em>
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => choose("credits")}
          >
            <b>Pay with credits · P25</b>
            <span>5 documents · no expiry</span>
            <em>{busy === "credits" ? "Continuing…" : "Select credits"}</em>
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => choose("subscription")}
          >
            <b>Pay monthly · P40</b>
            <span>Unlimited for 30 days</span>
            <em>
              {busy === "subscription" ? "Continuing…" : "Select monthly"}
            </em>
          </button>
        </div>
        {message && (
          <div className="form-message validation-error" role="alert">
            {message}
          </div>
        )}
        <p className="access-mode-footnote">
          <CheckCircle2 size={16} /> You can change paid plans later from
          payment.{" "}
          <Link to="/pricing">Review pricing</Link>
        </p>
      </section>
    </Layout>
  );
}

export default function AccessMode() {
  return (
    <RequireAuth title="Sign in to choose your access">
      <AccessModeBody />
    </RequireAuth>
  );
}
