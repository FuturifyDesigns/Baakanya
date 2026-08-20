import { supabase } from "./supabase";
import { getDeviceFingerprint } from "./fingerprint";

export async function authorizeGeneration(toolName) {
  if (!supabase) return { allowed: true, accessType: "preview" };
  const device = await getDeviceFingerprint();
  const { data, error } = await supabase.functions.invoke("generation-gate", {
    body: { toolName, ...device },
  });
  if (error) throw error;
  if (!data?.allowed) {
    throw new Error(
      data?.reason || "Your generation limit has been reached for now.",
    );
  }
  return data;
}
