import { Check } from "lucide-react";
import {
  BusinessDocumentPreview,
  CoverDocumentPreview,
  CvDocumentPreview,
} from "./DocumentPreview";

const sampleCv = {
  name: "Kago Molefe",
  expertise: "Management Consultant",
  email: "kago@email.com",
  phone: "+267 71 000 000",
  location: "Gaborone",
  website: "",
  linkedin: "",
  summary:
    "Results-driven consultant advising organisations across Botswana on growth, delivery and operations.",
  experience:
    "Senior Consultant, FutureWorks — Led multi-client delivery programmes and process improvement workstreams.",
  education: "BCom Management, University of Botswana",
  certifications: "Project Management Professional (in progress)",
};

const sampleSkills = ["Strategy", "Analysis", "Stakeholder management"];

const sampleCover = {
  name: "Kago Molefe",
  email: "kago@email.com",
  phone: "+267 71 000 000",
  location: "Gaborone",
  role: "Consultant",
  company: "Botswana Enterprise",
};

const sampleLetter = `Dear Hiring Manager,

I am writing to express my interest in the Consultant role at Botswana Enterprise. My background in delivery and stakeholder work aligns closely with your needs.

I would welcome the opportunity to discuss how I can contribute.

Yours sincerely,
Kago Molefe`;

const sampleBusiness = {
  business: "Kgetsi Studio",
  client: "Serowe Retail Co.",
  number: "INV-204",
  date: "2026-08-20",
  dueDate: "2026-09-05",
  validUntil: "2026-09-20",
  notes: "Payment due within 14 days.",
};

const sampleItems = [
  { description: "Brand identity package", qty: 1, price: 2800 },
  { description: "Print-ready artwork", qty: 2, price: 450 },
  { description: "Revision round", qty: 1, price: 350 },
];

function money(value) {
  return Number(value || 0).toLocaleString("en-BW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function TemplatePreview({ template }) {
  const business = ["invoice", "quotation"].includes(template.type);
  const cover = template.type === "cover";

  return (
    <span
      className="template-preview-stage"
      style={{
        "--template-primary": template.primary,
        "--template-accent": template.accent,
      }}
    >
      <span className="template-thumb-frame" aria-hidden="true">
        <span className="template-thumb-scale">
          {business ? (
            <BusinessDocumentPreview
              kind={template.type === "quotation" ? "Quotation" : "Invoice"}
              form={sampleBusiness}
              items={sampleItems}
              vat={false}
              template={template}
              money={money}
              compact
            />
          ) : cover ? (
            <CoverDocumentPreview
              form={sampleCover}
              template={template}
              letter={sampleLetter}
              compact
            />
          ) : (
            <CvDocumentPreview
              form={sampleCv}
              template={template}
              skills={sampleSkills}
              compact
            />
          )}
        </span>
      </span>
    </span>
  );
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
