import { useAccess } from "./access";
import { getAccessDestination, isRenewalStatus } from "./accessRoutes";
import { useAuth } from "./auth";

/** Resolve public calls to action from an already-loaded access snapshot. */
export function getAccessCta({
  user,
  isAdmin,
  authLoading,
  roleLoading,
  access,
}) {
  if (authLoading) {
    return {
      href: "/access",
      label: "Checking access…",
      signedIn: false,
    };
  }

  if (!user) {
    return {
      href: "/auth?mode=signup",
      label: "Create free account",
      signedIn: false,
    };
  }

  if (isAdmin && !roleLoading) {
    return { href: "/admin", label: "Open admin", signedIn: true };
  }

  const href = getAccessDestination(access) || "/access";

  if (access.loading || roleLoading) {
    return { href, label: "Checking access…", signedIn: true };
  }
  if (access.allowed) {
    return { href: "/workspace", label: "Open workspace", signedIn: true };
  }
  if (access.status === "under_review") {
    return { href, label: "View payment status", signedIn: true };
  }
  if (access.status === "awaiting_payment") {
    return { href, label: "Finish setup", signedIn: true };
  }
  if (
    access.trialEligible === false ||
    access.hasUsedTrial ||
    isRenewalStatus(access.status)
  ) {
    return { href, label: "Choose paid access", signedIn: true };
  }
  if (access.trialEligible === true) {
    return { href: "/access", label: "Start seven days free", signedIn: true };
  }

  return { href, label: "Choose your access", signedIn: true };
}

/** Keep public calls to action aligned with the current user's access state. */
export function useAccessCta() {
  const {
    user,
    isAdmin,
    loading: authLoading,
    roleLoading,
  } = useAuth();
  const access = useAccess();
  return getAccessCta({ user, isAdmin, authLoading, roleLoading, access });
}
