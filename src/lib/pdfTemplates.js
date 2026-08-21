import { jsPDF } from "jspdf";

const rgb = (hex) => {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
};

const setColour = (pdf, hex, fill = false) => {
  const colour = rgb(hex);
  if (fill) pdf.setFillColor(...colour);
  else pdf.setTextColor(...colour);
};

const safeName = (value, fallback) =>
  (value || fallback)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const writeSection = (pdf, title, body, options) => {
  let { x, y, width, accent } = options;
  const font = options.font || "helvetica";
  const lineHeight =
    options.density === "compact"
      ? 4.5
      : options.density === "spacious"
        ? 6.2
        : 5.2;
  if (!body) return y;
  if (y > 265) {
    pdf.addPage();
    y = 22;
  }
  setColour(pdf, accent);
  pdf.setFont(font, "bold");
  pdf.setFontSize(9);
  pdf.text(title.toUpperCase(), x, y);
  y += 7;
  pdf.setTextColor(38, 50, 57);
  pdf.setFont(font, "normal");
  pdf.setFontSize(9.5);
  const lines = pdf.splitTextToSize(body, width);
  for (const line of lines) {
    if (y > 280) {
      pdf.addPage();
      y = 22;
    }
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y + 7;
};

export const renderCvPdf = ({ form, template, photoData, skills }) => {
  const pdf = new jsPDF();
  const sidebar = template.layout === "sidebar";
  const band = template.layout === "band";
  const primary = template.primary;
  const accent = template.accent;
  const font = template.font || "helvetica";
  const density = template.density || "comfortable";
  let contentX = sidebar ? 73 : 18;
  let contentWidth = sidebar ? 119 : 174;
  let y = band ? 62 : 58;

  if (sidebar) {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 61, 297, "F");
    if (photoData) pdf.addImage(photoData, "PNG", 13, 16, 35, 35);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(font, "bold");
    pdf.setFontSize(17);
    pdf.text(pdf.splitTextToSize(form.name, 45), 9, photoData ? 65 : 25);
    pdf.setFont(font, "normal");
    pdf.setFontSize(8.5);
    const contact = [
      form.email,
      form.phone,
      form.location,
      form.website,
      form.linkedin,
    ].filter(Boolean);
    pdf.text(contact, 9, photoData ? 86 : 48);
  } else if (band) {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 210, 47, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(font, "bold");
    pdf.setFontSize(23);
    pdf.text(form.name, 18, 20);
    pdf.setFont(font, "normal");
    pdf.setFontSize(10);
    pdf.text(form.expertise || form.role || "", 18, 31);
    if (photoData) pdf.addImage(photoData, "PNG", 165, 7, 32, 32);
    pdf.setTextColor(50, 63, 70);
    pdf.setFontSize(8.5);
    pdf.text(
      [form.email, form.phone, form.location, form.website, form.linkedin]
        .filter(Boolean)
        .join("  •  "),
      18,
      54,
    );
  } else {
    setColour(pdf, primary);
    pdf.setFont(font, "bold");
    pdf.setFontSize(template.layout === "classic" ? 25 : 23);
    pdf.text(form.name, 18, 21);
    setColour(pdf, accent);
    pdf.setFontSize(10);
    pdf.text((form.expertise || form.role || "").toUpperCase(), 18, 31);
    setColour(pdf, accent, true);
    pdf.rect(18, 37, 174, 1.2, "F");
    pdf.setTextColor(65, 77, 84);
    pdf.setFont(font, "normal");
    pdf.setFontSize(8.5);
    pdf.text(
      [form.email, form.phone, form.location, form.website, form.linkedin]
        .filter(Boolean)
        .join("  •  "),
      18,
      47,
    );
    if (photoData) {
      pdf.addImage(photoData, "PNG", 164, 9, 28, 28);
      contentWidth = 174;
    }
  }

  y = writeSection(pdf, "Professional profile", form.summary, {
    x: contentX,
    y,
    width: contentWidth,
    accent,
    font,
    density,
  });
  y = writeSection(pdf, "Experience and achievements", form.experience, {
    x: contentX,
    y,
    width: contentWidth,
    accent,
    font,
    density,
  });
  y = writeSection(pdf, "Education", form.education, {
    x: contentX,
    y,
    width: contentWidth,
    accent,
    font,
    density,
  });
  y = writeSection(pdf, "Core skills", skills.join("  •  "), {
    x: contentX,
    y,
    width: contentWidth,
    accent,
    font,
    density,
  });
  writeSection(pdf, "Certifications", form.certifications, {
    x: contentX,
    y,
    width: contentWidth,
    accent,
    font,
    density,
  });
  pdf.save(
    `${safeName(form.name, "baakanya")}-${safeName(template.name, "cv")}-cv.pdf`,
  );
};

export const renderCoverLetterPdf = ({ form, template, photoData, letter }) => {
  const pdf = new jsPDF();
  const { primary, accent } = template;
  const font = template.font || "helvetica";
  const lineHeight =
    template.density === "compact"
      ? 5.1
      : template.density === "spacious"
        ? 7
        : 6;
  if (template.layout === "band" || template.layout === "sidebar") {
    setColour(pdf, primary, true);
    pdf.rect(
      0,
      0,
      template.layout === "sidebar" ? 38 : 210,
      template.layout === "sidebar" ? 297 : 43,
      "F",
    );
  }
  const x = template.layout === "sidebar" ? 52 : 20;
  const width = template.layout === "sidebar" ? 138 : 170;
  const lightHeader = template.layout === "band";
  pdf.setTextColor(...(lightHeader ? [255, 255, 255] : rgb(primary)));
  pdf.setFont(font, "bold");
  pdf.setFontSize(21);
  pdf.text(form.name, x, 20);
  pdf.setFont(font, "normal");
  pdf.setFontSize(8.5);
  if (!lightHeader) setColour(pdf, accent);
  pdf.text(
    [form.email, form.phone, form.location].filter(Boolean).join("  •  "),
    x,
    30,
  );
  if (photoData && template.photo !== "none")
    pdf.addImage(photoData, "PNG", 166, 8, 27, 27);
  setColour(pdf, accent, true);
  pdf.rect(x, 39, width, 1, "F");
  pdf.setTextColor(40, 51, 58);
  pdf.setFontSize(10.5);
  const lines = pdf.splitTextToSize(letter, width);
  let y = 57;
  for (const line of lines) {
    if (y > 278) {
      pdf.addPage();
      y = 22;
    }
    pdf.text(line, x, y);
    y += lineHeight;
  }
  pdf.save(
    `${safeName(form.name, "baakanya")}-${safeName(template.name, "cover-letter")}-cover-letter.pdf`,
  );
};

export const renderBusinessPdf = ({
  kind,
  form,
  items,
  vat,
  template,
  logoData,
}) => {
  const pdf = new jsPDF();
  const { primary, accent } = template;
  const font = template.font || "helvetica";
  const rowHeight =
    template.density === "compact"
      ? 9.5
      : template.density === "spacious"
        ? 15
        : 12;
  const amount = (value) =>
    Number(value || 0).toLocaleString("en-BW", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.qty) * Number(item.price),
    0,
  );
  const vatAmount = vat ? subtotal * 0.14 : 0;
  const total = subtotal + vatAmount;
  if (template.layout === "band") {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 210, 48, "F");
  } else if (template.layout === "side") {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 45, 297, "F");
  }
  const left = template.layout === "side" ? 56 : 16;
  const right = 194;
  if (logoData) pdf.addImage(logoData, "PNG", left, 10, 28, 20);
  pdf.setFont(font, "bold");
  pdf.setFontSize(logoData ? 15 : 22);
  pdf.setTextColor(
    ...(template.layout === "band" ? [255, 255, 255] : rgb(primary)),
  );
  pdf.text(form.business, left + (logoData ? 34 : 0), 21);
  pdf.setFontSize(20);
  pdf.text(kind.toUpperCase(), right, 21, { align: "right" });
  pdf.setTextColor(48, 60, 67);
  pdf.setFont(font, "normal");
  pdf.setFontSize(9);
  pdf.text(`Prepared for: ${form.client}`, left, 58);
  if (form.clientAddress) pdf.text(form.clientAddress, left, 63);
  pdf.text(`${kind} no: ${form.number}`, right, 52, { align: "right" });
  pdf.text(`Issue date: ${form.date}`, right, 58, { align: "right" });
  if (kind === "Invoice" && form.dueDate)
    pdf.text(`Due date: ${form.dueDate}`, right, 64, { align: "right" });
  if (kind === "Quotation" && form.validUntil)
    pdf.text(`Valid until: ${form.validUntil}`, right, 64, { align: "right" });
  const drawTableHead = (top) => {
    setColour(pdf, accent, true);
    pdf.rect(left, top, right - left, 10, "F");
    pdf.setTextColor(20, 31, 37);
    pdf.setFont(font, "bold");
    pdf.text("DESCRIPTION", left + 4, top + 6.5);
    pdf.text("QTY", 137, top + 6.5);
    pdf.text("PRICE", 158, top + 6.5);
    pdf.text("AMOUNT", right, top + 6.5, { align: "right" });
  };
  drawTableHead(70);
  let y = 91;
  pdf.setFont(font, "normal");
  items.forEach((item) => {
    if (y > 250) {
      pdf.addPage();
      drawTableHead(20);
      pdf.setFont(font, "normal");
      y = 36;
    }
    pdf.text(pdf.splitTextToSize(item.description, 82)[0], left + 4, y);
    pdf.text(String(item.qty), 139, y);
    pdf.text(amount(item.price), 158, y);
    pdf.text(amount(Number(item.qty) * Number(item.price)), right, y, {
      align: "right",
    });
    pdf.setDrawColor(222, 228, 231);
    pdf.line(left, y + 4, right, y + 4);
    y += rowHeight;
  });
  y = Math.max(y + 8, 135);
  if (y > 252) {
    pdf.addPage();
    y = 36;
  }
  pdf.text("Subtotal", 145, y);
  pdf.text(`P ${amount(subtotal)}`, right, y, { align: "right" });
  if (vat) {
    pdf.text("VAT (14%)", 145, y + 9);
    pdf.text(`P ${amount(vatAmount)}`, right, y + 9, { align: "right" });
  }
  pdf.setFont(font, "bold");
  pdf.setFontSize(13);
  setColour(pdf, primary);
  pdf.text("TOTAL", 145, y + 23);
  pdf.text(`P ${amount(total)}`, right, y + 23, { align: "right" });
  pdf.setFont(font, "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(75, 87, 94);
  pdf.text(pdf.splitTextToSize(form.notes, right - left), left, 272);
  pdf.save(
    `${kind.toLowerCase()}-${safeName(form.number, "document")}-${safeName(template.name, "template")}.pdf`,
  );
};
