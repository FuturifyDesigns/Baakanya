import { fontCss, lineSpacingValue } from "./customization";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const paragraphs = (value) =>
  escapeHtml(value)
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");

const filename = (value, fallback) =>
  (value || fallback)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const photoTag = (photoData, shape = "square") => {
  if (!photoData) return "";
  const radius = shape === "circle" ? "50%" : "4px";
  return `<img src="${photoData}" alt="" width="96" height="96" style="display:block;width:96px;height:96px;object-fit:cover;border-radius:${radius};margin:0 0 14px;" />`;
};

const logoTag = (logoData) => {
  if (!logoData) return "";
  return `<img src="${logoData}" alt="" width="72" height="52" style="display:block;width:72px;height:52px;object-fit:contain;margin:0 0 8px;" />`;
};

const sectionHeading = (title, accent) =>
  `<h2 style="color:${accent};border-bottom:1px solid ${accent};padding-bottom:5px;">${escapeHtml(String(title).toUpperCase())}</h2>`;

const docStyles = (options = {}) => {
  const accent = options.accent || "#58bcec";
  const primary = options.primary || "#17252d";
  const background = options.background || "#ffffff";
  const font = fontCss(options.font || "calibri");
  const spacing = lineSpacingValue(options.lineSpacing || options.density);
  const sectionGap =
    options.density === "compact"
      ? "18px"
      : options.density === "spacious"
        ? "34px"
        : "28px";
  return `
    body{font-family:${font};line-height:${spacing};color:#26343b;margin:0;background:${background}}
    h1{font-size:28px;margin:0;line-height:1.2;color:${primary}}
    h2{font-size:13px;color:${accent};letter-spacing:1px;margin:${sectionGap} 0 10px;border-bottom:1px solid ${accent};padding-bottom:5px}
    h3{font-size:17px;margin:0 0 4px;line-height:1.25}
    .meta{color:#64747c;font-size:11px;margin:8px 0 18px}
    .accent-bar{height:5px;background:${accent};margin:12px 0 22px}
    .sidebar{background:${primary};color:#f4f8fa;padding:22px 18px;vertical-align:top;width:30%}
    .sidebar h1,.sidebar h3{color:#fff}
    .sidebar .meta{color:#d8e4ea;margin:6px 0 16px}
    .sidebar strong{display:block;font-size:10px;letter-spacing:1px;color:#b8ccd6;margin:16px 0 6px}
    .sidebar p,.sidebar li{font-size:11px;color:#eef4f7}
    .sidebar ul{margin:0;padding-left:16px}
    .main{padding:24px 28px;vertical-align:top;background:${background}}
    .band{background:${primary};color:#fff;padding:22px 28px}
    .band h1,.band h3,.band .meta{color:#fff}
    .band .meta{color:#dbe8ef}
    .cover-rail{background:${primary};width:28px}
    .cover-side{background:${primary};width:8%;padding:0}
    table.layout{width:100%;border-collapse:collapse}
    table.items{width:100%;border-collapse:collapse;margin-top:24px}
    table.items th{background:${accent};color:#10202a;text-align:left;padding:9px;font-size:11px}
    table.items td{border-bottom:1px solid #dbe3e6;padding:9px;font-size:11px;line-height:${spacing}}
    .number{text-align:right}
    .total{font-size:15px;font-weight:bold;margin-top:18px}
    .footer-grid{display:flex;justify-content:space-between;gap:24px;margin-top:28px;align-items:flex-start}
    .footer-grid p{font-size:11px;color:#5a6b72;max-width:42ch}
    p{margin:8px 0;line-height:${spacing}}
    ul{margin:8px 0;padding-left:18px}
  `;
};

const saveWord = (name, title, body, options = {}) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${docStyles(options)}</style></head><body>${body}</body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.doc`;
  link.click();
  URL.revokeObjectURL(url);
};

const styleOptions = (template, customization) => ({
  ...customization,
  font: customization?.font || template?.font,
  lineSpacing: customization?.lineSpacing || template?.lineSpacing,
  density: customization?.density || template?.density,
  accent: customization?.accent || template?.accent,
  primary: customization?.primary || template?.primary,
  background: customization?.background || template?.background || "#ffffff",
});

export const exportCvWord = ({
  form,
  skills,
  template,
  customization,
  photoData = "",
}) => {
  const options = styleOptions(template, customization);
  const layout = template?.layout || "minimal";
  const sidebar = layout === "sidebar";
  const band = layout === "band";
  const headline = form.expertise || form.role || "";
  const titles = {
    profile: "Professional profile",
    experience: "Experience and achievements",
    education: "Education",
    skills: "Core skills",
    certifications: "Certifications",
    ...(customization?.titles || {}),
    ...(template?.titles || {}),
  };
  const contact = [form.email, form.phone, form.location, form.website, form.linkedin]
    .filter(Boolean)
    .map(escapeHtml);
  const mainSections = `
    ${sectionHeading(titles.profile, options.accent)}
    ${paragraphs(form.summary)}
    ${sectionHeading(titles.experience, options.accent)}
    ${paragraphs(form.experience)}
    ${
      sidebar
        ? ""
        : `${sectionHeading(titles.education, options.accent)}${paragraphs(form.education)}
    ${sectionHeading(titles.skills, options.accent)}<p>${skills.map(escapeHtml).join(" &nbsp; • &nbsp; ")}</p>
    ${form.certifications ? `${sectionHeading(titles.certifications, options.accent)}${paragraphs(form.certifications)}` : ""}`
    }`;

  let body = "";
  if (sidebar) {
    body = `<table class="layout"><tr>
      <td class="sidebar">
        ${photoTag(photoData, template?.photo || "square")}
        <h1>${escapeHtml(form.name)}</h1>
        <h3>${escapeHtml(headline)}</h3>
        <div class="meta">${contact.join("<br>")}</div>
        <strong>CONTACT</strong>
        <p>${contact.join("<br>")}</p>
        <strong>SKILLS</strong>
        <ul>${skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("")}</ul>
        ${form.education ? `<strong>${escapeHtml(titles.education).toUpperCase()}</strong>${paragraphs(form.education)}` : ""}
        ${form.certifications ? `<strong>${escapeHtml(titles.certifications).toUpperCase()}</strong>${paragraphs(form.certifications)}` : ""}
      </td>
      <td class="main">${mainSections}</td>
    </tr></table>`;
  } else if (band) {
    body = `<div class="band">
      <table class="layout"><tr>
        <td style="vertical-align:top;width:78%">
          <h1>${escapeHtml(form.name)}</h1>
          <h3>${escapeHtml(headline)}</h3>
          <div class="meta">${contact.join(" &nbsp; • &nbsp; ")}</div>
        </td>
        <td style="vertical-align:top;text-align:right">${photoTag(photoData, template?.photo || "square")}</td>
      </tr></table>
    </div>
    <div style="padding:24px 28px">
      <div class="accent-bar"></div>
      ${mainSections}
    </div>`;
  } else {
    body = `<div style="padding:24px 28px">
      <table class="layout"><tr>
        <td style="vertical-align:top;width:78%">
          <h1>${escapeHtml(form.name)}</h1>
          <h3>${escapeHtml(headline)}</h3>
          <div class="meta">${contact.join(" &nbsp; • &nbsp; ")}</div>
        </td>
        <td style="vertical-align:top;text-align:right">${photoTag(photoData, template?.photo || "square")}</td>
      </tr></table>
      <div class="accent-bar"></div>
      ${mainSections}
    </div>`;
  }

  saveWord(`${filename(form.name, "baakanya")}-cv`, "Curriculum Vitae", body, options);
};

export const exportCoverWord = ({
  form,
  letter,
  template,
  customization,
  photoData = "",
}) => {
  const options = styleOptions(template, customization);
  const layout = template?.layout || "classic";
  const sidebar = layout === "sidebar";
  const band = layout === "band";
  const meta = [form.email, form.phone, form.location]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &nbsp; • &nbsp; ");
  const letterBody = paragraphs(letter);
  const header = band
    ? `<div class="band"><h1>${escapeHtml(form.name)}</h1><div class="meta">${meta}</div></div>`
    : `<h1>${escapeHtml(form.name)}</h1><div class="meta">${meta}</div>`;
  const photo = photoData ? photoTag(photoData, template?.photo || "square") : "";

  let body = "";
  if (sidebar) {
    body = `<table class="layout"><tr>
      <td class="cover-side"></td>
      <td class="main">
        <table class="layout"><tr>
          <td style="vertical-align:top">${header}<div class="accent-bar"></div></td>
          <td style="vertical-align:top;text-align:right;width:110px">${photo}</td>
        </tr></table>
        <p><b>Re:</b> ${escapeHtml(form.role ? `Application for ${form.role}` : "Application for the advertised role")}</p>
        <p><b>${escapeHtml(form.hiringManager || "Hiring Manager")}</b><br>${escapeHtml(form.company || "Company name")}${form.companyWebsite ? `<br>${escapeHtml(form.companyWebsite)}` : ""}</p>
        ${letterBody}
      </td>
    </tr></table>`;
  } else {
    body = `<div style="padding:24px 28px">
      <table class="layout"><tr>
        <td style="vertical-align:top">${header}</td>
        <td style="vertical-align:top;text-align:right;width:110px">${photo}</td>
      </tr></table>
      <div class="accent-bar"></div>
      <p><b>Re:</b> ${escapeHtml(form.role ? `Application for ${form.role}` : "Application for the advertised role")}</p>
      <p><b>${escapeHtml(form.hiringManager || "Hiring Manager")}</b><br>${escapeHtml(form.company || "Company name")}${form.companyWebsite ? `<br>${escapeHtml(form.companyWebsite)}` : ""}</p>
      ${letterBody}
    </div>`;
  }

  saveWord(
    `${filename(form.name, "baakanya")}-cover-letter`,
    "Cover Letter",
    body,
    options,
  );
};

export const exportBusinessWord = ({
  kind,
  form,
  items,
  vat,
  template,
  customization,
  logoData = "",
}) => {
  const options = styleOptions(template, customization);
  const layout = template?.layout || "clean";
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.qty) * Number(item.price),
    0,
  );
  const tax = vat ? subtotal * 0.14 : 0;
  const total = subtotal + tax;
  const money = (n) =>
    Number(n || 0).toLocaleString("en-BW", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const rows = items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.description)}</td><td class="number">${escapeHtml(item.qty)}</td><td class="number">${money(item.price)}</td><td class="number">${money(Number(item.qty) * Number(item.price))}</td></tr>`,
    )
    .join("");
  const isQuote = kind === "Quotation";
  const showSide = layout === "side";
  const showBand =
    layout === "band" || layout === "proposal" || layout === "masthead";

  const headerBlock = showBand
    ? `<div class="band"><table class="layout"><tr>
        <td style="vertical-align:top;width:70%">${logoTag(logoData)}<h1>${escapeHtml(form.business)}</h1></td>
        <td style="vertical-align:top;text-align:right"><h1 style="font-size:22px">${isQuote ? "QUOTATION" : "INVOICE"}</h1><div class="meta">${escapeHtml(form.number)} · ${escapeHtml(form.date)}</div></td>
      </tr></table></div>`
    : `<table class="layout"><tr>
        <td style="vertical-align:top;width:70%">${logoTag(logoData)}<h1>${escapeHtml(form.business)}</h1></td>
        <td style="vertical-align:top;text-align:right"><h1 style="font-size:22px">${isQuote ? "QUOTATION" : "INVOICE"}</h1><div class="meta">${escapeHtml(form.number)} · ${escapeHtml(form.date)}</div></td>
      </tr></table>`;

  const content = `<div style="padding:${showBand ? "24px 28px" : "0"}">
    <div class="accent-bar"></div>
    <p><b>${isQuote ? "Prepared for" : "Bill to"}</b><br>${escapeHtml(form.client)}${form.clientAddress ? `<br>${escapeHtml(form.clientAddress)}` : ""}</p>
    <table class="items"><thead><tr><th>${isQuote ? "Deliverable" : "Description"}</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer-grid">
      <div>
        <strong>${isQuote ? "Quote notes" : "Payment details"}</strong>
        ${form.notes ? paragraphs(form.notes) : `<p>${isQuote ? "This quotation is valid until the date shown." : "Bank transfer · Include document number as reference."}</p>`}
      </div>
      <div class="total">
        Subtotal P${money(subtotal)}${vat ? `<br>VAT (14%) P${money(tax)}` : ""}<br>${isQuote ? "Quote total" : "Total due"} P${money(total)}
      </div>
    </div>
  </div>`;

  const body = showSide
    ? `<table class="layout"><tr>
        <td class="sidebar" style="width:18%"></td>
        <td class="main">${headerBlock}${content}</td>
      </tr></table>`
    : `<div style="padding:24px 28px">${headerBlock}${content}</div>`;

  saveWord(
    `${filename(form.business || form.client, "baakanya")}-${kind.toLowerCase()}`,
    kind,
    body,
    options,
  );
};
