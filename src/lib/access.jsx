import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

const formatRemaining = (ms) => {
  if (ms <= 0) return "0d 00:00:00";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export function useAccess() {
  const { configured, user, loading: authLoading } = useAuth();
  const [state, setState] = useState({
    loading: configured,
    allowed: !configured,
    reason: configured ? "Checking access…" : "Ready to use",
    planType: "none",
    trialEndDate: null,
    trialRemainingMs: 0,
    trialCountdown: "",
    credits: 0,
    status: "unknown",
  });

  useEffect(() => {
    let active = true;
    let tickId;
    let pollId;
    let trialEnd = null;
    let subscriptionEnd = null;
    let creditBalance = 0;
    let planType = "none";
    let signupIntent = null;

    const publish = () => {
      if (!active) return;
      const now = Date.now();
      const trialActive = trialEnd && trialEnd.getTime() > now;
      const subscriptionActive =
        subscriptionEnd && subscriptionEnd.getTime() > now;
      const creditActive = creditBalance > 0;
      const allowed = Boolean(
        trialActive || subscriptionActive || creditActive,
      );
      const remaining = trialActive ? trialEnd.getTime() - now : 0;
      let status = "no_access";
      let reason = "Your free trial has ended";
      if (trialActive) {
        status = "trial_active";
        reason = "Free trial active";
      } else if (subscriptionActive) {
        status = "subscription_active";
        reason = "Monthly access active";
      } else if (creditActive) {
        status = "credits_available";
        reason = `${creditBalance} credits available`;
      } else if (trialEnd) {
        status = "trial_expired";
        reason = "Your free trial has ended";
      } else if (signupIntent === "credits" || signupIntent === "subscription") {
        status = "awaiting_payment";
        reason = "Choose a paid plan to unlock the tools";
      }
      setState({
        loading: false,
        allowed,
        reason,
        planType,
        trialEndDate: trialEnd ? trialEnd.toISOString() : null,
        trialRemainingMs: remaining,
        trialCountdown: trialActive ? formatRemaining(remaining) : "",
        credits: creditBalance,
        status,
      });
    };

    const load = async () => {
      if (!configured) {
        setState({
          loading: false,
          allowed: true,
          reason: "Ready to use",
          planType: "none",
          trialEndDate: null,
          trialRemainingMs: 0,
          trialCountdown: "",
          credits: 0,
          status: "open",
        });
        return;
      }
      if (authLoading) return;
      if (!user) {
        setState({
          loading: false,
          allowed: false,
          reason: "Sign in to use this tool",
          planType: "none",
          trialEndDate: null,
          trialRemainingMs: 0,
          trialCountdown: "",
          credits: 0,
          status: "signed_out",
        });
        return;
      }

      const [profileResult, subscriptionResult, creditResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("trial_end_date,plan_type,signup_intent")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("subscriptions")
            .select("end_date,status")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("end_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("credits")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      if (!active) return;
      trialEnd = profileResult.data?.trial_end_date
        ? new Date(profileResult.data.trial_end_date)
        : null;
      subscriptionEnd = subscriptionResult.data?.end_date
        ? new Date(subscriptionResult.data.end_date)
        : null;
      creditBalance = creditResult.data?.balance || 0;
      planType = profileResult.data?.plan_type || "none";
      signupIntent = profileResult.data?.signup_intent || null;
      publish();
    };

    load().catch(
      () =>
        active &&
        setState((current) => ({
          ...current,
          loading: false,
          allowed: false,
          reason: "Access could not be verified",
          status: "error",
        })),
    );

    tickId = setInterval(publish, 1000);
    pollId = setInterval(() => {
      load().catch(() => {});
    }, 30000);

    return () => {
      active = false;
      clearInterval(tickId);
      clearInterval(pollId);
    };
  }, [configured, user, authLoading]);

  return state;
}
