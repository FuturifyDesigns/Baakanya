import { useEffect, useRef, useState } from "react";

/** Persist JSON drafts to localStorage with debounce + flush on leave. */
export function useAutoSave(storageKey, payload, options = {}) {
  const { delay = 700, enabled = true } = options;
  const payloadRef = useRef(payload);
  const skipFirst = useRef(true);
  const [status, setStatus] = useState("");

  payloadRef.current = payload;

  useEffect(() => {
    if (!enabled || !storageKey) return undefined;
    if (skipFirst.current) {
      skipFirst.current = false;
      return undefined;
    }
    setStatus("Saving draft…");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...payloadRef.current,
            savedAt: new Date().toISOString(),
            autosaved: true,
          }),
        );
        setStatus(
          `Draft autosaved · ${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`,
        );
      } catch {
        setStatus("Could not autosave — storage may be full.");
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [storageKey, payload, delay, enabled]);

  useEffect(() => {
    if (!enabled || !storageKey) return undefined;
    const flush = () => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...payloadRef.current,
            savedAt: new Date().toISOString(),
            autosaved: true,
          }),
        );
      } catch {
        /* ignore quota / private mode */
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [storageKey, enabled]);

  return status;
}

export function readLocalDraft(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLocalDraft(storageKey) {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}

export function writeLocalDraft(storageKey, payload) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      ...payload,
      savedAt: new Date().toISOString(),
    }),
  );
}

export const CAREER_DRAFT_KEY = "baakanya-career-draft";
export const BUSINESS_DRAFT_KEY = "baakanya-business-draft";
export const EDITOR_DRAFT_KEY = "baakanya-document-editor";
