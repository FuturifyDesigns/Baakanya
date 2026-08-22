import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  Palette,
  Save,
  Type,
} from "lucide-react";
import Layout from "../components/Layout";
import RequireAuth from "../components/RequireAuth";
import {
  BusinessDocumentPreview,
  CoverDocumentPreview,
  CvDocumentPreview,
  split,
} from "../components/DocumentPreview";
import {
  buildStyledTemplate,
  clearToolFormDraft,
  finishDocumentSession,
  loadEditorDocument,
  saveEditorDocument,
} from "../lib/documentEditorStore";
import { defaultCustomization, defaultSectionTitles, densityOptionsFor, lineSpacingOptionsFor, typographyByKind, visibleDocumentFonts } from "../lib/customization";
import {
  coverLetterTemplates,
  cvTemplates,
  invoiceTemplates,
  quotationTemplates,
} from "../lib/documentTemplates";
import { finalizeGeneration } from "../lib/generation";
import { useAccess } from "../lib/access";
import { getAccessDestination } from "../lib/accessRoutes";
import { useAutoSave } from "../lib/draftStore";
import { renderBusinessPdf, renderCoverLetterPdf, renderCvPdf } from "../lib/pdfTemplates";
import { exportBusinessWord, exportCoverWord, exportCvWord } from "../lib/wordExport";
import { normalizeWebsite } from "../lib/urls";

const money = (n) =>
  Number(n || 0).toLocaleString("en-BW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const findTemplate = (kind, templateId) => {
  const list =
    kind === "cv"
      ? cvTemplates
      : kind === "cover"
        ? coverLetterTemplates
        : kind === "quotation"
          ? quotationTemplates
          : invoiceTemplates;
  return list.find((row) => row.id === templateId) || list[0];
};

const kindLabel = (kind) => {
  if (kind === "cv") return "CV";
  if (kind === "cover") return "cover letter";
  if (kind === "quotation") return "quotation";
  return "invoice";
};

const toolNameFor = (draft) => {
  if (draft.toolName) return draft.toolName;
  if (draft.kind === "cv") return "cv";
  if (draft.kind === "cover") return "cover_letter";
  if (draft.kind === "quotation") return "quotation";
  return "invoice";
};

function EditorColorInput({ label, value, onLiveChange, onCommit }) {
  return (
    <label>
      {label}
      <input
        type="color"
        value={value}
        onInput={(event) => onLiveChange(event.currentTarget.value)}
        onChange={(event) => onLiveChange(event.currentTarget.value)}
        onPointerUp={(event) => onCommit(event.currentTarget.value)}
        onBlur={(event) => onCommit(event.currentTarget.value)}
      />
    </label>
  );
}

function EditorBody() {
  const navigate = useNavigate();
  const access = useAccess();
  const [draft, setDraft] = useState(() => loadEditorDocument());
  const [step, setStep] = useState("edit");
  const [confirmed, setConfirmed] = useState(() =>
    Boolean(loadEditorDocument()?.billed),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Credits are only used when you confirm the final version — not when you open the editor.",
  );

  const [liveStyle, setLiveStyle] = useState({});

  useEffect(() => {
    if (!draft) return;
    const timer = window.setTimeout(() => saveEditorDocument(draft), 350);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const autosaveStatus = useAutoSave(
    draft ? "baakanya-document-editor" : "",
    draft || {},
    { enabled: Boolean(draft), delay: 500 },
  );

  const template = useMemo(
    () => (draft ? findTemplate(draft.kind, draft.templateId) : null),
    [draft],
  );
  const customization = draft?.customization || defaultCustomization;
  const activeCustomization = useMemo(
    () => ({ ...customization, ...liveStyle }),
    [customization, liveStyle],
  );
  const styledTemplate = useMemo(
    () => (template ? buildStyledTemplate(template, activeCustomization) : null),
    [template, activeCustomization],
  );

  if (!access.loading && !access.allowed) {
    return <Navigate to={getAccessDestination(access) || "/access"} replace />;
  }

  if (!draft || !template) {
    return (
      <Layout>
        <section className="container editor-missing">
          <h1>No document to edit</h1>
          <p>Generate a CV, cover letter, invoice or quotation first.</p>
          <Link className="btn btn-blue" to="/workspace">
            Back to workspace
          </Link>
        </section>
      </Layout>
    );
  }

  const form = draft.form || {};
  const updateForm = (key, value) =>
    setDraft((current) => ({
      ...current,
      form: { ...current.form, [key]: value },
    }));
  const updateCustomization = (patch) =>
    setDraft((current) => ({
      ...current,
      customization: { ...current.customization, ...patch },
    }));
  const commitStyleColor = (key, value) => {
    setLiveStyle((current) => {
      if (current[key] === undefined) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    updateCustomization({ [key]: value });
  };
  const updateTitle = (key, value) =>
    updateCustomization({
      titles: {
        ...defaultSectionTitles,
        ...(customization.titles || {}),
        [key]: value,
      },
    });
  const updateItem = (index, key, value) =>
    setDraft((current) => {
      const items = [...(current.items || [])];
      items[index] = { ...items[index], [key]: value };
      return { ...current, items };
    });

  const persist = () => {
    saveEditorDocument(draft);
    setMessage("Edits saved on this device. Autosave is also on.");
  };

  const goPreview = () => {
    persist();
    if (!draft.billed) setConfirmed(false);
    setStep("preview");
    setMessage(
      draft.billed
        ? "Review your document. Downloads stay unlocked for this draft."
        : "Review the final preview. Confirming uses one credit (or trial/subscription allowance).",
    );
  };

  const ensureFinalized = async () => {
    if (draft.billed) return { charged: false, alreadyFinalized: true };
    const draftKey = draft.draftKey || crypto.randomUUID();
    const result = await finalizeGeneration(toolNameFor(draft), draftKey);
    setDraft((current) => ({
      ...current,
      draftKey,
      billed: true,
    }));
    access.refresh?.();
    return result;
  };

  const markDocumentComplete = () => {
    clearToolFormDraft(draft.kind);
    setMessage(
      "Download saved. The form is cleared — start a new document when you are ready.",
    );
  };

  const confirmPreview = async () => {
    setBusy(true);
    setMessage("Confirming final version…");
    try {
      const result = await ensureFinalized();
      setConfirmed(true);
      setStep("download");
      if (result?.alreadyFinalized) {
        setMessage("Already confirmed for this draft. PDF and Word are ready.");
      } else if (result?.accessType === "credits" && result?.charged) {
        setMessage(
          `Final version confirmed. One credit used${
            typeof result.remainingCredits === "number"
              ? ` · ${result.remainingCredits} left`
              : ""
          }.`,
        );
      } else {
        setMessage("Final version confirmed. You can download PDF or Word.");
      }
    } catch (error) {
      setConfirmed(false);
      setMessage(error.message || "Could not confirm this document.");
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!confirmed && !draft.billed) {
      setMessage("Confirm the final preview before downloading.");
      setStep("preview");
      return;
    }
    setBusy(true);
    try {
      await ensureFinalized();
      setConfirmed(true);
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
      } else if (draft.kind === "cover") {
        renderCoverLetterPdf({
          form: {
            ...form,
            companyWebsite: normalizeWebsite(form.companyWebsite),
          },
          template: styledTemplate,
          photoData: draft.photoData || null,
          letter: draft.letter || "",
        });
      } else {
        renderBusinessPdf({
          kind: draft.kind === "quotation" ? "Quotation" : "Invoice",
          form,
          items: draft.items || [],
          vat: Boolean(draft.vat),
          template: styledTemplate,
          logoData: draft.logoData || null,
        });
      }
      markDocumentComplete();
    } catch (error) {
      setMessage(error.message || "Download blocked until access is confirmed.");
    } finally {
      setBusy(false);
    }
  };

  const downloadWord = async () => {
    if (!confirmed && !draft.billed) {
      setMessage("Confirm the final preview before downloading.");
      setStep("preview");
      return;
    }
    setBusy(true);
    try {
      await ensureFinalized();
      setConfirmed(true);
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
          customization: activeCustomization,
          photoData: draft.photoData || "",
        });
      } else if (draft.kind === "cover") {
        exportCoverWord({
          form: {
            ...form,
            companyWebsite: normalizeWebsite(form.companyWebsite),
          },
          letter: draft.letter || "",
          template: styledTemplate,
          customization: activeCustomization,
          photoData: draft.photoData || "",
        });
      } else {
        exportBusinessWord({
          kind: draft.kind === "quotation" ? "Quotation" : "Invoice",
          form,
          items: draft.items || [],
          vat: Boolean(draft.vat),
          template: styledTemplate,
          customization: activeCustomization,
          logoData: draft.logoData || "",
        });
      }
      markDocumentComplete();
    } catch (error) {
      setMessage(error.message || "Download blocked until access is confirmed.");
    } finally {
      setBusy(false);
    }
  };

  const startNewDocument = () => {
    finishDocumentSession(draft.kind);
    navigate(draft.returnPath || "/workspace", {
      state: { freshDocument: true, completedKind: draft.kind },
    });
  };

  const previewNode =
    draft.kind === "cv" ? (
      <CvDocumentPreview
        form={form}
        template={styledTemplate}
        skills={split(form.skills || "")}
        photoUrl={draft.photoData || ""}
      />
    ) : draft.kind === "cover" ? (
      <CoverDocumentPreview
        form={form}
        template={styledTemplate}
        letter={draft.letter || ""}
        photoUrl={draft.photoData || ""}
      />
    ) : (
      <BusinessDocumentPreview
        kind={draft.kind === "quotation" ? "Quotation" : "Invoice"}
        form={form}
        items={draft.items || []}
        vat={Boolean(draft.vat)}
        template={styledTemplate}
        logoUrl={draft.logoData || ""}
        money={money}
      />
    );

  const stylePanel = (
    <div className="editor-panel">
      <h2>
        <Palette size={16} /> Style · {template.name}
      </h2>
      <div className="editor-color-row">
        <EditorColorInput
          label="Title / sidebar"
          value={activeCustomization.primary || template.primary}
          onLiveChange={(value) =>
            setLiveStyle((current) => ({ ...current, primary: value }))
          }
          onCommit={(value) => commitStyleColor("primary", value)}
        />
        <EditorColorInput
          label="Accent"
          value={activeCustomization.accent || template.accent}
          onLiveChange={(value) =>
            setLiveStyle((current) => ({ ...current, accent: value }))
          }
          onCommit={(value) => commitStyleColor("accent", value)}
        />
        <EditorColorInput
          label="Background"
          value={activeCustomization.background || "#ffffff"}
          onLiveChange={(value) =>
            setLiveStyle((current) => ({ ...current, background: value }))
          }
          onCommit={(value) => commitStyleColor("background", value)}
        />
      </div>
      <label>
        Font (Word-style)
        <select
          value={customization.font || "calibri"}
          onChange={(e) => updateCustomization({ font: e.target.value })}
        >
          {visibleDocumentFonts().map((font) => (
            <option key={font.id} value={font.id} style={{ fontFamily: font.css }}>
              {font.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Line spacing
        <select
          value={customization.lineSpacing || "1.15"}
          onChange={(e) =>
            updateCustomization({ lineSpacing: e.target.value })
          }
        >
          {lineSpacingOptionsFor(draft.kind).map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Section spacing
        <select
          value={customization.density || "comfortable"}
          onChange={(e) => updateCustomization({ density: e.target.value })}
        >
          {densityOptionsFor(draft.kind).map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <p className="editor-note">
        {(typographyByKind[draft.kind] || typographyByKind.cv).hint}
        {(draft.photoData || draft.logoData) &&
          (draft.kind === "cv" || draft.kind === "cover"
            ? " Photo placement follows this template’s layout."
            : " Logo placement follows this template’s layout.")}
      </p>
    </div>
  );

  const titlesPanel =
    draft.kind === "cv" ? (
      <div className="editor-panel">
        <h2>
          <Type size={16} /> Section titles
        </h2>
        {Object.entries({
          ...defaultSectionTitles,
          ...(customization.titles || {}),
        }).map(([key, value]) => (
          <label key={key}>
            {key}
            <input
              value={value}
              onChange={(e) => updateTitle(key, e.target.value)}
            />
          </label>
        ))}
      </div>
    ) : null;

  return (
    <Layout>
      <section className="document-editor-page container">
        <div className="editor-topbar">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate(draft.returnPath || "/workspace")}
          >
            <ArrowLeft size={16} /> Back to form
          </button>
          <div>
            <span className="kicker">DOCUMENT EDITOR</span>
            <h1>
              Edit your {kindLabel(draft.kind)} · {template.name}
            </h1>
            <p className="editor-billing-hint">
              {draft.billed
                ? "This draft is confirmed — PDF and Word stay unlocked."
                : "Edit freely. One credit (or trial use) is taken only when you confirm."}
            </p>
            {autosaveStatus && (
              <p className="autosave-status" role="status">
                {autosaveStatus}
              </p>
            )}
          </div>
        </div>

        <nav className="editor-steps" aria-label="Editor steps">
          {[
            ["edit", "1. Edit"],
            ["preview", "2. Preview"],
            ["download", "3. Download"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={step === id ? "active" : ""}
              disabled={busy}
              onClick={() => {
                if (id === "download" && !confirmed && !draft.billed) {
                  setMessage("Confirm the preview before opening downloads.");
                  setStep("preview");
                  return;
                }
                setStep(id);
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {step === "edit" && (
          <div className="editor-layout">
            <aside className="editor-controls">
              <div className="editor-controls-scroll">
                {stylePanel}
                {titlesPanel}
                <div className="editor-panel">
                  <h2>
                    <Type size={16} /> Content
                  </h2>
                  {draft.kind === "cv" && (
                    <>
                      <label>
                        Full name
                        <input
                          value={form.name || ""}
                          onChange={(e) => updateForm("name", e.target.value)}
                        />
                      </label>
                      <label>
                        Headline
                        <input
                          value={form.expertise || ""}
                          onChange={(e) =>
                            updateForm("expertise", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Summary
                        <textarea
                          rows="3"
                          value={form.summary || ""}
                          onChange={(e) =>
                            updateForm("summary", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Experience
                        <textarea
                          rows="5"
                          value={form.experience || ""}
                          onChange={(e) =>
                            updateForm("experience", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Education
                        <textarea
                          rows="3"
                          value={form.education || ""}
                          onChange={(e) =>
                            updateForm("education", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Skills
                        <textarea
                          rows="2"
                          value={form.skills || ""}
                          onChange={(e) => updateForm("skills", e.target.value)}
                        />
                      </label>
                      <label>
                        Certifications
                        <textarea
                          rows="2"
                          value={form.certifications || ""}
                          onChange={(e) =>
                            updateForm("certifications", e.target.value)
                          }
                        />
                      </label>
                    </>
                  )}
                  {draft.kind === "cover" && (
                    <>
                      <label>
                        Full name
                        <input
                          value={form.name || ""}
                          onChange={(e) => updateForm("name", e.target.value)}
                        />
                      </label>
                      <label>
                        Company
                        <input
                          value={form.company || ""}
                          onChange={(e) =>
                            updateForm("company", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Role
                        <input
                          value={form.role || ""}
                          onChange={(e) => updateForm("role", e.target.value)}
                        />
                      </label>
                      <label>
                        Letter text
                        <textarea
                          rows="10"
                          value={draft.letter || ""}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              letter: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </>
                  )}
                  {(draft.kind === "invoice" || draft.kind === "quotation") && (
                    <>
                      <label>
                        Business
                        <input
                          value={form.business || ""}
                          onChange={(e) =>
                            updateForm("business", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Client
                        <input
                          value={form.client || ""}
                          onChange={(e) => updateForm("client", e.target.value)}
                        />
                      </label>
                      <label>
                        Notes / payment details
                        <textarea
                          rows="3"
                          value={form.notes || ""}
                          onChange={(e) => updateForm("notes", e.target.value)}
                        />
                      </label>
                      <div className="editor-items">
                        <span className="studio-subtitle">Line items</span>
                        {(draft.items || []).map((item, index) => (
                          <div className="studio-item-row" key={index}>
                            <input
                              value={item.description || ""}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Description"
                            />
                            <input
                              type="number"
                              value={item.qty || ""}
                              onChange={(e) =>
                                updateItem(index, "qty", e.target.value)
                              }
                              placeholder="Qty"
                            />
                            <input
                              type="number"
                              value={item.price || ""}
                              onChange={(e) =>
                                updateItem(index, "price", e.target.value)
                              }
                              placeholder="Price"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="editor-actions editor-actions-sticky">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={persist}
                  disabled={busy}
                >
                  <Save size={16} /> Save
                </button>
                <button
                  type="button"
                  className="btn btn-blue"
                  onClick={goPreview}
                  disabled={busy}
                >
                  <Eye size={16} /> Preview final
                </button>
              </div>
            </aside>

            <div className="editor-canvas">
              <div className="preview-label">
                <Eye size={14} /> Live edit · {template.name}
              </div>
              <div className="editor-canvas-sheet">{previewNode}</div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="editor-preview-step">
            <div className="editor-preview-head">
              <div>
                <span className="kicker">FINAL PREVIEW</span>
                <h2>Does this look ready?</h2>
                <p>
                  {draft.billed
                    ? "This draft was already confirmed. You can download again."
                    : "Confirming uses one credit (or your trial/subscription allowance). Leaving without confirming keeps your credits."}
                </p>
              </div>
              <div className="editor-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setStep("edit")}
                  disabled={busy}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="btn btn-blue"
                  onClick={confirmPreview}
                  disabled={busy}
                >
                  <Check size={16} />{" "}
                  {draft.billed ? "Continue to download" : "Confirm final version"}
                </button>
              </div>
            </div>
            <div className="editor-preview-stage">{previewNode}</div>
          </div>
        )}

        {step === "download" && (
          <div className="editor-download-step">
            <span className="kicker">DOWNLOAD</span>
            <h2>Your {kindLabel(draft.kind)} is ready</h2>
            <p>
              Confirmed layout for <b>{template.name}</b>. PDF and Word use the
              same confirmed draft — no extra credit. After you download, the
              form clears so you can pick a new template.
            </p>
            <div className="editor-actions">
              <button
                type="button"
                className="btn btn-blue"
                onClick={downloadPdf}
                disabled={busy}
              >
                <Download size={16} /> Download PDF
              </button>
              <button
                type="button"
                className="btn btn-ink"
                onClick={downloadWord}
                disabled={busy}
              >
                <Download size={16} /> Download Word
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={startNewDocument}
                disabled={busy}
              >
                Start new document
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep("edit")}
                disabled={busy}
              >
                Back to edits
              </button>
            </div>
            <div className="editor-preview-stage compact">{previewNode}</div>
          </div>
        )}

        {message && (
          <div className="form-message" role="status">
            {message}
          </div>
        )}
      </section>
    </Layout>
  );
}

export default function DocumentEditor() {
  return (
    <RequireAuth title="Sign in to edit your document">
      <EditorBody />
    </RequireAuth>
  );
}
