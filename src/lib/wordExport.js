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
  const font =
    options.font === "times"
      ? "Georgia, 'Times New Roman', serif"
      : options.font === "courier"
        ? "'Courier New', monospace"
        : "Arial, Helvetica, sans-serif";
  const spacing =
    options.density === "compact"
      ? "1.25"
      : options.density === "spacious"
        ? "1.75"
        : "1.5";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:${font};line-height:${spacing};color:#26343b;margin:42px}h1{font-size:28px;margin:0}h2{font-size:13px;color:${accent};letter-spacing:1px;margin-top:28px;border-bottom:1px solid ${accent};padding-bottom:5px}h3{font-size:17px;margin-bottom:4px}.meta{color:#64747c;font-size:11px;margin:8px 0 28px}.accent{height:5px;background:${accent};margin:15px 0 25px}table{width:100%;border-collapse:collapse;margin-top:24px}th{background:${accent};color:#10202a;text-align:left;padding:9px;font-size:11px}td{border-bottom:1px solid #dbe3e6;padding:9px;font-size:11px}.number{text-align:right}.total{font-size:15px;font-weight:bold}p{margin:8px 0}</style></head><body>${body}</body></html>`;
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
    accent: customization.accent || template.accent,
  });
};

export const exportCoverWord = ({ form, letter, template, customization }) => {
  const body = `<h1>${escapeHtml(form.name)}</h1><div class="meta">${[form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join(" &nbsp; • &nbsp; ")}</div><div class="accent"></div>${paragraphs(letter)}`;
  saveWord(
    `${filename(form.name, "baakanya")}-cover-letter`,
    "Cover Letter",
    body,
    { ...customization, accent: customization.accent || template.accent },
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
  const vatAmount = vat ? subtotal * 0.14 : 0;
  const total = subtotal + vatAmount;
  const money = (value) => Number(value || 0).toFixed(2);
  const rows = items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.description)}</td><td class="number">${escapeHtml(item.qty)}</td><td class="number">P ${money(item.price)}</td><td class="number">P ${money(Number(item.qty) * Number(item.price))}</td></tr>`,
    )
    .join("");
  const body = `<h1>${escapeHtml(form.business)}</h1><h3>${escapeHtml(kind)}</h3><div class="meta">Prepared for ${escapeHtml(form.client)} &nbsp; • &nbsp; ${escapeHtml(form.number)} &nbsp; • &nbsp; ${escapeHtml(form.date)}</div><table><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}<tr><td colspan="3" class="number">Subtotal</td><td class="number">P ${money(subtotal)}</td></tr>${vat ? `<tr><td colspan="3" class="number">VAT (14%)</td><td class="number">P ${money(vatAmount)}</td></tr>` : ""}<tr class="total"><td colspan="3" class="number">TOTAL</td><td class="number">P ${money(total)}</td></tr></tbody></table><h2>NOTE</h2>${paragraphs(form.notes)}`;
  saveWord(`${filename(form.number, kind)}-${kind.toLowerCase()}`, kind, body, {
    ...customization,
    accent: customization.accent || template.accent,
  });
};
