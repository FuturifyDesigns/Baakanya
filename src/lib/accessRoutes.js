/** Where a signed-in user should land based on access status. */
export function getAccessDestination(access, signupIntent) {
  if (!access || access.loading) return null;
  if (access.allowed) return "/workspace";
  if (access.status === "under_review") return "/access?step=review";
  if (access.status === "awaiting_mode") return "/access";
  if (access.status === "awaiting_payment") {
    const plan =
      signupIntent === "credits" || access.signupIntent === "credits"
        ? "credits"
        : "subscription";
    return `/access?step=pay&plan=${plan}`;
  }
  if (access.status === "trial_expired") {
    return "/access?reason=trial_ended";
  }
  if (access.status === "subscription_expired") {
    return "/access?reason=subscription_ended";
  }
  if (access.status === "credits_exhausted") {
    return "/access?reason=credits_ended";
  }
  // Unknown / no_access: force mode selection.
  return "/access";
}

export function isRenewalStatus(status) {
  return (
    status === "trial_expired" ||
    status === "subscription_expired" ||
    status === "credits_exhausted"
  );
}
