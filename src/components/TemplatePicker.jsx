import { Check } from "lucide-react";

function CareerPreview({ template }) {
  const cover = template.type === "cover";
  return <span className={`template-paper ${template.layout} ${cover ? "cover-paper" : "cv-paper"}`} style={{ "--template-primary": template.primary, "--template-accent": template.accent }}>
    <span className="paper-brand"><b>{cover ? "K. Molefe" : "KAGO MOLEFE"}</b><i /></span>
    {template.photo !== "none" && <em className={`paper-photo ${template.photo}`} />}
    {cover ? <>
      <span className="paper-date">20 AUGUST 2026</span>
      <strong>Dear Hiring Manager,</strong>
      <i className="paper-line wide" /><i className="paper-line" /><i className="paper-line wide" />
      <i className="paper-line wide" /><i className="paper-line short" />
      <span className="paper-sign">Kago Molefe</span>
    </> : <>
      <span className="paper-contact">Expertise · Gaborone · +267</span>
      <strong>PROFILE</strong><i className="paper-line wide" /><i className="paper-line" />
      <strong>EXPERIENCE</strong><i className="paper-line wide" /><i className="paper-line wide" /><i className="paper-line short" />
      <strong>EDUCATION</strong><i className="paper-line" />
      <strong>SKILLS</strong><span className="paper-skills"><i /><i /><i /></span>
    </>}
  </span>;
}

function BusinessPreview({ template }) {
  const quote = template.type === "quotation";
  return <span className={`template-paper business-paper ${template.layout}`}>
    <span className="paper-business"><em>KM</em><b>KGETSI STUDIO</b></span>
    <span className="paper-doc-title">{quote ? "QUOTATION" : "INVOICE"}</span>
    <span className="paper-meta"><i /><i /></span>
    <span className="paper-table-head"><i /><i /><i /></span>
    <span className="paper-table-row"><i /><i /><i /></span>
    <span className="paper-table-row"><i /><i /><i /></span>
    <span className="paper-table-row"><i /><i /><i /></span>
    <span className="paper-total"><span>TOTAL</span><b>P 4,250.00</b></span>
  </span>;
}

function TemplatePreview({ template }) {
  const business = ["invoice", "quotation"].includes(template.type);
  return <span className="template-preview-stage" style={{ "--template-primary": template.primary, "--template-accent": template.accent }}>
    {business ? <BusinessPreview template={template} /> : <CareerPreview template={template} />}
  </span>;
}

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
            <TemplatePreview template={template} />
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
