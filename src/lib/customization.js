export const defaultSectionTitles = {
  profile: "Professional profile",
  experience: "Experience and achievements",
  education: "Education",
  skills: "Core skills",
  certifications: "Certifications",
};

/** Common Microsoft Word fonts (system stacks; PDF maps to built-in jsPDF faces). */
export const documentFonts = [
  {
    id: "arial",
    label: "Arial",
    css: 'Arial, Helvetica, "Segoe UI", sans-serif',
    pdf: "helvetica",
  },
  {
    id: "arial-narrow",
    label: "Arial Narrow",
    css: '"Arial Narrow", Arial, Helvetica, sans-serif',
    pdf: "helvetica",
  },
  {
    id: "calibri",
    label: "Calibri",
    css: 'Calibri, Carlito, "Segoe UI", Candara, sans-serif',
    pdf: "helvetica",
  },
  {
    id: "cambria",
    label: "Cambria",
    css: 'Cambria, "Times New Roman", Georgia, serif',
    pdf: "times",
  },
  {
    id: "candara",
    label: "Candara",
    css: 'Candara, Calibri, "Segoe UI", sans-serif',
    pdf: "helvetica",
  },
  {
    id: "century-gothic",
    label: "Century Gothic",
    css: '"Century Gothic", CenturyGothic, AppleGothic, sans-serif',
    pdf: "helvetica",
  },
  {
    id: "consolas",
    label: "Consolas",
    css: 'Consolas, "Lucida Console", Monaco, monospace',
    pdf: "courier",
  },
  {
    id: "constantia",
    label: "Constantia",
    css: 'Constantia, Georgia, "Times New Roman", serif',
    pdf: "times",
  },
  {
    id: "corbel",
    label: "Corbel",
    css: 'Corbel, Calibri, "Segoe UI", sans-serif',
    pdf: "helvetica",
  },
  {
    id: "courier-new",
    label: "Courier New",
    css: '"Courier New", Courier, monospace',
    pdf: "courier",
  },
  {
    id: "franklin-gothic",
    label: "Franklin Gothic",
    css: '"Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif',
    pdf: "helvetica",
  },
  {
    id: "garamond",
    label: "Garamond",
    css: 'Garamond, "EB Garamond", Georgia, serif',
    pdf: "times",
  },
  {
    id: "georgia",
    label: "Georgia",
    css: 'Georgia, "Times New Roman", Times, serif',
    pdf: "times",
  },
  {
    id: "helvetica",
    label: "Helvetica",
    css: 'Helvetica, Arial, "Segoe UI", sans-serif',
    pdf: "helvetica",
  },
  {
    id: "lucida-console",
    label: "Lucida Console",
    css: '"Lucida Console", Monaco, monospace',
    pdf: "courier",
  },
  {
    id: "lucida-sans",
    label: "Lucida Sans",
    css: '"Lucida Sans Unicode", "Lucida Grande", sans-serif',
    pdf: "helvetica",
  },
  {
    id: "palatino",
    label: "Palatino Linotype",
    css: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
    pdf: "times",
  },
  {
    id: "book-antiqua",
    label: "Book Antiqua",
    css: '"Book Antiqua", Palatino, Georgia, serif',
    pdf: "times",
  },
  {
    id: "segoe-ui",
    label: "Segoe UI",
    css: '"Segoe UI", Tahoma, Geneva, sans-serif',
    pdf: "helvetica",
  },
  {
    id: "tahoma",
    label: "Tahoma",
    css: 'Tahoma, Geneva, "Segoe UI", sans-serif',
    pdf: "helvetica",
  },
  {
    id: "times",
    label: "Times New Roman",
    css: '"Times New Roman", Times, Georgia, serif',
    pdf: "times",
  },
  {
    id: "times-new-roman",
    label: "Times New Roman",
    css: '"Times New Roman", Times, Georgia, serif',
    pdf: "times",
    hidden: true,
  },
  {
    id: "trebuchet",
    label: "Trebuchet MS",
    css: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    pdf: "helvetica",
  },
  {
    id: "verdana",
    label: "Verdana",
    css: 'Verdana, Geneva, Tahoma, sans-serif',
    pdf: "helvetica",
  },
  {
    id: "courier",
    label: "Courier",
    css: '"Courier New", Courier, monospace',
    pdf: "courier",
    hidden: true,
  },
];

/** Word-style line spacing multipliers. */
export const lineSpacingOptions = [
  { id: "1", label: "Single (1.0)", value: 1 },
  { id: "1.15", label: "1.15", value: 1.15 },
  { id: "1.5", label: "1.5", value: 1.5 },
  { id: "2", label: "Double (2.0)", value: 2 },
];

/** Section / block spacing (margins between CV sections, invoice rows, etc.). */
export const densityOptions = [
  { id: "compact", label: "Tight sections" },
  { id: "comfortable", label: "Normal sections" },
  { id: "spacious", label: "Open sections" },
];

/** Sensible defaults and allowed spacing per document kind. */
export const typographyByKind = {
  cv: {
    font: "calibri",
    lineSpacing: "1.15",
    density: "comfortable",
    lineSpacingIds: ["1", "1.15", "1.5"],
    densityIds: ["compact", "comfortable", "spacious"],
    hint: "CVs usually use Calibri or Arial with single or 1.15 spacing.",
  },
  cover: {
    font: "times",
    lineSpacing: "1.5",
    density: "comfortable",
    lineSpacingIds: ["1.15", "1.5", "2"],
    densityIds: ["comfortable", "spacious"],
    hint: "Cover letters often use Times New Roman or Georgia with 1.5 spacing.",
  },
  invoice: {
    font: "arial",
    lineSpacing: "1",
    density: "compact",
    lineSpacingIds: ["1", "1.15", "1.5"],
    densityIds: ["compact", "comfortable"],
    hint: "Invoices stay compact — Arial or Calibri with single spacing.",
  },
  quotation: {
    font: "arial",
    lineSpacing: "1",
    density: "compact",
    lineSpacingIds: ["1", "1.15", "1.5"],
    densityIds: ["compact", "comfortable"],
    hint: "Quotations stay compact — Arial or Calibri with single spacing.",
  },
};

export const defaultCustomization = {
  accent: "",
  primary: "",
  background: "#ffffff",
  font: "calibri",
  lineSpacing: "1.15",
  density: "comfortable",
  titles: { ...defaultSectionTitles },
};

const fontAlias = {
  helvetica: "helvetica",
  times: "times",
  courier: "courier-new",
  "times-new-roman": "times",
};

export function resolveFont(fontId) {
  const normalized = fontAlias[fontId] || fontId || "calibri";
  return (
    documentFonts.find((font) => font.id === normalized && !font.hidden) ||
    documentFonts.find((font) => font.id === normalized) ||
    documentFonts.find((font) => font.id === "calibri")
  );
}

export function fontCss(fontId) {
  return resolveFont(fontId).css;
}

export function fontPdf(fontId) {
  return resolveFont(fontId).pdf;
}

export function lineSpacingValue(lineSpacingId) {
  const match = lineSpacingOptions.find((row) => row.id === String(lineSpacingId));
  if (match) return match.value;
  const asNumber = Number(lineSpacingId);
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : 1.15;
}

export function lineSpacingOptionsFor(kind) {
  const config = typographyByKind[kind] || typographyByKind.cv;
  return lineSpacingOptions.filter((row) =>
    config.lineSpacingIds.includes(row.id),
  );
}

export function densityOptionsFor(kind) {
  const config = typographyByKind[kind] || typographyByKind.cv;
  return densityOptions.filter((row) => config.densityIds.includes(row.id));
}

export function visibleDocumentFonts() {
  return documentFonts.filter((font) => !font.hidden);
}

export function defaultsForKind(kind) {
  const config = typographyByKind[kind] || typographyByKind.cv;
  return {
    font: config.font,
    lineSpacing: config.lineSpacing,
    density: config.density,
  };
}
