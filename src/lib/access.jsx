import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { checkTrialEligible } from "./trialEligibility";

const formatRemaining = (ms) => {
  if (ms <= 0) return "0d 00:00:00";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

function deriveCustomerContext({
  trialEnd,
  planType,
  subscriptionEnd,
  creditBalance,
  payments,
}) {
  const hasUsedTrial = Boolean(trialEnd);
  const hadSubscription = Boolean(subscriptionEnd);
  const hadCredits =
    planType === "credits" ||
    creditBalance > 0 ||
    (payments || []).some(
      (row) =>
        row.plan_type === "credits" &&
        (row.status === "approved" || row.status === "pending"),
    );
  const isReturningUser =
    hasUsedTrial ||
    hadSubscription ||
    hadCredits ||
    planType === "credits" ||
    planType === "subscription" ||
    planType === "trial" ||
    (payments || []).some((row) => row.status === "approved");

  return { hasUsedTrial, hadSubscription, hadCredits, isReturningUser };
}

const emptyState = (overrides = {}) => ({
  loading: false,
  allowed: false,
  reason: "Choose free trial or paid access to continue",
  planType: "none",
  signupIntent: null,
  pendingPlan: null,
  pendingSubmittedAt: null,
  trialEndDate: null,
  trialRemainingMs: 0,
  trialCountdown: "",
  subscriptionEndDate: null,
  subscriptionRemainingMs: 0,
  subscriptionCountdown: "",
  credits: 0,
  status: "unknown",
  hasUsedTrial: false,
  isReturningUser: false,
  trialEligible: null,
  hadSubscription: false,
  hadCredits: false,
  ...overrides,
});

const AccessContext = createContext(null);

export function AccessProvider({ children }) {
  const { configured, user, loading: authLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState(() =>
    emptyState({
      loading: configured,
      allowed: !configured,
      reason: configured ? "Checking access…" : "Ready to use",
      status: configured ? "unknown" : "open",
    }),
  );
  const snapshot = useRef({
    userId: null,
    trialEnd: null,
    subscriptionEnd: null,
    creditBalance: 0,
    planType: "none",
    signupIntent: null,
    pendingPlan: null,
    pendingSubmittedAt: null,
    hadSubscription: false,
    hadCredits: false,
    hasUsedTrial: false,
    isReturningUser: false,
    trialEligible: null,
  });

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let loadSequence = 0;
    let tickId;
    let pollId;
    let channel;

    const publish = () => {
      if (!active) return;
      if (user?.id && snapshot.current.userId !== user.id) return;
      const {
        trialEnd,
        subscriptionEnd,
        creditBalance,
        planType,
        signupIntent,
        pendingPlan,
        pendingSubmittedAt,
        hadSubscription,
        hadCredits,
        hasUsedTrial,
        isReturningUser,
        trialEligible,
      } = snapshot.current;
      const now = Date.now();
      const trialActive = Boolean(trialEnd && trialEnd.getTime() > now);
      const subscriptionActive = Boolean(
        subscriptionEnd && subscriptionEnd.getTime() > now,
      );
      const creditActive = creditBalance > 0;
      const allowed = Boolean(
        trialActive || subscriptionActive || creditActive,
      );
      const trialRemaining = trialActive ? trialEnd.getTime() - now : 0;
      const subscriptionRemaining = subscriptionActive
        ? subscriptionEnd.getTime() - now
        : 0;

      let status = "no_access";
      let reason = "Choose free trial or paid access to continue";

      if (trialActive) {
        status = "trial_active";
        reason = "Free trial active";
      } else if (subscriptionActive) {
        status = "subscription_active";
        reason = "Monthly access active";
      } else if (creditActive) {
        status = "credits_available";
        reason = `${creditBalance} credit${creditBalance === 1 ? "" : "s"} available`;
      } else if (pendingPlan) {
        status = "under_review";
        reason = "Your payment receipt is under admin review";
      } else if (trialEnd && trialEnd.getTime() <= now) {
        status = "trial_expired";
        reason = "Your free trial has ended";
      } else if (
        hadSubscription &&
        subscriptionEnd &&
        subscriptionEnd.getTime() <= now
      ) {
        status = "subscription_expired";
        reason = "Your monthly access has ended";
      } else if (
        (signupIntent === "credits" || signupIntent === "subscription") &&
        planType === "none" &&
        !trialEnd &&
        !hadSubscription
      ) {
        status = "awaiting_payment";
        reason =
          signupIntent === "credits"
            ? "Complete payment for credits to unlock the tools"
            : "Complete payment for monthly access to unlock the tools";
      } else if (planType === "credits" || (hadCredits && creditBalance <= 0)) {
        status = "credits_exhausted";
        reason = "You have no credits left";
      } else if (!signupIntent) {
        status = "awaiting_mode";
        reason = "Choose free trial or paid access to continue";
      }

      setState({
        loading: false,
        allowed,
        reason,
        planType,
        signupIntent,
        pendingPlan,
        pendingSubmittedAt,
        trialEndDate: trialEnd ? trialEnd.toISOString() : null,
        trialRemainingMs: trialRemaining,
        trialCountdown: trialActive ? formatRemaining(trialRemaining) : "",
        subscriptionEndDate: subscriptionEnd
          ? subscriptionEnd.toISOString()
          : null,
        subscriptionRemainingMs: subscriptionRemaining,
        subscriptionCountdown: subscriptionActive
          ? formatRemaining(subscriptionRemaining)
          : "",
        credits: creditBalance,
        status,
        hasUsedTrial,
        isReturningUser,
        trialEligible,
        hadSubscription,
        hadCredits,
      });
    };

    const load = async () => {
      if (!configured) {
        setState(
          emptyState({
            allowed: true,
            reason: "Ready to use",
            status: "open",
          }),
        );
        return;
      }
      if (authLoading) return;
      if (!user) {
        setState(
          emptyState({
            reason: "Sign in to use this tool",
            status: "signed_out",
          }),
        );
        return;
      }

      const sequence = ++loadSequence;

      const [profileResult, subscriptionResult, creditResult, pendingResult, paymentsResult] =
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
            .order("end_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("credits")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("payment_submissions")
            .select("plan_type,submitted_at,status")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .order("submitted_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("payment_submissions")
            .select("plan_type,status")
            .eq("user_id", user.id)
            .in("status", ["approved", "pending"]),
        ]);

      if (!active || sequence !== loadSequence) return;

      const queryError =
        profileResult.error ||
        subscriptionResult.error ||
        creditResult.error ||
        pendingResult.error ||
        paymentsResult.error;
      if (queryError) {
        setState((current) => ({ ...current, loading: false }));
        throw queryError;
      }

      const trialEnd = profileResult.data?.trial_end_date
        ? new Date(profileResult.data.trial_end_date)
        : null;
      const subscriptionRow = subscriptionResult.data;
      const subscriptionEnd = subscriptionRow?.end_date
        ? new Date(subscriptionRow.end_date)
        : null;
      const creditBalance = creditResult.data?.balance || 0;
      const planType = profileResult.data?.plan_type || "none";
      const payments = paymentsResult.data || [];
      const customer = deriveCustomerContext({
        trialEnd,
        planType,
        subscriptionEnd,
        creditBalance,
        payments,
      });
      const { hasUsedTrial, hadSubscription, hadCredits, isReturningUser } =
        customer;

      const previousEligibility =
        snapshot.current.userId === user.id
          ? snapshot.current.trialEligible
          : null;
      let trialEligible = hasUsedTrial ? false : previousEligibility;
      if (!hasUsedTrial && trialEligible == null && user.email) {
        try {
          const check = await checkTrialEligible(user.email);
          trialEligible = check.eligible;
        } catch {
          // An availability failure must not masquerade as a used trial.
          trialEligible = previousEligibility;
        }
      } else if (!hasUsedTrial && !user.email) {
        trialEligible = false;
      }

      if (!active || sequence !== loadSequence) return;

      snapshot.current = {
        userId: user.id,
        trialEnd,
        subscriptionEnd,
        creditBalance,
        planType,
        signupIntent: profileResult.data?.signup_intent || null,
        pendingPlan: pendingResult.data?.plan_type || null,
        pendingSubmittedAt: pendingResult.data?.submitted_at || null,
        hadSubscription,
        hadCredits,
        hasUsedTrial,
        isReturningUser,
        trialEligible,
      };
      publish();
    };

    load().catch(() => {
      if (!active) return;
      setState((current) => {
        if (current.status !== "unknown" && current.status !== "error") {
          return { ...current, loading: false };
        }
        return {
          ...current,
          loading: false,
          allowed: false,
          reason: "Access could not be verified",
          status: "error",
        };
      });
    });

    tickId = setInterval(publish, 1000);
    pollId = setInterval(() => {
      load().catch(() => {});
    }, 10000);

    if (configured && user && supabase) {
      // Unique topic per hook instance — Layout + ToolShell/etc. all call
      // useAccess(); reusing `access-${user.id}` returns an already-subscribed
      // channel and throws if more postgres_changes callbacks are added.
      const topic = `access-${user.id}-${Math.random().toString(36).slice(2, 10)}`;
      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "credits",
            filter: `user_id=eq.${user.id}`,
          },
          () => load().catch(() => {}),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${user.id}`,
          },
          () => load().catch(() => {}),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          () => load().catch(() => {}),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payment_submissions",
            filter: `user_id=eq.${user.id}`,
          },
          () => load().catch(() => {}),
        )
        .subscribe();
    }

    return () => {
      active = false;
      clearInterval(tickId);
      clearInterval(pollId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [configured, user, authLoading, refreshKey]);

  const value = { ...state, refresh };

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within AccessProvider");
  }
  return context;
}
