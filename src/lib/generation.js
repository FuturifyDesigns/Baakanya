import { supabase } from "./supabase";
import { getDeviceFingerprint } from "./fingerprint";

async function invokeGenerationGate({ toolName, mode, draftKey }) {
  if (!supabase) return { allowed: true, accessType: "preview", charged: false };
  const device = await getDeviceFingerprint();
  const { data, error } = await supabase.functions.invoke("generation-gate", {
    body: {
      toolName,
      mode,
      ...(draftKey ? { draftKey } : {}),
      ...device,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.allowed) {
    throw new Error(
      data?.reason || "Your generation limit has been reached for now.",
    );
  }
  return data;
}

/** Soft check: can open the editor / start work. Does not deduct credits. */
export async function checkGenerationAccess(toolName) {
  return invokeGenerationGate({ toolName, mode: "check" });
}

/**
 * Consume access when the document is finalized (confirm / first download).
 * Pass a stable draftKey so re-download / repeat export does not double-charge.
 * Converter finalizes after a successful download, same as CV confirm.
 */
export async function finalizeGeneration(toolName, draftKey = null) {
  return invokeGenerationGate({
    toolName,
    mode: "consume",
    draftKey,
  });
}

/** @deprecated Prefer checkGenerationAccess / finalizeGeneration. Still charges. */
export async function authorizeGeneration(toolName) {
  return finalizeGeneration(toolName, null);
}
