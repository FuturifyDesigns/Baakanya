const split = (text) =>
  String(text || "")
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

export function CvDocumentPreview({ form, template, skills, photoUrl }) {
  const expertise = form.expertise || form.role || "Your expertise";
  const contact = [form.email, form.phone, form.location, form.website, form.linkedin]
    .filter(Boolean)
    .join(" · ");
  const layout = template?.layout || "minimal";
  const style = {
    "--doc-primary": template?.primary || "#17252d",
    "--doc-accent": template?.accent || "#58bcec",
  };

  return (
    <div className={`doc-sheet cv-sheet layout-${layout}`} style={style}>
      {layout === "sidebar" && (
        <aside className="doc-sidebar">
          {photoUrl && template?.photo !== "none" && (
            <img src={photoUrl} alt="" className={`doc-photo ${template.photo}`} />
          )}
          <h3>{form.name || "Your name"}</h3>
          <p>{contact || "Contact details"}</p>
          <div>
            <strong>Skills</strong>
            <div className="preview-skills">
              {(skills.length ? skills : ["Your skills"]).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </div>
        </aside>
      )}
      <div className="doc-main">
        {layout === "band" && (
          <header className="doc-band">
            <div>
              <h3>{form.name || "Your name"}</h3>
              <b>{expertise}</b>
            </div>
            {photoUrl && template?.photo !== "none" && (
              <img src={photoUrl} alt="" className={`doc-photo ${template.photo}`} />
            )}
          </header>
        )}
        {layout !== "sidebar" && layout !== "band" && (
          <header className="doc-classic-head">
            <div>
              <h3>{form.name || "Your name"}</h3>
              <b>{expertise}</b>
              <small>{contact || "Contact details"}</small>
            </div>
            {photoUrl && template?.photo !== "none" && (
              <img src={photoUrl} alt="" className={`doc-photo ${template.photo}`} />
            )}
          </header>
        )}
        {layout === "band" && <small className="doc-band-contact">{contact}</small>}
        {layout === "sidebar" && <b className="doc-expertise">{expertise}</b>}
        <section>
          <strong>Professional profile</strong>
          <p className="preline">
            {form.summary || "Your professional summary will appear here as you type."}
          </p>
        </section>
        <section>
          <strong>Experience</strong>
          <p className="preline">
            {form.experience || "Add roles, projects and achievements."}
          </p>
        </section>
        {form.education && (
          <section>
            <strong>Education</strong>
            <p className="preline">{form.education}</p>
          </section>
        )}
        {layout !== "sidebar" && (
          <section>
            <strong>Skills</strong>
            <div className="preview-skills">
              {(skills.length ? skills : ["Your skills"]).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </section>
        )}
        {form.certifications && (
          <section>
            <strong>Certifications</strong>
            <p className="preline">{form.certifications}</p>
          </section>
        )}
      </div>
    </div>
  );
}

export function CoverDocumentPreview({ form, template, letter, photoUrl }) {
  const layout = template?.layout || "minimal";
  const style = {
    "--doc-primary": template?.primary || "#17252d",
    "--doc-accent": template?.accent || "#58bcec",
  };
  return (
    <div className={`doc-sheet cover-sheet layout-${layout}`} style={style}>
      {(layout === "band" || layout === "sidebar") && <div className="doc-cover-chrome" />}
      <div className="doc-main">
        <header>
          <h3>{form.name || "Your name"}</h3>
          <small>
            {[form.email, form.phone, form.location].filter(Boolean).join(" · ") ||
              "Contact details"}
          </small>
          {photoUrl && template?.photo !== "none" && (
            <img src={photoUrl} alt="" className={`doc-photo ${template.photo}`} />
          )}
        </header>
        <p className="cover-meta">
          {[form.company, form.role].filter(Boolean).join(" · ") ||
            "Target company · Target role"}
        </p>
        <p className="preline">{letter}</p>
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
}) {
  const layout = template?.layout || "classic";
  const style = {
    "--doc-primary": template?.primary || "#17313d",
    "--doc-accent": template?.accent || "#58bcec",
  };
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
    0,
  );
  const vatAmount = vat ? subtotal * 0.14 : 0;
  const total = subtotal + vatAmount;
  return (
    <div className={`doc-sheet business-sheet layout-${layout}`} style={style}>
      {(layout === "band" || layout === "side") && <div className="doc-business-chrome" />}
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
            No.<b>{form.number}</b>
          </span>
          <span>
            Date<b>{form.date}</b>
          </span>
          {kind === "Quotation" && form.validUntil && (
            <span>
              Valid until<b>{form.validUntil}</b>
            </span>
          )}
          {kind === "Invoice" && form.dueDate && (
            <span>
              Due date<b>{form.dueDate}</b>
            </span>
          )}
        </div>
        <div className="business-preview-items">
          <div>
            <b>Description</b>
            <b>Qty</b>
            <b>Amount</b>
          </div>
          {items.slice(0, 6).map((item, index) => (
            <div key={index}>
              <span>{item.description || "Item or service"}</span>
              <span>{item.qty || 0}</span>
              <span>
                P {money(Number(item.qty || 0) * Number(item.price || 0))}
              </span>
            </div>
          ))}
        </div>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>P {money(subtotal)}</dd>
          </div>
          {vat && (
            <div>
              <dt>VAT</dt>
              <dd>P {money(vatAmount)}</dd>
            </div>
          )}
          <div className="grand">
            <dt>Total</dt>
            <dd>P {money(total)}</dd>
          </div>
        </dl>
        {form.notes && <p className="preline doc-notes">{form.notes}</p>}
      </div>
    </div>
  );
}

export { split };
