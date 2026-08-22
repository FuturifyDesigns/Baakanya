import { supabase } from "./supabase";

const GRACE_KEY = "baakanya-finalized-grace";

function readGraceKeys() {
  try {
    const raw = sessionStorage.getItem(GRACE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeGraceKeys(keys) {
  try {
    sessionStorage.setItem(GRACE_KEY, JSON.stringify([...new Set(keys)].slice(0, 20)));
  } catch {
    /* ignore */
  }
}

/** Remember a draft the user already paid to finalize (this browser session). */
export function registerFinalizedDraft(draftKey) {
  if (!draftKey) return;
  writeGraceKeys([draftKey, ...readGraceKeys()]);
}

export function clearFinalizedDraft(draftKey) {
  if (!draftKey) return;
  writeGraceKeys(readGraceKeys().filter((key) => key !== draftKey));
}

export function hasFinalizedGrace(draftKey) {
  if (!draftKey) return false;
  return readGraceKeys().includes(draftKey);
}

/** Server truth: this draft_key was charged via document_finalizations. */
export async function verifyFinalizedOnServer(draftKey, { strict = false } = {}) {
  if (!draftKey) return false;
  if (!supabase) return hasFinalizedGrace(draftKey);

  const { data, error } = await supabase
    .from("document_finalizations")
    .select("id")
    .eq("draft_key", draftKey)
    .maybeSingle();

  if (error) {
    console.warn("finalization verify failed", error.message);
    return strict ? false : hasFinalizedGrace(draftKey);
  }
  return Boolean(data);
}

export function canAccessPaidEditor(access, draft) {
  if (access?.allowed) return true;
  if (!draft?.draftKey) return false;
  return hasFinalizedGrace(draft.draftKey);
}

export async function canDownloadHistoryRecord(access, record) {
  if (access?.allowed) return true;
  const draftKey = record?.draft_key || record?.payload?.draftKey;
  if (!draftKey || !record?.payload?.billed) return false;
  return verifyFinalizedOnServer(draftKey, { strict: true });
}

export function renewalDestination(access) {
  if (!access || access.loading || access.allowed) return null;
  if (access.status === "trial_expired") return "/access?reason=trial_ended";
  if (access.status === "subscription_expired") {
    return "/access?reason=subscription_ended";
  }
  if (access.status === "credits_exhausted") return "/access?reason=credits_ended";
  return "/access";
}
