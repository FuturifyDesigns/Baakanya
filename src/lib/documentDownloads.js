import { split } from "../components/DocumentPreview";
import { buildStyledTemplate } from "./documentEditorStore";
import {
  coverLetterTemplates,
  cvTemplates,
  invoiceTemplates,
  quotationTemplates,
} from "./documentTemplates";
import { renderBusinessPdf, renderCoverLetterPdf, renderCvPdf } from "./pdfTemplates";
import { exportBusinessWord, exportCoverWord, exportCvWord } from "./wordExport";
import { normalizeWebsite } from "./urls";

export function findDocumentTemplate(kind, templateId) {
  const list =
    kind === "cv"
      ? cvTemplates
      : kind === "cover"
        ? coverLetterTemplates
        : kind === "quotation"
          ? quotationTemplates
          : invoiceTemplates;
  return list.find((row) => row.id === templateId) || list[0];
}

export function styledTemplateForDraft(draft) {
  const template = findDocumentTemplate(draft.kind, draft.templateId);
  return buildStyledTemplate(template, draft.customization);
}

export function downloadDraftPdf(draft) {
  const styledTemplate = styledTemplateForDraft(draft);
  const form = draft.form || {};

  if (draft.kind === "cv") {
    renderCvPdf({
      form: {
        ...form,
        role: form.expertise,
        website: normalizeWebsite(form.website),
        linkedin: normalizeWebsite(form.linkedin),
      },
      template: styledTemplate,
      photoData: draft.photoData || null,
      skills: split(form.skills || ""),
    });
    return;
  }

  if (draft.kind === "cover") {
    renderCoverLetterPdf({
      form: {
        ...form,
        companyWebsite: normalizeWebsite(form.companyWebsite),
      },
      template: styledTemplate,
      photoData: draft.photoData || null,
      letter: draft.letter || "",
    });
    return;
  }

  renderBusinessPdf({
    kind: draft.kind === "quotation" ? "Quotation" : "Invoice",
    form,
    items: draft.items || [],
    vat: Boolean(draft.vat),
    template: styledTemplate,
    logoData: draft.logoData || null,
  });
}

export function downloadDraftWord(draft) {
  const styledTemplate = styledTemplateForDraft(draft);
  const customization = draft.customization || {};
  const form = draft.form || {};

  if (draft.kind === "cv") {
    exportCvWord({
      form: {
        ...form,
        role: form.expertise,
        website: normalizeWebsite(form.website),
        linkedin: normalizeWebsite(form.linkedin),
      },
      skills: split(form.skills || ""),
      template: styledTemplate,
      customization,
      photoData: draft.photoData || "",
    });
    return;
  }

  if (draft.kind === "cover") {
    exportCoverWord({
      form: {
        ...form,
        companyWebsite: normalizeWebsite(form.companyWebsite),
      },
      letter: draft.letter || "",
      template: styledTemplate,
      customization,
      photoData: draft.photoData || "",
    });
    return;
  }

  exportBusinessWord({
    kind: draft.kind === "quotation" ? "Quotation" : "Invoice",
    form,
    items: draft.items || [],
    vat: Boolean(draft.vat),
    template: styledTemplate,
    customization,
    logoData: draft.logoData || "",
  });
}

export function kindLabel(kind) {
  if (kind === "cv") return "CV";
  if (kind === "cover") return "Cover letter";
  if (kind === "quotation") return "Quotation";
  return "Invoice";
}
