import { getDeviceFingerprint } from "./fingerprint";
import { supabase } from "./supabase";

/** Ask trial-gate whether this browser/email can start a trial (no reservation). */
export async function checkTrialEligible(email) {
  if (!supabase || !email) {
    return { eligible: false, reason: "unavailable" };
  }
  const device = await getDeviceFingerprint();
  const { data, error } = await supabase.functions.invoke("trial-gate", {
    body: {
      mode: "check",
      email,
      ...device,
      clientTimestamp: new Date().toISOString(),
    },
  });
  if (error) {
    return { eligible: false, reason: "check_failed" };
  }
  if (data?.error) {
    return { eligible: false, reason: data.reason || "ineligible" };
  }
  return { eligible: Boolean(data?.eligible), reason: data?.reason || null };
}
