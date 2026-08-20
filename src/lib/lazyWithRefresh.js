import { lazy } from "react";

const recoveryKey = "baakanya-deployment-refresh";
const refreshParameter = "app-refresh";

const isOutdatedChunkError = (error) =>
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|failed to load module script/i.test(
    String(error?.message || error || ""),
  );

const clearRecovery = () => {
  sessionStorage.removeItem(recoveryKey);
  const url = new URL(window.location.href);
  if (!url.searchParams.has(refreshParameter)) return;
  url.searchParams.delete(refreshParameter);
  window.history.replaceState(null, "", url);
};

export const recoverFromOutdatedChunk = (error) => {
  if (!isOutdatedChunkError(error) || sessionStorage.getItem(recoveryKey))
    return false;

  sessionStorage.setItem(recoveryKey, String(Date.now()));
  const url = new URL(window.location.href);
  url.searchParams.set(refreshParameter, String(Date.now()));
  window.location.replace(url);
  return true;
};

export const lazyWithRefresh = (importer) =>
  lazy(async () => {
    try {
      const module = await importer();
      clearRecovery();
      return module;
    } catch (error) {
      if (recoverFromOutdatedChunk(error)) {
        return new Promise(() => {});
      }
      throw error;
    }
  });
