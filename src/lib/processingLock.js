let depth = 0;

/** Marks the app as busy so UI effects pause and the native cursor is used. */
export function beginProcessing() {
  depth += 1;
  if (depth === 1) {
    document.documentElement.classList.add("is-processing");
  }
}

export function endProcessing() {
  depth = Math.max(0, depth - 1);
  if (depth === 0) {
    document.documentElement.classList.remove("is-processing");
  }
}

/** Yield to the browser so pointer, scroll, and paint can stay responsive. */
export function yieldToMain() {
  return new Promise((resolve) => {
    if (typeof globalThis.scheduler?.yield === "function") {
      globalThis.scheduler.yield().then(resolve);
      return;
    }
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}
