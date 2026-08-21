const split = (text) =>
  String(text || "")
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

const fontFamily = (font) => {
  if (font === "times") return '"Times New Roman", Times, serif';
  if (font === "courier") return "Courier New, Courier, monospace";
  return "Helvetica, Arial, sans-serif";
};

const densityGap = (density) => {
  if (density === "compact") return "compact";
  if (density === "spacious") return "spacious";
  return "comfortable";
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
    return <p className="doc-contact">{stacked ? "Contact details" : "Contact details"}</p>;
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
  return <span className={`doc-photo doc-photo-placeholder ${shape}`} aria-hidden="true" />;
}

function CvSections({ form, skills, showSkills }) {
  return (
    <>
      <section>
        <strong>Professional profile</strong>
        <p className="preline">
          {form.summary ||
            "Your professional summary will appear here as you type."}
        </p>
      </section>
      <section>
        <strong>Experience and achievements</strong>
        <p className="preline">
          {form.experience || "Add roles, projects and achievements."}
        </p>
      </section>
      <section>
        <strong>Education</strong>
        <p className="preline">
          {form.education || "Add your education background."}
        </p>
      </section>
      {showSkills && (
        <section>
          <strong>Core skills</strong>
          <p>
            {(skills.length ? skills : ["Strategy", "Communication", "Delivery"]).join(
              "  ·  ",
            )}
          </p>
        </section>
      )}
      {(form.certifications || "").trim() && (
        <section>
          <strong>Certifications</strong>
          <p className="preline">{form.certifications}</p>
        </section>
      )}
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
  const expertise = form.expertise || form.role || "Your expertise";
  const layout = template?.layout || "minimal";
  const style = {
    "--doc-primary": template?.primary || "#17252d",
    "--doc-accent": template?.accent || "#58bcec",
    fontFamily: fontFamily(template?.font),
  };

  return (
    <div
      className={`doc-sheet cv-sheet layout-${layout} density-${densityGap(template?.density)} ${compact ? "is-thumb" : ""}`}
      style={style}
    >
      {layout === "sidebar" && (
        <aside className="doc-sidebar">
          <PhotoSlot photoUrl={photoUrl} shape={template?.photo || "none"} />
          <h3>{form.name || "Your name"}</h3>
          <ContactLines form={form} stacked />
        </aside>
      )}
      <div className="doc-main">
        {layout === "band" && (
          <header className="doc-band">
            <div>
              <h3>{form.name || "Your name"}</h3>
              <b>{expertise}</b>
            </div>
            <PhotoSlot photoUrl={photoUrl} shape={template?.photo || "none"} />
          </header>
        )}
        {layout !== "sidebar" && layout !== "band" && (
          <header className="doc-classic-head">
            <div>
              <h3>{form.name || "Your name"}</h3>
              <b className="doc-expertise-line">{expertise}</b>
              <span className="doc-rule" />
              <ContactLines form={form} />
            </div>
            <PhotoSlot photoUrl={photoUrl} shape={template?.photo || "none"} />
          </header>
        )}
        {layout === "band" && <ContactLines form={form} />}
        <CvSections form={form} skills={skills} showSkills />
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
  const style = {
    "--doc-primary": template?.primary || "#17252d",
    "--doc-accent": template?.accent || "#58bcec",
    fontFamily: fontFamily(template?.font),
  };
  const lightHeader = layout === "band";
  return (
    <div
      className={`doc-sheet cover-sheet layout-${layout} density-${densityGap(template?.density)} ${compact ? "is-thumb" : ""}`}
      style={style}
    >
      {layout === "sidebar" && <div className="doc-cover-chrome sidebar-chrome" />}
      <div className="doc-main">
        <header className={lightHeader ? "cover-head-light" : "cover-head"}>
          <div>
            <h3>{form.name || "Your name"}</h3>
            <p className="doc-contact">
              {[form.email, form.phone, form.location].filter(Boolean).join("  ·  ") ||
                "Contact details"}
            </p>
          </div>
          <PhotoSlot photoUrl={photoUrl} shape={template?.photo || "none"} />
        </header>
        {!lightHeader && <span className="doc-rule full" />}
        {lightHeader && <span className="doc-rule full light-rule" />}
        <p className="cover-meta">
          {[form.company, form.role].filter(Boolean).join(" · ") ||
            "Target company · Target role"}
        </p>
        <p className="preline cover-body">
          {letter ||
            "Dear Hiring Manager,\n\nYour cover letter will appear here once you generate it.\n\nYours sincerely,\nYour name"}
        </p>
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
  const layout = template?.layout || "classic";
  const style = {
    "--doc-primary": template?.primary || "#17313d",
    "--doc-accent": template?.accent || "#58bcec",
    fontFamily: fontFamily(template?.font),
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

  return (
    <div
      className={`doc-sheet business-sheet layout-${layout} density-${densityGap(template?.density)} ${compact ? "is-thumb" : ""}`}
      style={style}
    >
      {(layout === "band" || layout === "side") && (
        <div
          className={`doc-business-chrome ${layout === "side" ? "side-chrome" : "band-chrome"}`}
        />
      )}
      <div className="doc-main">
        <header>
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="" className="doc-logo" />
            ) : (
              <span className="doc-logo-fallback">
                {(form.business || "B").slice(0, 2).toUpperCase()}
              </span>
            )}
            <b>{form.business || "Your business"}</b>
          </div>
          <h3>{kind.toUpperCase()}</h3>
        </header>
        <div className="business-preview-meta">
          <span>
            Bill to<b>{form.client || "Client name"}</b>
          </span>
          <span>
            No.<b>{form.number || "001"}</b>
          </span>
          <span>
            Date<b>{form.date || "2026-08-20"}</b>
          </span>
          {kind === "Quotation" && (
            <span>
              Valid until<b>{form.validUntil || "2026-09-20"}</b>
            </span>
          )}
          {kind === "Invoice" && (
            <span>
              Due date<b>{form.dueDate || "2026-09-05"}</b>
            </span>
          )}
        </div>
        <div className="business-preview-items">
          <div>
            <b>Description</b>
            <b>Qty</b>
            <b>Amount</b>
          </div>
          {(items.length
            ? items.slice(0, 6)
            : [{ description: "Professional services", qty: 1, price: 2500 }]
          ).map((item, index) => (
            <div key={index}>
              <span>{item.description || "Item or service"}</span>
              <span>{item.qty || 0}</span>
              <span>
                P {format(Number(item.qty || 0) * Number(item.price || 0))}
              </span>
            </div>
          ))}
        </div>
        <dl className="business-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>P {format(subtotal || 2500)}</dd>
          </div>
          {vat && (
            <div>
              <dt>VAT</dt>
              <dd>P {format(vatAmount)}</dd>
            </div>
          )}
          <div className="grand">
            <dt>Total</dt>
            <dd>P {format(total || 2500)}</dd>
          </div>
        </dl>
        {form.notes && <p className="preline doc-notes">{form.notes}</p>}
      </div>
    </div>
  );
}

export { split };
