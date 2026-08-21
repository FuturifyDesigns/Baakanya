import { fontCss, lineSpacingValue } from "../lib/customization";

const split = (text) =>
  String(text || "")
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

const fontFamily = (font) => fontCss(font);

const densityGap = (density) => {
  if (density === "compact") return "compact";
  if (density === "spacious") return "spacious";
  return "comfortable";
};

const spacingClass = (lineSpacing) => {
  const value = lineSpacingValue(lineSpacing);
  if (value <= 1.05) return "spacing-1";
  if (value <= 1.25) return "spacing-115";
  if (value <= 1.75) return "spacing-15";
  return "spacing-2";
};

/** Split free text into role/education blocks for a traditional CV look. */
const parseEntries = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const blocks = raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length > 1) {
    return blocks.map((block) => {
      const lines = block
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const head = lines[0] || "";
      const rest = lines.slice(1).map((line) => line.replace(/^[-•*]\s*/, ""));
      const dated = head.match(/^(.*?)(?:\s+[—–\-]\s+|\s+\(|\s{2,})(.+)$/);
      if (dated && dated[1].length > 2) {
        return {
          title: dated[1].trim(),
          meta: dated[2].replace(/^\(|\)$/g, "").trim(),
          points: rest,
        };
      }
      return { title: head, meta: "", points: rest };
    });
  }
  const lines = raw
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 1) {
    return [{ title: lines[0], meta: "", points: [] }];
  }
  if (lines.every((line) => /^[-•*]/.test(line))) {
    return [
      {
        title: "",
        meta: "",
        points: lines.map((line) => line.replace(/^[-•*]\s*/, "")),
      },
    ];
  }
  return [
    {
      title: lines[0],
      meta: "",
      points: lines.slice(1).map((line) => line.replace(/^[-•*]\s*/, "")),
    },
  ];
};

function ContactLines({ form, stacked = false }) {
  const parts = [
    form.email,
    form.phone,
    form.location,
    form.website,
    form.linkedin,
  ].filter(Boolean);
  if (!parts.length) {
    return (
      <p className="doc-contact doc-placeholder is-placeholder">
        email · phone · location
      </p>
    );
  }
  if (stacked) {
    return (
      <ul className="doc-contact-stack">
        {parts.map((part) => (
          <li key={part}>{part}</li>
        ))}
      </ul>
    );
  }
  return <p className="doc-contact">{parts.join("  ·  ")}</p>;
}

function PhotoSlot({ photoUrl, shape }) {
  if (shape === "none") return null;
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`doc-photo ${shape}`} />;
  }
  return (
    <span
      className={`doc-photo doc-photo-placeholder ${shape}`}
      aria-hidden="true"
    />
  );
}

function SectionHeading({ children }) {
  return (
    <div className="doc-section-head">
      <strong>{children}</strong>
    </div>
  );
}

function EntryList({ text, emptyTitle, emptyPoints }) {
  const entries = parseEntries(text);
  if (!entries.length) {
    return (
      <div className="doc-entry is-placeholder">
        {emptyTitle && (
          <div className="doc-entry-head">
            <span>{emptyTitle}</span>
          </div>
        )}
        <ul>
          {emptyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    );
  }
  return entries.map((entry, index) => (
    <article className="doc-entry" key={`${entry.title}-${index}`}>
      {entry.points.length > 0 ? (
        <>
          {(entry.title || entry.meta) && (
            <div className="doc-entry-head">
              <span>{entry.title}</span>
              {entry.meta && <em>{entry.meta}</em>}
            </div>
          )}
          <ul>
            {entry.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </>
      ) : entry.meta ? (
        <div className="doc-entry-head">
          <span>{entry.title}</span>
          <em>{entry.meta}</em>
        </div>
      ) : (
        <p className="doc-entry-single">{entry.title}</p>
      )}
    </article>
  ));
}

function SkillsBlock({ skills, stacked = false }) {
  const list = skills.length
    ? skills
    : ["Client service", "Team coordination", "Microsoft Office"];
  const empty = !skills.length;
  if (stacked) {
    return (
      <ul className={`doc-skill-stack ${empty ? "is-placeholder" : ""}`}>
        {list.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className={`doc-skill-line ${empty ? "is-placeholder" : ""}`}>
      {list.join("  ·  ")}
    </p>
  );
}

function CvSections({ form, skills, sidebarSkills, titles }) {
  const heading = {
    profile: titles?.profile || "Professional profile",
    experience: titles?.experience || "Experience and achievements",
    education: titles?.education || "Education",
    skills: titles?.skills || "Core skills",
    certifications: titles?.certifications || "Certifications",
  };
  return (
    <>
      <section>
        <SectionHeading>{heading.profile}</SectionHeading>
        <p className={`doc-body ${form.summary ? "" : "is-placeholder"}`}>
          {form.summary ||
            "A concise professional summary appears here — strengths, focus areas, and the roles you are targeting."}
        </p>
      </section>
      <section>
        <SectionHeading>{heading.experience}</SectionHeading>
        <EntryList
          text={form.experience}
          emptyTitle="Role title, Employer — Dates"
          emptyPoints={[
            "Key responsibility or achievement with measurable impact",
            "Second achievement showing scope, tools or results",
            "Additional contribution relevant to the target role",
          ]}
        />
      </section>
      <section>
        <SectionHeading>{heading.education}</SectionHeading>
        <EntryList
          text={form.education}
          emptyTitle="Qualification, Institution — Year"
          emptyPoints={["Relevant coursework, distinction or project focus"]}
        />
      </section>
      {!sidebarSkills && (
        <section>
          <SectionHeading>{heading.skills}</SectionHeading>
          <SkillsBlock skills={skills} />
        </section>
      )}
      <section>
        <SectionHeading>{heading.certifications}</SectionHeading>
        <p
          className={`doc-body ${form.certifications ? "" : "is-placeholder"}`}
        >
          {form.certifications ||
            "Licences and certificates appear here when added."}
        </p>
      </section>
    </>
  );
}

export function CvDocumentPreview({
  form,
  template,
  skills = [],
  photoUrl,
  compact = false,
}) {
  const expertise = form.expertise || form.role || "Professional headline";
  const layout = template?.layout || "minimal";
  const sidebar = layout === "sidebar";
  const style = {
    "--doc-primary": template?.primary || "#17252d",
    "--doc-accent": template?.accent || "#58bcec",
    "--doc-bg": template?.background || "#ffffff",
    fontFamily: fontFamily(template?.font),
    background: template?.background || "#ffffff",
    "--doc-line-height": String(lineSpacingValue(template?.lineSpacing)),
  };

  return (
    <div
      className={`doc-sheet cv-sheet layout-${layout} density-${densityGap(template?.density)} ${spacingClass(template?.lineSpacing)} ${compact ? "is-thumb" : ""}`}
      style={style}
    >
      {sidebar && (
        <aside className="doc-sidebar">
          <PhotoSlot photoUrl={photoUrl} shape={template?.photo || "none"} />
          <h3>{form.name || "Your name"}</h3>
          <p
            className={`doc-side-role ${form.expertise || form.role ? "" : "is-placeholder"}`}
          >
            {expertise}
          </p>
          <div className="doc-side-block">
            <strong>Contact</strong>
            <ContactLines form={form} stacked />
          </div>
          <div className="doc-side-block">
            <strong>Skills</strong>
            <SkillsBlock skills={skills} stacked />
          </div>
        </aside>
      )}
      <div className="doc-main">
        {layout === "band" && (
          <header className="doc-band">
            <div>
              <h3>{form.name || "Your name"}</h3>
              <b className={form.expertise || form.role ? "" : "is-placeholder"}>
                {expertise}
              </b>
            </div>
            <PhotoSlot photoUrl={photoUrl} shape={template?.photo || "none"} />
          </header>
        )}
        {layout !== "sidebar" && layout !== "band" && (
          <header className="doc-classic-head">
            <div className="doc-classic-copy">
              <h3>{form.name || "Your name"}</h3>
              <p
                className={`doc-expertise-line ${form.expertise || form.role ? "" : "is-placeholder"}`}
              >
                {expertise}
              </p>
              <ContactLines form={form} />
            </div>
            <PhotoSlot photoUrl={photoUrl} shape={template?.photo || "none"} />
          </header>
        )}
        {layout === "band" && (
          <div className="doc-band-contact">
            <ContactLines form={form} />
          </div>
        )}
        <CvSections
          form={form}
          skills={skills}
          sidebarSkills={sidebar}
          titles={template?.titles}
        />
      </div>
    </div>
  );
}

export function CoverDocumentPreview({
  form,
  template,
  letter,
  photoUrl,
  compact = false,
}) {
  const layout = template?.layout || "minimal";
  // Cover letters never use the CV two-column sidebar grid — rail chrome only.
  const sheetLayout =
    layout === "sidebar" ? "rail" : layout === "band" ? "band" : "minimal";
  const style = {
    "--doc-primary": template?.primary || "#17252d",
    "--doc-accent": template?.accent || "#58bcec",
    "--doc-bg": template?.background || "#ffffff",
    fontFamily: fontFamily(template?.font),
    background: template?.background || "#ffffff",
    "--doc-line-height": String(lineSpacingValue(template?.lineSpacing)),
  };
  const lightHeader = sheetLayout === "band";
  const showRail = layout === "sidebar";
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const paragraphs = String(
    letter ||
      "Dear Hiring Manager,\n\nYour cover letter will appear here once you generate it. Keep the tone clear, specific and professional.\n\nYours sincerely,\nYour name",
  )
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div
      className={`doc-sheet cover-sheet layout-${sheetLayout} density-${densityGap(template?.density)} ${spacingClass(template?.lineSpacing)} ${compact ? "is-thumb" : ""} ${showRail ? "has-rail" : ""}`}
      style={style}
    >
      {showRail && <div className="doc-cover-chrome sidebar-chrome" aria-hidden="true" />}
      <div className="doc-main">
        <header className={lightHeader ? "cover-head-light" : "cover-head"}>
          <div className="cover-identity">
            <h3>{form.name || "Your name"}</h3>
            <p className="doc-contact">
              {[form.email, form.phone, form.location]
                .filter(Boolean)
                .join("  ·  ") || "email · phone · location"}
            </p>
          </div>
          <PhotoSlot photoUrl={photoUrl} shape={template?.photo || "none"} />
        </header>
        <span className={`doc-rule full ${lightHeader ? "light-rule" : ""}`} />

        <div className="cover-letterhead">
          <p className="cover-date">{today}</p>
          <div className="cover-recipient">
            <strong>{form.hiringManager || "Hiring Manager"}</strong>
            <span>{form.company || "Company name"}</span>
            {form.companyWebsite && <span>{form.companyWebsite}</span>}
          </div>
          <p className="cover-subject">
            <b>Re:</b>{" "}
            {form.role
              ? `Application for ${form.role}`
              : "Application for the advertised role"}
          </p>
        </div>

        <div className={`cover-body-stack ${letter ? "" : "is-placeholder"}`}>
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="preline cover-body">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BusinessDocumentPreview({
  kind,
  form,
  items,
  vat,
  template,
  logoUrl,
  money,
  compact = false,
}) {
  const isQuote = kind === "Quotation";
  const layout = template?.layout || (isQuote ? "proposal" : "classic");
  const style = {
    "--doc-primary": template?.primary || "#17313d",
    "--doc-accent": template?.accent || "#58bcec",
    "--doc-bg": template?.background || "#ffffff",
    fontFamily: fontFamily(template?.font),
    background: template?.background || "#ffffff",
    "--doc-line-height": String(lineSpacingValue(template?.lineSpacing)),
  };
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
    0,
  );
  const vatAmount = vat ? subtotal * 0.14 : 0;
  const total = subtotal + vatAmount;
  const format =
    money ||
    ((value) =>
      Number(value || 0).toLocaleString("en-BW", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }));
  const rows = items.length
    ? items.slice(0, 8)
    : [
        { description: "Brand identity package", qty: 1, price: 2800 },
        { description: "Print-ready artwork sets", qty: 2, price: 450 },
        { description: "Revision round", qty: 1, price: 350 },
      ];
  const showBand = layout === "band" || layout === "proposal";
  const showSide = layout === "side";
  const showEstimateBar = layout === "estimate" || layout === "scope";

  return (
    <div
      className={`doc-sheet business-sheet layout-${layout} density-${densityGap(template?.density)} ${spacingClass(template?.lineSpacing)} ${compact ? "is-thumb" : ""} ${isQuote ? "is-quotation" : "is-invoice"}`}
      style={style}
    >
      {(showBand || showSide) && (
        <div
          className={`doc-business-chrome ${showSide ? "side-chrome" : "band-chrome"}`}
        />
      )}
      <div className="doc-main">
        <header className={`business-doc-head ${isQuote ? "quote-head" : ""}`}>
          <div className="business-brand">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="doc-logo" />
            ) : (
              <span className="doc-logo-fallback">
                {(form.business || "B").slice(0, 2).toUpperCase()}
              </span>
            )}
            <div>
              <b>{form.business || "Your business"}</b>
              <small className="doc-biz-sub">
                {[form.email, form.phone, form.address]
                  .filter(Boolean)
                  .join(" · ") || "Business contact details"}
              </small>
            </div>
          </div>
          <div className="business-doc-title">
            <h3>{isQuote ? "QUOTATION" : "INVOICE"}</h3>
            <span>
              {isQuote ? "Quote" : "No."} {form.number || "001"}
            </span>
            {isQuote && (
              <em className="quote-badge">
                {layout === "estimate"
                  ? "Estimate"
                  : layout === "scope"
                    ? "Scope of work"
                    : "Proposal"}
              </em>
            )}
          </div>
        </header>

        {showEstimateBar && (
          <div className="quote-validity-bar">
            <span>
              Valid until{" "}
              <b>{form.validUntil || "20 Sep 2026"}</b>
            </span>
            <span>Not a tax invoice</span>
          </div>
        )}

        <div className={`business-preview-meta ${isQuote ? "quote-meta" : ""}`}>
          <span>
            {isQuote ? "Prepared for" : "Bill to"}
            <b>{form.client || "Client name"}</b>
            {form.clientEmail && <em>{form.clientEmail}</em>}
          </span>
          <span>
            Issue date
            <b>{form.date || "20 Aug 2026"}</b>
          </span>
          {isQuote ? (
            <span>
              Valid until
              <b>{form.validUntil || "20 Sep 2026"}</b>
            </span>
          ) : (
            <span>
              Due date
              <b>{form.dueDate || "05 Sep 2026"}</b>
            </span>
          )}
          <span>
            Currency
            <b>BWP (P)</b>
          </span>
        </div>

        <div
          className={`business-preview-items detailed ${isQuote ? "quote-items" : ""}`}
        >
          <div>
            <b>{isQuote ? "Deliverable / item" : "Description"}</b>
            <b>Qty</b>
            <b>Unit</b>
            <b>Amount</b>
          </div>
          {rows.map((item, index) => (
            <div key={index}>
              <span>{item.description || "Item or service"}</span>
              <span>{item.qty || 0}</span>
              <span>P {format(item.price || 0)}</span>
              <span>
                P {format(Number(item.qty || 0) * Number(item.price || 0))}
              </span>
            </div>
          ))}
        </div>

        <div className="business-footer-grid">
          <div className="business-terms">
            <strong>{isQuote ? "Quote notes" : "Payment details"}</strong>
            <p>
              {form.notes ||
                (isQuote
                  ? "This quotation is valid until the date shown. Acceptance confirms the scope and pricing above."
                  : "Bank transfer · Include invoice number as reference · Payment due within stated terms.")}
            </p>
            {isQuote && (
              <p className="quote-accept-hint">
                To accept: reply confirming this quote number, or request an
                invoice to proceed.
              </p>
            )}
          </div>
          <dl className={`business-totals ${isQuote ? "quote-totals" : ""}`}>
            <div>
              <dt>Subtotal</dt>
              <dd>P {format(subtotal || 4050)}</dd>
            </div>
            {vat && (
              <div>
                <dt>VAT (14%)</dt>
                <dd>P {format(vatAmount)}</dd>
              </div>
            )}
            <div className="grand">
              <dt>{isQuote ? "Quote total" : "Total due"}</dt>
              <dd>P {format(total || 4050)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export { split, parseEntries };
