import { Check } from "lucide-react";
import {
  BusinessDocumentPreview,
  CoverDocumentPreview,
  CvDocumentPreview,
} from "./DocumentPreview";

const sampleCv = {
  name: "Kago Molefe",
  expertise: "Hospitality Supervisor",
  email: "kago.molefe@email.com",
  phone: "+267 71 234 567",
  location: "Gaborone, Botswana",
  website: "",
  linkedin: "linkedin.com/in/kagomolefe",
  summary:
    "Hospitality supervisor with six years’ experience leading front-of-house teams in hotels and lodges. Known for calm service recovery, staff coaching and on-time shift operations.",
  experience: `Front Office Supervisor, Cresta Lodge — 2022–Present
Led a team of 8 across check-in, concierge and guest relations
Raised guest satisfaction scores from 86% to 94% in 12 months
Introduced a handover checklist that cut shift errors by 30%

Guest Services Associate, Masa Hotel — 2019–2022
Managed arrivals for conference and leisure guests
Trained three junior associates on PMS and complaint handling`,
  education: `Diploma in Hospitality Management, Botho University — 2019
Certificate in Food Safety, Botswana Bureau of Standards — 2021`,
  certifications: "First Aid Level 1 · Food Safety Certificate",
};

const sampleSkills = [
  "Guest relations",
  "Team leadership",
  "Opera PMS",
  "Cash handling",
  "Conflict resolution",
];

const sampleCover = {
  name: "Kago Molefe",
  email: "kago.molefe@email.com",
  phone: "+267 71 234 567",
  location: "Gaborone, Botswana",
  role: "Front Office Supervisor",
  company: "Cresta Hotels",
  companyWebsite: "www.crestahotels.com",
  hiringManager: "Ms. Thabo Dube",
};

const sampleLetter = `Dear Ms. Dube,

I am writing to apply for the Front Office Supervisor role at Cresta Hotels. Over the past six years I have led guest-facing teams, improved satisfaction scores and kept busy shifts running smoothly.

At Cresta Lodge I supervise eight colleagues, coach new starters and own the evening service recovery process. Guests regularly mention clear communication and reliable follow-through.

I would welcome the chance to bring the same hospitality standards to your property and am available for an interview at your convenience.

Yours sincerely,
Kago Molefe`;

const sampleBusiness = {
  business: "Kgetsi Studio",
  client: "Serowe Retail Co.",
  clientEmail: "accounts@seroweretail.co.bw",
  number: "INV-204",
  date: "20 Aug 2026",
  dueDate: "05 Sep 2026",
  validUntil: "20 Sep 2026",
  email: "accounts@kgetsi.co.bw",
  phone: "+267 390 0000",
  address: "Plot 123, Gaborone",
  notes:
    "Bank: FNB Botswana · Acc 62870770297 · Branch 283567 · Quote invoice number as payment reference.",
};

const sampleItems = [
  { description: "Brand identity package", qty: 1, price: 2800 },
  { description: "Print-ready artwork sets", qty: 2, price: 450 },
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
