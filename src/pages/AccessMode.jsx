import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import {
  CreditsIcon,
  MonthlyIcon,
  TrialIcon,
} from "../components/AccessModeIcons";
import Layout from "../components/Layout";
import PaymentPanel, { PaymentReviewStatus } from "../components/PaymentPanel";
import RequireAuth from "../components/RequireAuth";
import { useAccess } from "../lib/access";
import { isRenewalStatus } from "../lib/accessRoutes";
import { useAuth } from "../lib/auth";
import { getDeviceFingerprint } from "../lib/fingerprint";
import { supabase } from "../lib/supabase";

const modes = [
  {
    id: "trial",
    icon: TrialIcon,
    title: "Free 7-day trial",
    price: "P0",
    priceNote: "then choose a paid plan",
    summary: "Try every tool with no payment upfront.",
    points: [
      "CV, cover letter, invoices and conversions",
      "Live countdown in your workspace",
      "No card required to start",
      "One trial per person / device",
    ],
    cta: "Start free trial",
    tone: "trial",
  },
  {
    id: "credits",
    icon: CreditsIcon,
    title: "Document credits",
    price: "P25",
    priceNote: "once-off · 5 credits",
    summary: "Best for a few documents when you need them.",
    points: [
      "5 document actions across any tool",
      "Credits do not expire",
      "No monthly commitment",
      "Pay once, use when ready",
    ],
    cta: "Choose credits",
    tone: "credits",
  },
  {
    id: "subscription",
    icon: MonthlyIcon,
    title: "Monthly unlimited",
    price: "P40",
    priceNote: "per 30 days",
    summary: "Best when you create documents often.",
    points: [
      "Unlimited documents for 30 days",
      "Manual renewal — no auto debit",
      "Ideal for regular client or job work",
      "Usually better value from 6+ documents",
    ],
    cta: "Choose monthly",
    tone: "monthly",
  },
];

function AccessModeBody() {
  const { user } = useAuth();
  const access = useAccess();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [forceModes, setForceModes] = useState(false);
  const [hovered, setHovered] = useState("");

  const step = params.get("step");
  const planParam = params.get("plan");
  const reason = params.get("reason");
  const underReview = access.status === "under_review";
  const renewing = isRenewalStatus(access.status) || Boolean(reason);
  const showPay =
    !underReview &&
    !forceModes &&
    (step === "pay" ||
      access.status === "awaiting_payment" ||
      (renewing && step === "pay"));

  const payPlan =
    planParam === "credits" ||
    access.signupIntent === "credits" ||
    access.pendingPlan === "credits"
      ? "credits"
      : "subscription";

  useEffect(() => {
    if (access.loading) return;
    if (underReview && step !== "review") {
      setParams({ step: "review" }, { replace: true });
      setForceModes(false);
    }
  }, [access.loading, underReview, step, setParams]);

  useEffect(() => {
    if (access.loading || forceModes || underReview) return;
    if (isRenewalStatus(access.status) && step === "pay" && !planParam) {
      // Stay on mode pick for renewals unless they already opened payment.
      setParams({ reason: reason || access.status }, { replace: true });
    }
  }, [
    access.loading,
    access.status,
    forceModes,
    underReview,
    step,
    planParam,
    reason,
    setParams,
  ]);

  useEffect(() => {
    if (access.loading || forceModes || underReview) return;
    if (access.status === "awaiting_payment" && step !== "pay") {
      setParams(
        {
          step: "pay",
          plan: access.signupIntent === "credits" ? "credits" : "subscription",
        },
        { replace: true },
      );
    }
  }, [
    access.loading,
    access.status,
    access.signupIntent,
    step,
    setParams,
    forceModes,
    underReview,
  ]);

  useEffect(() => {
    if (forceModes && access.status === "awaiting_mode") {
      setForceModes(false);
    }
  }, [forceModes, access.status]);

  if (!access.loading && access.allowed && step !== "pay" && reason !== "renew") {
    return <Navigate to="/workspace" replace />;
  }

  const choose = async (mode) => {
    if (!supabase || !user?.email || underReview) return;
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

      setForceModes(false);
      access.refresh();

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
    if (underReview) {
      setMessage(
        "Your receipt is under review. You cannot change access mode until an admin verifies it.",
      );
      return;
    }
    setMessage("");
    setBusy("reset");
    try {
      if (supabase && (access.status === "awaiting_payment" || step === "pay")) {
        const { error } = await supabase.rpc("clear_access_mode_selection");
        if (error) throw error;
      }
      setForceModes(true);
      setParams({}, { replace: true });
      access.refresh();
    } catch (error) {
      setMessage(error.message || "Could not return to mode selection.");
    } finally {
      setBusy("");
    }
  };

  const visibleModes =
    renewing || isRenewalStatus(access.status)
      ? modes.filter((mode) => mode.id !== "trial")
      : modes;

  const renewTitle =
    reason === "trial_ended" || access.status === "trial_expired"
      ? "Your free trial has ended"
      : reason === "subscription_ended" ||
          access.status === "subscription_expired"
        ? "Your monthly access has ended"
        : reason === "credits_ended" || access.status === "credits_exhausted"
          ? "You are out of credits"
          : reason === "renew"
            ? "Renew your Baakanya access"
            : null;

  const renewCopy =
    reason === "trial_ended" || access.status === "trial_expired"
      ? "Your workspace is locked. Choose credits or monthly access, then submit proof of payment."
      : reason === "subscription_ended" ||
          access.status === "subscription_expired"
        ? "Your 30-day access has ended. Renew monthly or switch to credits to reopen the tools."
        : reason === "credits_ended" || access.status === "credits_exhausted"
          ? "Buy another credit pack or switch to monthly unlimited to keep working."
          : "Choose credits or monthly access to unlock the workspace again.";


  return (
    <Layout>
      <section className="access-mode-page container">
        <div className="access-mode-head">
          <div>
            <span className="kicker">
              {underReview
                ? "PAYMENT REVIEW"
                : showPay
                  ? "STEP 2 · PAYMENT"
                  : "STEP 1 · ACCESS MODE"}
            </span>
            <h1>
              {underReview
                ? "Your account is in review"
                : renewTitle
                  ? renewTitle
                  : showPay
                    ? "Complete payment to unlock tools"
                    : "How do you want to use Baakanya?"}
            </h1>
            <p>
              {underReview
                ? "A receipt is waiting for admin verification. Plan options stay locked until that review finishes."
                : renewTitle
                  ? renewCopy
                  : showPay
                    ? "You selected a paid option. Finish payment here — workspace opens only after approval."
                    : "Your email is verified. Compare the options, pick one, then continue."}
            </p>
          </div>
          {!underReview && (
            <Link className="btn btn-ink access-pricing-btn" to="/pricing">
              Review pricing <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {underReview && (
          <PaymentReviewStatus
            plan={access.pendingPlan || payPlan}
            submittedAt={access.pendingSubmittedAt}
          />
        )}

        {!underReview && !showPay && (
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
            <div className="access-mode-cards" role="list">
              {visibleModes.map((mode) => {
                const Icon = mode.icon;
                const active = hovered === mode.id || busy === mode.id;
                return (
                  <button
                    type="button"
                    className={`access-mode-card tone-${mode.tone} ${active ? "is-active" : ""}`}
                    key={mode.id}
                    disabled={Boolean(busy)}
                    onMouseEnter={() => setHovered(mode.id)}
                    onMouseLeave={() => setHovered("")}
                    onFocus={() => setHovered(mode.id)}
                    onBlur={() => setHovered("")}
                    onClick={() => choose(mode.id)}
                  >
                    <div className="access-mode-card-top">
                      <span className="access-mode-icon">
                        <Icon />
                      </span>
                      <div className="access-mode-price">
                        <strong>{mode.price}</strong>
                        <small>{mode.priceNote}</small>
                      </div>
                    </div>
                    <h2>{mode.title}</h2>
                    <p>{mode.summary}</p>
                    <ul>
                      {mode.points.map((point) => (
                        <li key={point}>
                          <Check size={14} strokeWidth={2.4} />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <span className="access-mode-cta">
                      {busy === mode.id ? "Please wait…" : mode.cta}
                      <ArrowRight size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {!underReview && showPay && (
          <div className="access-pay-step">
            <div className="access-pay-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy === "reset"}
                onClick={backToModes}
              >
                {busy === "reset" ? "Returning…" : "← Change access mode"}
              </button>
              <Link className="btn btn-ink access-pricing-btn" to="/pricing">
                Review pricing <ArrowRight size={16} />
              </Link>
            </div>
            <PaymentPanel
              initialPlan={payPlan}
              onPlanChange={(next) =>
                setParams({ step: "pay", plan: next }, { replace: true })
              }
              onSubmitted={() => setParams({ step: "review" }, { replace: true })}
            />
          </div>
        )}

        {message && (
          <div className="form-message validation-error" role="alert">
            {message}
          </div>
        )}
        {!underReview && !showPay && (
          <p className="access-mode-footnote">
            <Clock3 size={16} /> Workspace stays locked until a trial starts or
            payment is approved.
          </p>
        )}
        {!underReview && showPay && !message && (
          <p className="access-mode-footnote">
            <Clock3 size={16} /> After you submit, plan options lock until an
            admin verifies your receipt.
          </p>
        )}
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
