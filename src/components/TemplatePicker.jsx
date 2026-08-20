import { Check } from "lucide-react";

export default function TemplatePicker({ label, templates, value, onChange }) {
  return (
    <section className="template-section">
      <div className="template-section-head">
        <div>
          <span className="kicker">CHOOSE A STYLE</span>
          <h3>{label}</h3>
        </div>
        <b>{templates.length} professional templates</b>
      </div>
      <div className="template-grid">
        {templates.map((template) => (
          <button
            type="button"
            className={`template-card ${value === template.id ? "selected" : ""}`}
            key={template.id}
            onClick={() => onChange(template.id)}
            aria-pressed={value === template.id}
          >
            <span
              className={`template-miniature ${template.layout}`}
              style={{
                "--template-primary": template.primary,
                "--template-accent": template.accent,
              }}
            >
              <i className="template-head" />
              <i />
              <i />
              <i />
              {template.photo !== "none" && <em className={template.photo} />}
            </span>
            <span className="template-card-copy">
              <b>{template.name}</b>
              <small>{template.description}</small>
            </span>
            {template.recommended && <mark>RECOMMENDED</mark>}
            {value === template.id && <Check className="template-check" />}
          </button>
        ))}
      </div>
    </section>
  );
}
