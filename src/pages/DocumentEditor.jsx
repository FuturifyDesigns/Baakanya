import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  loadEditorDocument,
  saveEditorDocument,
} from "../lib/documentEditorStore";
import { defaultCustomization, defaultSectionTitles } from "../lib/customization";
import {
  coverLetterTemplates,
  cvTemplates,
  invoiceTemplates,
  quotationTemplates,
} from "../lib/documentTemplates";
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

function EditorBody() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => loadEditorDocument());
  const [step, setStep] = useState("edit");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!draft) return;
    saveEditorDocument(draft);
  }, [draft]);

  const template = useMemo(
    () => (draft ? findTemplate(draft.kind, draft.templateId) : null),
    [draft],
  );
  const styledTemplate = useMemo(
    () => buildStyledTemplate(template, draft?.customization),
    [template, draft?.customization],
  );

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

  const customization = draft.customization || defaultCustomization;
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
    setMessage("Edits saved on this device.");
  };

  const goPreview = () => {
    persist();
    setConfirmed(false);
    setStep("preview");
    setMessage("Review the final preview, then confirm to unlock downloads.");
  };

  const confirmPreview = () => {
    setConfirmed(true);
    setStep("download");
    setMessage("Preview confirmed. You can download PDF or Word.");
  };

  const downloadPdf = () => {
    if (!confirmed) {
      setMessage("Confirm the final preview before downloading.");
      return;
    }
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
  };

  const downloadWord = () => {
    if (!confirmed) {
      setMessage("Confirm the final preview before downloading.");
      return;
    }
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
              onClick={() => {
                if (id === "download" && !confirmed) {
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
                        onChange={(e) => updateForm("expertise", e.target.value)}
                      />
                    </label>
                    <label>
                      Summary
                      <textarea
                        rows="4"
                        value={form.summary || ""}
                        onChange={(e) => updateForm("summary", e.target.value)}
                      />
                    </label>
                    <label>
                      Experience
                      <textarea
                        rows="7"
                        value={form.experience || ""}
                        onChange={(e) => updateForm("experience", e.target.value)}
                      />
                    </label>
                    <label>
                      Education
                      <textarea
                        rows="4"
                        value={form.education || ""}
                        onChange={(e) => updateForm("education", e.target.value)}
                      />
                    </label>
                    <label>
                      Skills
                      <textarea
                        rows="3"
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
                        onChange={(e) => updateForm("company", e.target.value)}
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
                        rows="14"
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
                        onChange={(e) => updateForm("business", e.target.value)}
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
                              updateItem(index, "description", e.target.value)
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

              {draft.kind === "cv" && (
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
              )}

              <div className="editor-panel">
                <h2>
                  <Palette size={16} /> Style · {template.name}
                </h2>
                <label>
                  Title / sidebar colour
                  <input
                    type="color"
                    value={customization.primary || template.primary}
                    onChange={(e) =>
                      updateCustomization({ primary: e.target.value })
                    }
                  />
                </label>
                <label>
                  Accent colour
                  <input
                    type="color"
                    value={customization.accent || template.accent}
                    onChange={(e) =>
                      updateCustomization({ accent: e.target.value })
                    }
                  />
                </label>
                <label>
                  Page background
                  <input
                    type="color"
                    value={customization.background || "#ffffff"}
                    onChange={(e) =>
                      updateCustomization({ background: e.target.value })
                    }
                  />
                </label>
                <label>
                  Typography
                  <select
                    value={customization.font || "helvetica"}
                    onChange={(e) =>
                      updateCustomization({ font: e.target.value })
                    }
                  >
                    <option value="helvetica">Clean sans serif</option>
                    <option value="times">Classic serif</option>
                    <option value="courier">Technical mono</option>
                  </select>
                </label>
                <label>
                  Spacing
                  <select
                    value={customization.density || "comfortable"}
                    onChange={(e) =>
                      updateCustomization({ density: e.target.value })
                    }
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </label>
                {(draft.photoData || draft.logoData) && (
                  <p className="editor-note">
                    {draft.kind === "cv" || draft.kind === "cover"
                      ? "Photo placement follows this template’s layout (sidebar, header band, or classic)."
                      : "Logo placement follows this template’s invoice/quotation layout."}
                  </p>
                )}
              </div>

              <div className="editor-actions">
                <button type="button" className="btn btn-outline" onClick={persist}>
                  <Save size={16} /> Save edits
                </button>
                <button type="button" className="btn btn-blue" onClick={goPreview}>
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
                  This is the document you will download. Confirm to unlock PDF
                  and Word.
                </p>
              </div>
              <div className="editor-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setStep("edit")}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="btn btn-blue"
                  onClick={confirmPreview}
                >
                  <Check size={16} /> Confirm final version
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
              Confirmed layout for <b>{template.name}</b>. Download PDF for
              sharing, or Word if you need further edits offline.
            </p>
            <div className="editor-actions">
              <button type="button" className="btn btn-blue" onClick={downloadPdf}>
                <Download size={16} /> Download PDF
              </button>
              <button type="button" className="btn btn-ink" onClick={downloadWord}>
                <Download size={16} /> Download Word
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep("edit")}
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
