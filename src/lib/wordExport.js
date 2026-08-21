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

const saveWord = (name, title, body, options = {}) => {
  const accent = options.accent || "#58bcec";
  const font = fontCss(options.font || "calibri");
  const spacing = lineSpacingValue(options.lineSpacing || options.density);
  const sectionGap =
    options.density === "compact"
      ? "18px"
      : options.density === "spacious"
        ? "34px"
        : "28px";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:${font};line-height:${spacing};color:#26343b;margin:42px}h1{font-size:28px;margin:0;line-height:1.2}h2{font-size:13px;color:${accent};letter-spacing:1px;margin-top:${sectionGap};border-bottom:1px solid ${accent};padding-bottom:5px}h3{font-size:17px;margin-bottom:4px;line-height:1.25}.meta{color:#64747c;font-size:11px;margin:8px 0 28px}.accent{height:5px;background:${accent};margin:15px 0 25px}table{width:100%;border-collapse:collapse;margin-top:24px}th{background:${accent};color:#10202a;text-align:left;padding:9px;font-size:11px}td{border-bottom:1px solid #dbe3e6;padding:9px;font-size:11px;line-height:${spacing}}.number{text-align:right}.total{font-size:15px;font-weight:bold}p{margin:8px 0;line-height:${spacing}}</style></head><body>${body}</body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.doc`;
  link.click();
  URL.revokeObjectURL(url);
};

const filename = (value, fallback) =>
  (value || fallback)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export const exportCvWord = ({ form, skills, template, customization }) => {
  const headline = form.expertise || form.role || "";
  const meta = [form.email, form.phone, form.location, form.website, form.linkedin]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &nbsp; • &nbsp; ");
  const titles = {
    profile: "Professional profile",
    experience: "Experience and achievements",
    education: "Education",
    skills: "Core skills",
    certifications: "Certifications",
    ...(customization?.titles || {}),
    ...(template?.titles || {}),
  };
  const body = `<h1>${escapeHtml(form.name)}</h1><h3>${escapeHtml(headline)}</h3><div class="meta">${meta}</div><div class="accent"></div><h2>${escapeHtml(titles.profile).toUpperCase()}</h2>${paragraphs(form.summary)}<h2>${escapeHtml(titles.experience).toUpperCase()}</h2>${paragraphs(form.experience)}<h2>${escapeHtml(titles.education).toUpperCase()}</h2>${paragraphs(form.education)}<h2>${escapeHtml(titles.skills).toUpperCase()}</h2><p>${skills.map(escapeHtml).join(" &nbsp; • &nbsp; ")}</p>${form.certifications ? `<h2>${escapeHtml(titles.certifications).toUpperCase()}</h2>${paragraphs(form.certifications)}` : ""}`;
  saveWord(`${filename(form.name, "baakanya")}-cv`, "Curriculum Vitae", body, {
    ...customization,
    font: customization.font || template.font,
    lineSpacing: customization.lineSpacing || template.lineSpacing,
    density: customization.density || template.density,
    accent: customization.accent || template.accent,
  });
};

export const exportCoverWord = ({ form, letter, template, customization }) => {
  const body = `<h1>${escapeHtml(form.name)}</h1><div class="meta">${[form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join(" &nbsp; • &nbsp; ")}</div><div class="accent"></div>${paragraphs(letter)}`;
  saveWord(
    `${filename(form.name, "baakanya")}-cover-letter`,
    "Cover Letter",
    body,
    {
      ...customization,
      font: customization.font || template.font,
      lineSpacing: customization.lineSpacing || template.lineSpacing,
      density: customization.density || template.density,
      accent: customization.accent || template.accent,
    },
  );
};

export const exportBusinessWord = ({
  kind,
  form,
  items,
  vat,
  template,
  customization,
}) => {
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
  const body = `<h1>${escapeHtml(form.business)}</h1><div class="meta">${escapeHtml(kind)} ${escapeHtml(form.number)} · ${escapeHtml(form.date)}${isQuote && form.validUntil ? ` · Valid until ${escapeHtml(form.validUntil)}` : ""}</div><div class="accent"></div><p><b>${isQuote ? "Prepared for" : "Bill to"}</b><br>${escapeHtml(form.client)}<br>${escapeHtml(form.clientAddress || "")}</p><table><thead><tr><th>${isQuote ? "Deliverable" : "Description"}</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Subtotal P${money(subtotal)}${vat ? `<br>VAT (14%) P${money(tax)}` : ""}<br>${isQuote ? "Quote total" : "Total due"} P${money(total)}</p>${form.notes ? paragraphs(form.notes) : isQuote ? "<p><i>This quotation is valid until the date shown.</i></p>" : ""}`;
  saveWord(
    `${filename(form.business || form.client, "baakanya")}-${kind.toLowerCase()}`,
    kind,
    body,
    {
      ...customization,
      font: customization.font || template.font,
      lineSpacing: customization.lineSpacing || template.lineSpacing,
      density: customization.density || template.density,
      accent: customization.accent || template.accent,
    },
  );
};
