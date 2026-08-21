import { defaultCustomization } from "./customization";

export const EDITOR_STORAGE_KEY = "baakanya-document-editor";

export function saveEditorDocument(payload) {
  const bundle = {
    ...payload,
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(bundle));
  return bundle;
}

export function loadEditorDocument() {
  try {
    const raw = sessionStorage.getItem(EDITOR_STORAGE_KEY);
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
  sessionStorage.removeItem(EDITOR_STORAGE_KEY);
}

export function buildStyledTemplate(template, customization = {}) {
  if (!template) return null;
  return {
    ...template,
    primary: customization.primary || template.primary,
    accent: customization.accent || template.accent,
    font: customization.font || template.font || "helvetica",
    density: customization.density || template.density || "comfortable",
    titles: {
      ...defaultCustomization.titles,
      ...(customization.titles || {}),
    },
    background: customization.background || "#ffffff",
  };
}
