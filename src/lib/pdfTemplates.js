import { jsPDF } from "jspdf";
import { fontPdf, lineSpacingValue } from "./customization";

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

const pdfFont = (font) => fontPdf(font);

const bodyLineHeight = (templateOrOptions) => {
  const density = templateOrOptions.density || "comfortable";
  const spacing = lineSpacingValue(templateOrOptions.lineSpacing);
  const base =
    density === "compact" ? 3.9 : density === "spacious" ? 5.1 : 4.4;
  return Math.max(3.6, base * spacing);
};

const PAGE_BOTTOM = 282;

const estimateWrappedLines = (pdf, text, width) => {
  if (!text) return 0;
  let lines = 0;
  const blocks = String(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length > 1 || /\n/.test(text)) {
    for (const block of blocks.length > 1 ? blocks : [text]) {
      const rowLines = String(block)
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (!rowLines.length) continue;
      lines += pdf.splitTextToSize(rowLines[0], width).length;
      for (const line of rowLines.slice(1)) {
        lines += pdf.splitTextToSize(
          `•  ${line.replace(/^[-•*]\s*/, "")}`,
          Math.max(width - 3, 20),
        ).length;
      }
      lines += 1;
    }
  } else {
    lines = pdf.splitTextToSize(String(text), width).length;
  }
  return lines;
};

const estimateSectionHeight = (pdf, body, width, lineHeight) => {
  if (!body) return 0;
  return 12 + estimateWrappedLines(pdf, body, width) * lineHeight + 3;
};

const pageFillScale = (startY, estimatedHeight, pageBottom = PAGE_BOTTOM) => {
  const available = pageBottom - startY;
  if (available <= 0 || estimatedHeight <= 0) return 1;
  const ratio = estimatedHeight / available;
  if (ratio >= 0.82) return 1;
  return Math.min(1.55, available / estimatedHeight);
};

const writeSidebarSection = (pdf, title, body, options) => {
  let { sideY, width, font } = options;
  if (!body || sideY > 250) return sideY;
  pdf.setFont(font, "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(180, 200, 210);
  pdf.text(String(title).toUpperCase(), 8, sideY);
  sideY += 4;
  pdf.setFont(font, "normal");
  pdf.setFontSize(7.2);
  pdf.setTextColor(240, 245, 247);
  const blocks = String(body)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of blocks) {
    const wrapped = pdf.splitTextToSize(line.replace(/^[-•*]\s*/, "•  "), width);
    pdf.text(wrapped, 8, sideY);
    sideY += wrapped.length * 3.2 + 1;
    if (sideY > 268) break;
  }
  return sideY + 4;
};

const writeSection = (pdf, title, body, options) => {
  let { x, y, width, accent } = options;
  const font = pdfFont(options.font);
  const lineHeight = options.lineHeight || bodyLineHeight(options);
  const sectionGap = options.sectionGap ?? 3;
  if (!body) return y;
  if (y > 270) {
    pdf.addPage();
    y = 20;
  }
  setColour(pdf, accent);
  pdf.setFont(font, "bold");
  pdf.setFontSize(8.5);
  pdf.text(String(title).toUpperCase(), x, y);
  y += 2.2;
  setColour(pdf, accent, true);
  pdf.rect(x, y, width, 0.55, "F");
  y += 5;

  pdf.setTextColor(38, 50, 57);
  pdf.setFont(font, "normal");
  pdf.setFontSize(9.2);

  const blocks = String(body)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const writeLines = (lines, bullet = false) => {
    for (const line of lines) {
      const wrapped = pdf.splitTextToSize(
        bullet ? `•  ${line}` : line,
        bullet ? width - 3 : width,
      );
      for (const part of wrapped) {
        if (y > PAGE_BOTTOM) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(part, bullet ? x + 1 : x, y);
        y += lineHeight;
      }
    }
  };

  if (blocks.length > 1 || /\n/.test(body)) {
    for (const block of blocks.length > 1 ? blocks : [body]) {
      const lines = String(block)
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) continue;
      pdf.setFont(font, "bold");
      pdf.setFontSize(9.4);
      const head = lines[0].replace(/^[-•*]\s*/, "");
      writeLines([head], false);
      pdf.setFont(font, "normal");
      pdf.setFontSize(9);
      writeLines(
        lines.slice(1).map((line) => line.replace(/^[-•*]\s*/, "")),
        true,
      );
      y += 2.2;
    }
  } else {
    writeLines(pdf.splitTextToSize(body, width), false);
    y += 3;
  }
  return y + sectionGap;
};

export const renderCvPdf = ({ form, template, photoData, skills }) => {
  const pdf = new jsPDF();
  const sidebar = template.layout === "sidebar";
  const band = template.layout === "band";
  const primary = template.primary;
  const accent = template.accent;
  const font = pdfFont(template.font);
  const density = template.density || "comfortable";
  const lineHeight = bodyLineHeight(template);
  const background = template.background || "#ffffff";
  let contentX = sidebar ? 68 : 18;
  let contentWidth = sidebar ? 124 : 174;
  let y = band ? 58 : 48;

  if (background.toLowerCase() !== "#ffffff") {
    setColour(pdf, background, true);
    pdf.rect(0, 0, 210, 297, "F");
  }

  if (sidebar) {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 58, 297, "F");
    let sideY = 16;
    if (photoData) {
      pdf.addImage(photoData, "PNG", 11, sideY, 34, 34);
      sideY = 58;
    }
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(font, "bold");
    pdf.setFontSize(13);
    const nameLines = pdf.splitTextToSize(form.name || "Your name", 46);
    pdf.text(nameLines, 8, sideY);
    sideY += nameLines.length * 5 + 3;
    pdf.setFont(font, "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(220, 230, 235);
    const roleLines = pdf.splitTextToSize(
      (form.expertise || form.role || "").toUpperCase(),
      46,
    );
    if (roleLines[0]) {
      pdf.text(roleLines, 8, sideY);
      sideY += roleLines.length * 3.6 + 6;
    }
    pdf.setFont(font, "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(180, 200, 210);
    pdf.text("CONTACT", 8, sideY);
    sideY += 4;
    pdf.setFont(font, "normal");
    pdf.setFontSize(7.4);
    pdf.setTextColor(240, 245, 247);
    const contact = [
      form.email,
      form.phone,
      form.location,
      form.website,
      form.linkedin,
    ].filter(Boolean);
    for (const line of contact) {
      const wrapped = pdf.splitTextToSize(line, 46);
      pdf.text(wrapped, 8, sideY);
      sideY += wrapped.length * 3.4 + 1.2;
    }
    if (skills.length) {
      sideY += 5;
      pdf.setFont(font, "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(180, 200, 210);
      pdf.text("SKILLS", 8, sideY);
      sideY += 4;
      pdf.setFont(font, "normal");
      pdf.setFontSize(7.4);
      pdf.setTextColor(240, 245, 247);
      for (const skill of skills) {
        const wrapped = pdf.splitTextToSize(`•  ${skill}`, 46);
        pdf.text(wrapped, 8, sideY);
        sideY += wrapped.length * 3.4 + 1;
      }
    }
    const titles = template.titles || {};
    sideY = writeSidebarSection(
      pdf,
      titles.education || "Education",
      form.education,
      { sideY, width: 46, font },
    );
    sideY = writeSidebarSection(
      pdf,
      titles.certifications || "Certifications",
      form.certifications,
      { sideY, width: 46, font },
    );
    y = 22;
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

  const titles = template.titles || {};
  const mainSections = sidebar
    ? [
        { key: "profile", body: form.summary },
        { key: "experience", body: form.experience },
      ]
    : [
        { key: "profile", body: form.summary },
        { key: "experience", body: form.experience },
        { key: "education", body: form.education },
        { key: "skills", body: skills.join("  •  ") },
        { key: "certifications", body: form.certifications },
      ];
  const sectionLabels = {
    profile: titles.profile || "Professional profile",
    experience: titles.experience || "Experience and achievements",
    education: titles.education || "Education",
    skills: titles.skills || "Core skills",
    certifications: titles.certifications || "Certifications",
  };
  let estimatedHeight = 0;
  for (const section of mainSections) {
    if (!section.body) continue;
    estimatedHeight += estimateSectionHeight(
      pdf,
      section.body,
      contentWidth,
      lineHeight,
    );
  }
  const fillScale = pageFillScale(y, estimatedHeight);
  const filledLineHeight = lineHeight * fillScale;
  const sectionGap = 3 * fillScale;
  const sectionOptions = {
    x: contentX,
    width: contentWidth,
    accent,
    font,
    density,
    lineSpacing: template.lineSpacing,
    lineHeight: filledLineHeight,
    sectionGap,
  };

  for (const section of mainSections) {
    if (!section.body && section.key !== "skills") continue;
    y = writeSection(pdf, sectionLabels[section.key], section.body, {
      ...sectionOptions,
      y,
    });
  }
  pdf.save(
    `${safeName(form.name, "baakanya")}-${safeName(template.name, "cv")}-cv.pdf`,
  );
};

export const renderCoverLetterPdf = ({ form, template, photoData, letter }) => {
  const pdf = new jsPDF();
  const { primary, accent } = template;
  const font = pdfFont(template.font);
  const background = template.background || "#ffffff";
  const lineHeight = bodyLineHeight(template);
  if (background.toLowerCase() !== "#ffffff") {
    setColour(pdf, background, true);
    pdf.rect(0, 0, 210, 297, "F");
  }
  if (template.layout === "band" || template.layout === "sidebar") {
    setColour(pdf, primary, true);
    pdf.rect(
      0,
      0,
      template.layout === "sidebar" ? 28 : 210,
      template.layout === "sidebar" ? 297 : 40,
      "F",
    );
  }
  const x = template.layout === "sidebar" ? 42 : 20;
  const width = template.layout === "sidebar" ? 148 : 170;
  const lightHeader = template.layout === "band";
  pdf.setTextColor(...(lightHeader ? [255, 255, 255] : rgb(primary)));
  pdf.setFont(font, "bold");
  pdf.setFontSize(18);
  pdf.text(form.name || "Your name", x, 18);
  pdf.setFont(font, "normal");
  pdf.setFontSize(8.5);
  if (!lightHeader) setColour(pdf, accent);
  else pdf.setTextColor(235, 242, 246);
  pdf.text(
    [form.email, form.phone, form.location].filter(Boolean).join("  •  "),
    x,
    26,
  );
  if (photoData && template.photo !== "none")
    pdf.addImage(photoData, "PNG", 170, 8, 24, 24);
  setColour(pdf, accent, true);
  pdf.rect(x, 32, width, 0.8, "F");

  let y = 42;
  pdf.setTextColor(80, 95, 102);
  pdf.setFont(font, "normal");
  pdf.setFontSize(9);
  pdf.text(
    new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    x,
    y,
  );
  y += 8;
  pdf.setTextColor(30, 42, 48);
  pdf.setFont(font, "bold");
  pdf.setFontSize(10);
  pdf.text(form.hiringManager || "Hiring Manager", x, y);
  y += 5;
  pdf.setFont(font, "normal");
  pdf.setFontSize(9.5);
  pdf.text(form.company || "Company name", x, y);
  y += 5;
  if (form.companyWebsite) {
    pdf.setTextColor(90, 105, 112);
    pdf.text(form.companyWebsite, x, y);
    y += 5;
  }
  y += 3;
  setColour(pdf, accent);
  pdf.setFont(font, "bold");
  pdf.setFontSize(10);
  pdf.text(
    `Re: ${form.role ? `Application for ${form.role}` : "Application for the advertised role"}`,
    x,
    y,
  );
  y += 9;

  pdf.setTextColor(40, 51, 58);
  pdf.setFont(font, "normal");
  pdf.setFontSize(10.2);
  const paragraphs = String(letter || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  let estimatedLines = 0;
  for (const paragraph of paragraphs) {
    estimatedLines += pdf.splitTextToSize(paragraph, width).length;
  }
  const estimatedHeight =
    estimatedLines * lineHeight + Math.max(paragraphs.length - 1, 0) * 3.5;
  const fillScale = pageFillScale(y, estimatedHeight);
  const filledLineHeight = lineHeight * fillScale;
  const paragraphGap = 3.5 * fillScale;
  for (const paragraph of paragraphs) {
    const lines = pdf.splitTextToSize(paragraph, width);
    for (const line of lines) {
      if (y > 278) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(line, x, y);
      y += filledLineHeight;
    }
    y += paragraphGap;
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
  const font = pdfFont(template.font);
  const background = template.background || "#ffffff";
  const rowHeight = Math.max(
    8.5,
    (template.density === "compact"
      ? 9
      : template.density === "spacious"
        ? 13.5
        : 11) * (lineSpacingValue(template.lineSpacing) > 1.25 ? 1.12 : 1),
  );
  if (background.toLowerCase() !== "#ffffff") {
    setColour(pdf, background, true);
    pdf.rect(0, 0, 210, 297, "F");
  }
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
  if (template.layout === "band" || template.layout === "proposal") {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 210, template.layout === "proposal" ? 52 : 48, "F");
  } else if (template.layout === "side") {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 45, 297, "F");
  } else if (
    template.layout === "estimate" ||
    template.layout === "scope"
  ) {
    setColour(pdf, accent, true);
    pdf.rect(0, 0, 210, 6, "F");
  }
  const left = template.layout === "side" ? 56 : 16;
  const right = 194;
  const isQuote = kind === "Quotation";
  if (logoData) pdf.addImage(logoData, "PNG", left, 10, 28, 20);
  pdf.setFont(font, "bold");
  pdf.setFontSize(logoData ? 15 : 22);
  pdf.setTextColor(
    ...(template.layout === "band" || template.layout === "proposal"
      ? [255, 255, 255]
      : rgb(primary)),
  );
  pdf.text(form.business, left + (logoData ? 34 : 0), 21);
  pdf.setFontSize(isQuote ? 16 : 20);
  pdf.text(isQuote ? "QUOTATION" : "INVOICE", right, 21, { align: "right" });
  if (isQuote) {
    pdf.setFontSize(8);
    pdf.text(
      template.layout === "estimate"
        ? "ESTIMATE"
        : template.layout === "scope"
          ? "SCOPE OF WORK"
          : "PROPOSAL",
      right,
      28,
      { align: "right" },
    );
  }
  pdf.setTextColor(48, 60, 67);
  pdf.setFont(font, "normal");
  pdf.setFontSize(9);
  pdf.text(
    `${isQuote ? "Prepared for" : "Bill to"}: ${form.client}`,
    left,
    58,
  );
  if (form.clientAddress) pdf.text(form.clientAddress, left, 63);
  pdf.text(
    `${isQuote ? "Quote" : "Invoice"} no: ${form.number}`,
    right,
    52,
    { align: "right" },
  );
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
    pdf.text(isQuote ? "DELIVERABLE" : "DESCRIPTION", left + 4, top + 6.5);
    pdf.text("QTY", 137, top + 6.5);
    pdf.text("PRICE", 158, top + 6.5);
    pdf.text("AMOUNT", right, top + 6.5, { align: "right" });
  };
  drawTableHead(70);
  let y = 91;
  pdf.setFont(font, "normal");
  const itemCount = Math.max(items.length, 1);
  const rowFillScale = pageFillScale(
    y,
    itemCount * rowHeight + 48,
    250,
  );
  const filledRowHeight = rowHeight * Math.max(rowFillScale, 1);
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
    y += filledRowHeight;
  });
  y += 12;
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
  pdf.text(isQuote ? "QUOTE TOTAL" : "TOTAL DUE", 145, y + 23);
  pdf.text(`P ${amount(total)}`, right, y + 23, { align: "right" });
  const notesY = y + 38;
  pdf.setFont(font, "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(40, 55, 62);
  pdf.text(isQuote ? "QUOTE NOTES" : "PAYMENT DETAILS", left, notesY);
  pdf.setFont(font, "normal");
  pdf.setFontSize(8.2);
  pdf.setTextColor(75, 87, 94);
  pdf.text(
    pdf.splitTextToSize(
      form.notes ||
        (isQuote
          ? "This quotation is valid until the date shown. Acceptance confirms the scope and pricing above."
          : "Bank transfer · Include document number as reference · Payment due within stated terms."),
      Math.min(110, right - left - 60),
    ),
    left,
    notesY + 5,
  );
  pdf.save(
    `${kind.toLowerCase()}-${safeName(form.number, "document")}-${safeName(template.name, "template")}.pdf`,
  );
};
