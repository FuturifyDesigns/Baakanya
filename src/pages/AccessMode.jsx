import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Layout from "../components/Layout";
import PaymentPanel from "../components/PaymentPanel";
import RequireAuth from "../components/RequireAuth";
import { useAccess } from "../lib/access";
import { useAuth } from "../lib/auth";
import { getDeviceFingerprint } from "../lib/fingerprint";
import { supabase } from "../lib/supabase";

function AccessModeBody() {
  const { user } = useAuth();
  const access = useAccess();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const step = params.get("step");
  const planParam = params.get("plan");
  const reason = params.get("reason");
  const showPay = useMemo(() => {
    if (step === "pay") return true;
    if (access.status === "awaiting_payment") return true;
    if (access.status === "trial_expired" && step === "pay") return true;
    return false;
  }, [step, access.status]);

  const payPlan =
    planParam === "credits" || access.signupIntent === "credits"
      ? "credits"
      : "subscription";

  useEffect(() => {
    if (access.loading) return;
    if (access.status === "awaiting_payment" && step !== "pay") {
      setParams(
        {
          step: "pay",
          plan:
            access.signupIntent === "credits" ? "credits" : "subscription",
        },
        { replace: true },
      );
    }
  }, [access.loading, access.status, access.signupIntent, step, setParams]);

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
      setParams(
        {
          step: "pay",
          plan: mode === "credits" ? "credits" : "subscription",
        },
        { replace: true },
      );
    } catch (error) {
      setMessage(error.message || "Could not save your access choice.");
    } finally {
      setBusy("");
    }
  };

  const backToModes = async () => {
    setMessage("");
    if (supabase && access.status === "awaiting_payment") {
      const { error } = await supabase.rpc("clear_access_mode_selection");
      if (error) {
        setMessage(error.message);
        return;
      }
    }
    setParams({}, { replace: true });
  };

  return (
    <Layout>
      <section className="access-mode-page container">
        <span className="kicker">
          {showPay ? "STEP 2 · PAYMENT" : "STEP 1 · ACCESS MODE"}
        </span>
        <h1>
          {reason === "trial_ended"
            ? "Your free trial has ended"
            : showPay
              ? "Complete payment to unlock tools"
              : "How do you want to use Baakanya?"}
        </h1>
        <p>
          {reason === "trial_ended"
            ? "Choose credits or monthly access, then submit proof of payment."
            : showPay
              ? "You selected a paid option. Payment stays in this setup flow — the workspace opens only after access is approved."
              : "Your email is verified. Pick a free trial or a paid option before entering the workspace."}
        </p>

        {!showPay && (
          <>
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
            <div
              className="access-mode-select access-mode-page-grid"
              role="list"
            >
              {access.status !== "trial_expired" && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => choose("trial")}
                >
                  <b>Start free 7-day trial</b>
                  <span>Full tools · no payment yet</span>
                  <em>{busy === "trial" ? "Starting…" : "Select trial"}</em>
                </button>
              )}
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
          </>
        )}

        {showPay && (
          <div className="access-pay-step">
            <div className="access-pay-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={backToModes}
              >
                ← Change access mode
              </button>
            </div>
            <PaymentPanel
              initialPlan={payPlan}
              onPlanChange={(next) =>
                setParams(
                  { step: "pay", plan: next },
                  { replace: true },
                )
              }
            />
          </div>
        )}

        {message && (
          <div className="form-message validation-error" role="alert">
            {message}
          </div>
        )}
        <p className="access-mode-footnote">
          <CheckCircle2 size={16} /> Workspace stays locked until trial starts
          or payment is approved. <Link to="/pricing">Review pricing</Link>
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
