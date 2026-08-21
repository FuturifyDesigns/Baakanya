import { Download, FolderOpen, Save } from "lucide-react";
import { defaultSectionTitles } from "../lib/customization";

export default function DocumentStudio({
  customization,
  onChange,
  onSave,
  onLoad,
  wordActions,
  message,
  downloadEnabled = false,
  documentLabel = "document",
  pdfAction,
  showSectionTitles = false,
  children,
}) {
  const titles = { ...defaultSectionTitles, ...(customization.titles || {}) };
  const setTitle = (key, value) =>
    onChange({
      ...customization,
      titles: { ...titles, [key]: value },
    });

  return (
    <section
      className={`document-studio ${downloadEnabled ? "is-unlocked" : ""}`}
      id="document-studio"
      tabIndex={-1}
    >
      <div className="document-studio-head">
        <div>
          <span className="kicker">
            {downloadEnabled ? "FINAL EDIT STUDIO" : "DOCUMENT STUDIO"}
          </span>
          <h3>
            {downloadEnabled
              ? "Polish the wording, then download."
              : "Generate first, then finish edits here."}
          </h3>
          <p>
            {downloadEnabled
              ? `Edit the text like a Word draft. When it reads the way you want, save and download your ${documentLabel}.`
              : "After you generate, this studio unlocks for final wording, style tweaks, and downloads."}
          </p>
        </div>
        <div className="draft-actions">
          <button type="button" className="btn btn-outline" onClick={onSave}>
            <Save /> Save draft
          </button>
          <button type="button" className="btn btn-outline" onClick={onLoad}>
            <FolderOpen /> Load saved
          </button>
        </div>
      </div>

      {downloadEnabled && (children || showSectionTitles) && (
        <div className="studio-final-edit">
          {children}
          {showSectionTitles && (
            <div className="studio-title-grid">
              <span className="studio-subtitle">Section titles</span>
              {Object.entries(titles).map(([key, value]) => (
                <label key={key}>
                  {key}
                  <input
                    type="text"
                    maxLength="80"
                    value={value}
                    onChange={(event) => setTitle(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="studio-controls">
        <label>
          Accent colour
          <span className="colour-control">
            <input
              type="color"
              value={customization.accent || "#58bcec"}
              onChange={(event) =>
                onChange({ ...customization, accent: event.target.value })
              }
            />
            <button
              type="button"
              onClick={() => onChange({ ...customization, accent: "" })}
            >
              Use template colour
            </button>
          </span>
        </label>
        <label>
          Typography
          <select
            value={customization.font}
            onChange={(event) =>
              onChange({ ...customization, font: event.target.value })
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
            value={customization.density}
            onChange={(event) =>
              onChange({ ...customization, density: event.target.value })
            }
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
            <option value="spacious">Spacious</option>
          </select>
        </label>
      </div>

      <div className="word-actions">
        {pdfAction && (
          <button
            type="button"
            className="btn btn-blue"
            onClick={pdfAction.onClick}
            disabled={!downloadEnabled}
          >
            <Download /> {pdfAction.label}
          </button>
        )}
        {wordActions.map((action) => (
          <button
            type="button"
            className="btn btn-ink"
            onClick={action.onClick}
            key={action.label}
            disabled={!downloadEnabled}
          >
            <Download /> {action.label}
          </button>
        ))}
      </div>
      {!downloadEnabled && (
        <p className="generate-hint studio-locked-hint">
          Generate your {documentLabel} above to unlock this final edit studio and
          downloads.
        </p>
      )}
      {message && (
        <div className="form-message" role="status">
          {message}
        </div>
      )}
    </section>
  );
}
