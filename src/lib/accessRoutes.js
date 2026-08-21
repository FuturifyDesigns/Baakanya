/** Where a signed-in user should land based on access status. */
export function getAccessDestination(access, signupIntent) {
  if (!access || access.loading) return null;
  if (access.allowed) return "/workspace";
  if (access.status === "awaiting_mode") return "/access";
  if (access.status === "awaiting_payment") {
    const plan =
      signupIntent === "credits" || access.signupIntent === "credits"
        ? "credits"
        : "subscription";
    return `/access?step=pay&plan=${plan}`;
  }
  if (access.status === "trial_expired") {
    return "/access?step=pay&reason=trial_ended";
  }
  // Unknown / no_access: force mode selection, never claim a trial ended.
  return "/access";
}
