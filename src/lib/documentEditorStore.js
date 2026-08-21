import { defaultCustomization } from "./customization";
import { EDITOR_DRAFT_KEY } from "./draftStore";

export const EDITOR_STORAGE_KEY = EDITOR_DRAFT_KEY;

function readRaw() {
  try {
    return (
      localStorage.getItem(EDITOR_STORAGE_KEY) ||
      sessionStorage.getItem(EDITOR_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export function saveEditorDocument(payload) {
  const bundle = {
    ...payload,
    savedAt: new Date().toISOString(),
    autosaved: true,
  };
  const raw = JSON.stringify(bundle);
  try {
    localStorage.setItem(EDITOR_STORAGE_KEY, raw);
  } catch {
    /* quota */
  }
  try {
    sessionStorage.setItem(EDITOR_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
  return bundle;
}

export function loadEditorDocument() {
  try {
    const raw = readRaw();
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      ...data,
      customization: {
        ...defaultCustomization,
        ...(data.customization || {}),
        titles: {
          ...defaultCustomization.titles,
          ...(data.customization?.titles || {}),
        },
      },
    };
  } catch {
    return null;
  }
}

export function clearEditorDocument() {
  try {
    localStorage.removeItem(EDITOR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(EDITOR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildStyledTemplate(template, customization = {}) {
  if (!template) return null;
  return {
    ...template,
    primary: customization.primary || template.primary,
    accent: customization.accent || template.accent,
    font: customization.font || template.font || "calibri",
    density: customization.density || template.density || "comfortable",
    lineSpacing:
      customization.lineSpacing || template.lineSpacing || "1.15",
    titles: {
      ...defaultCustomization.titles,
      ...(template.titles || {}),
      ...(customization.titles || {}),
    },
    background:
      customization.background || template.background || "#ffffff",
    headingStyle: template.headingStyle || "underline",
    ruleStyle: template.ruleStyle || "accent",
  };
}
