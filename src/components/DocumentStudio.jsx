import { Download, FolderOpen, Save } from "lucide-react";

export default function DocumentStudio({
  customization,
  onChange,
  onSave,
  onLoad,
  wordActions,
  message,
}) {
  return (
    <section className="document-studio">
      <div className="document-studio-head">
        <div>
          <span className="kicker">DOCUMENT STUDIO</span>
          <h3>Keep editing until it feels like yours.</h3>
          <p>
            Change the information above at any time, customise the final style,
            save a draft on this device, or download an editable Word copy.
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
        {wordActions.map((action) => (
          <button
            type="button"
            className="btn btn-ink"
            onClick={action.onClick}
            key={action.label}
          >
            <Download /> {action.label}
          </button>
        ))}
      </div>
      {message && (
        <div className="form-message" role="status">
          {message}
        </div>
      )}
    </section>
  );
}
