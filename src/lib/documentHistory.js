import { supabase } from "./supabase";

export const LOCAL_DOCUMENT_HISTORY_KEY = "baakanya-document-history-v1";
const MAX_LOCAL_ITEMS = 50;

export function historyTitleForDraft(draft) {
  const form = draft.form || {};
  if (draft.kind === "cv") {
    return `${form.name?.trim() || "Untitled"} · CV`;
  }
  if (draft.kind === "cover") {
    return `${form.name?.trim() || "Untitled"} · Cover letter`;
  }
  if (draft.kind === "quotation") {
    return `${form.business?.trim() || form.client?.trim() || "Untitled"} · Quotation`;
  }
  return `${form.business?.trim() || form.client?.trim() || "Untitled"} · Invoice`;
}

function historyPayloadFromDraft(draft) {
  return {
    kind: draft.kind,
    draftKey: draft.draftKey,
    toolName: draft.toolName,
    templateId: draft.templateId,
    form: draft.form || {},
    letter: draft.letter || "",
    items: draft.items || [],
    vat: Boolean(draft.vat),
    photoData: draft.photoData || "",
    logoData: draft.logoData || "",
    customization: draft.customization || {},
    returnPath: draft.returnPath || "/workspace",
    billed: true,
  };
}

function readLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_DOCUMENT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(items) {
  try {
    localStorage.setItem(
      LOCAL_DOCUMENT_HISTORY_KEY,
      JSON.stringify(items.slice(0, MAX_LOCAL_ITEMS)),
    );
  } catch {
    /* quota */
  }
}

function upsertLocalHistory(record) {
  const items = readLocalHistory().filter(
    (row) => row.draft_key !== record.draft_key,
  );
  items.unshift(record);
  writeLocalHistory(items);
  return record;
}

function mapRow(row) {
  return {
    id: row.id,
    draft_key: row.draft_key,
    kind: row.kind,
    tool_name: row.tool_name,
    title: row.title,
    template_id: row.template_id,
    template_name: row.template_name,
    payload: row.payload,
    finalized_at: row.finalized_at,
    downloaded_at: row.downloaded_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    source: row.source || "remote",
  };
}

export async function upsertDocumentHistory(draft, templateName) {
  if (!draft?.draftKey || !draft?.kind) return null;

  const payload = historyPayloadFromDraft(draft);
  const record = {
    id: draft.historyId || crypto.randomUUID(),
    draft_key: draft.draftKey,
    kind: draft.kind,
    tool_name: draft.toolName || draft.kind,
    title: draft.historyTitle?.trim() || historyTitleForDraft(draft),
    template_id: draft.templateId,
    template_name: templateName || "Template",
    payload,
    finalized_at: draft.finalizedAt || new Date().toISOString(),
    downloaded_at: draft.downloadedAt || null,
    created_at: draft.historyCreatedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: "local",
  };

  upsertLocalHistory(record);

  if (!supabase) return mapRow(record);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return mapRow(record);

  const { data, error } = await supabase
    .from("document_history")
    .upsert(
      {
        user_id: userId,
        draft_key: record.draft_key,
        kind: record.kind,
        tool_name: record.tool_name,
        title: record.title,
        template_id: record.template_id,
        template_name: record.template_name,
        payload: record.payload,
        finalized_at: record.finalized_at,
        downloaded_at: record.downloaded_at,
        updated_at: record.updated_at,
      },
      { onConflict: "user_id,draft_key" },
    )
    .select("*")
    .single();

  if (error) {
    console.warn("document_history upsert failed", error.message);
    return mapRow(record);
  }

  return mapRow({ ...data, source: "remote" });
}

export async function listDocumentHistory() {
  const local = readLocalHistory().map((row) => mapRow(row));

  if (!supabase) {
    return local.sort(
      (a, b) =>
        new Date(b.finalized_at).getTime() - new Date(a.finalized_at).getTime(),
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return local;

  const { data, error } = await supabase
    .from("document_history")
    .select("*")
    .eq("user_id", userId)
    .order("finalized_at", { ascending: false })
    .limit(MAX_LOCAL_ITEMS);

  if (error) {
    console.warn("document_history list failed", error.message);
    return local;
  }

  const remote = (data || []).map((row) => mapRow({ ...row, source: "remote" }));
  writeLocalHistory(remote);
  return remote;
}

export async function updateDocumentHistoryTitle(id, title) {
  const nextTitle = String(title || "").trim();
  if (!nextTitle) throw new Error("Enter a name for this document.");

  const local = readLocalHistory();
  writeLocalHistory(
    local.map((row) =>
      row.id === id
        ? { ...row, title: nextTitle, updated_at: new Date().toISOString() }
        : row,
    ),
  );

  if (!supabase) return;

  const { error } = await supabase
    .from("document_history")
    .update({ title: nextTitle, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function markDocumentHistoryDownloaded(id) {
  const downloadedAt = new Date().toISOString();
  const local = readLocalHistory();
  writeLocalHistory(
    local.map((row) =>
      row.id === id ? { ...row, downloaded_at: downloadedAt } : row,
    ),
  );

  if (!supabase) return;

  await supabase
    .from("document_history")
    .update({ downloaded_at: downloadedAt, updated_at: downloadedAt })
    .eq("id", id);
}

export async function deleteDocumentHistory(id) {
  writeLocalHistory(readLocalHistory().filter((row) => row.id !== id));

  if (!supabase) return;

  const { error } = await supabase.from("document_history").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function clearLocalDocumentHistory() {
  try {
    localStorage.removeItem(LOCAL_DOCUMENT_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export function draftFromHistoryRecord(record) {
  return {
    ...record.payload,
    draftKey: record.draft_key,
    historyId: record.id,
    historyTitle: record.title,
    finalizedAt: record.finalized_at,
    downloadedAt: record.downloaded_at,
    historyCreatedAt: record.created_at,
    billed: true,
  };
}
