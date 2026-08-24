import { jsPDF } from "jspdf";
import { fontPdf, lineSpacingValue } from "./customization.js";

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

const contactValues = (form) =>
  [form.email, form.phone, form.location, form.website, form.linkedin].filter(
    Boolean,
  );

const businessContactValues = (form) =>
  [form.email, form.phone, form.address].filter(Boolean);

const writeJoinedText = (
  pdf,
  parts,
  x,
  y,
  width,
  font,
  {
    color = [65, 77, 84],
    size = 8.5,
    style = "normal",
    lineHeight = 4.2,
    gap = 6,
    align,
  } = {},
) => {
  const text = parts.filter(Boolean).join("  •  ");
  if (!text) return y;
  pdf.setFont(font, style);
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
  const lines = pdf.splitTextToSize(text, width);
  if (align) pdf.text(lines, x, y, { align });
  else pdf.text(lines, x, y);
  return y + lines.length * lineHeight + (lines.length ? gap : 0);
};

const writeContactInline = (pdf, form, x, y, width, font, color = [65, 77, 84]) =>
  writeJoinedText(pdf, contactValues(form), x, y, width, font, { color });

const writeBusinessContact = (
  pdf,
  form,
  x,
  y,
  width,
  font,
  color = [100, 115, 122],
) =>
  writeJoinedText(pdf, businessContactValues(form), x, y, width, font, {
    color,
    size: 8,
    lineHeight: 3.8,
    gap: 4,
  });

const writeWrapped = (
  pdf,
  text,
  x,
  y,
  width,
  font,
  {
    color = [38, 50, 57],
    size = 9,
    style = "normal",
    lineHeight = 4.5,
    gap = 0,
    align,
  } = {},
) => {
  if (!text) return y;
  pdf.setFont(font, style);
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
  const lines = pdf.splitTextToSize(String(text), width);
  if (align) pdf.text(lines, x, y, { align });
  else pdf.text(lines, x, y);
  return y + lines.length * lineHeight + gap;
};

const drawAccentRule = (pdf, x, y, width, accent) => {
  setColour(pdf, accent, true);
  pdf.rect(x, y, width, 0.8, "F");
  return y + 5;
};

const writeContactStacked = (
  pdf,
  form,
  x,
  y,
  width,
  font,
  color = [65, 77, 84],
) => {
  const values = contactValues(form);
  if (!values.length) return y;
  pdf.setFont(font, "normal");
  pdf.setFontSize(8.2);
  pdf.setTextColor(...color);
  let cy = y;
  for (const line of values) {
    const wrapped = pdf.splitTextToSize(line, width);
    pdf.text(wrapped, x, cy);
    cy += wrapped.length * 3.8 + 1.5;
  }
  return cy + 4;
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
  return Math.min(1.8, available / estimatedHeight);
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
  const typeScale = options.typeScale || 1;
  if (!body) return y;
  if (y > 270) {
    pdf.addPage();
    y = 20;
  }
  setColour(pdf, accent);
  pdf.setFont(font, "bold");
  pdf.setFontSize(8.5 * typeScale);
  pdf.text(String(title).toUpperCase(), x, y);
  y += 2.2;
  setColour(pdf, accent, true);
  pdf.rect(x, y, width, 0.55, "F");
  y += 5;

  pdf.setTextColor(38, 50, 57);
  pdf.setFont(font, "normal");
  pdf.setFontSize(9.2 * typeScale);

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
      pdf.setFontSize(9.4 * typeScale);
      const head = lines[0].replace(/^[-•*]\s*/, "");
      writeLines([head], false);
      pdf.setFont(font, "normal");
      pdf.setFontSize(9 * typeScale);
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

export const renderCvPdf = ({ form, template, photoData, skills, save = true }) => {
  const pdf = new jsPDF();
  const layout = template.layout || "minimal";
  const sidebar = layout === "sidebar";
  const band = layout === "band";
  const splitLike = layout === "split" || layout === "panel";
  const stackedLike = layout === "stacked" || layout === "centered";
  const classicLike = ["minimal", "classic", "modern", "flag"].includes(layout);
  const primary = template.primary;
  const accent = template.accent;
  const font = pdfFont(template.font);
  const density = template.density || "comfortable";
  const lineHeight = bodyLineHeight(template);
  const background = template.background || "#ffffff";
  let contentX = sidebar ? 68 : 18;
  let contentWidth = sidebar ? 124 : 174;
  let y = 20;

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
    pdf.setFont(font, "bold");
    pdf.setFontSize(23);
    const nameLines = pdf.splitTextToSize(
      form.name || "Your name",
      photoData ? 138 : 174,
    );
    const roleText = form.expertise || form.role || "";
    pdf.setFont(font, "normal");
    pdf.setFontSize(10);
    const roleLines = roleText
      ? pdf.splitTextToSize(roleText, photoData ? 138 : 174)
      : [];
    const bandHeight = Math.max(
      47,
      12 + nameLines.length * 7 + roleLines.length * 4.5 + 10,
    );
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 210, bandHeight, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(font, "bold");
    pdf.setFontSize(23);
    pdf.text(nameLines, 18, 20);
    let bandY = 20 + nameLines.length * 7;
    if (roleLines.length) {
      pdf.setFont(font, "normal");
      pdf.setFontSize(10);
      pdf.text(roleLines, 18, bandY);
      bandY += roleLines.length * 4.5;
    }
    if (photoData) pdf.addImage(photoData, "PNG", 165, 7, 32, 32);
    y = writeContactInline(
      pdf,
      form,
      18,
      bandHeight + 6,
      photoData ? 138 : 174,
      font,
      [50, 63, 70],
    );
    y = Math.max(y, bandHeight + 14);
  } else if (splitLike) {
    const headerHeight = 50;
    if (layout === "panel") {
      setColour(pdf, background, true);
      pdf.rect(0, 0, 210, headerHeight, "F");
    }
    setColour(pdf, primary);
    pdf.setFont(font, "bold");
    pdf.setFontSize(22);
    const nameLines = pdf.splitTextToSize(form.name || "Your name", photoData ? 118 : 174);
    pdf.text(nameLines, 18, 17);
    const roleY = 17 + nameLines.length * 7 + 2;
    setColour(pdf, accent);
    pdf.setFont(font, "normal");
    pdf.setFontSize(9.5);
    const roleLines = pdf.splitTextToSize(
      (form.expertise || form.role || "").toUpperCase(),
      photoData ? 118 : 174,
    );
    pdf.text(roleLines, 18, roleY);
    let metaBottom = roleY + roleLines.length * 4;
    if (photoData) {
      pdf.addImage(photoData, "PNG", 152, 10, 26, 26);
      metaBottom = Math.max(
        metaBottom,
        writeContactStacked(pdf, form, 152, 38, 48, font),
      );
    } else {
      metaBottom = Math.max(
        metaBottom,
        writeContactStacked(pdf, form, 118, 12, 80, font),
      );
    }
    setColour(pdf, accent, true);
    pdf.rect(18, headerHeight - 1, 174, 1.2, "F");
    y = Math.max(headerHeight + 8, metaBottom + 6);
  } else if (stackedLike) {
    let cy = 14;
    if (photoData) {
      const photoX = layout === "centered" ? 91 : 18;
      pdf.addImage(photoData, "PNG", photoX, cy, 28, 28);
      cy += 34;
    }
    setColour(pdf, primary);
    pdf.setFont(font, "bold");
    pdf.setFontSize(layout === "centered" ? 24 : 22);
    const nameX = layout === "centered" ? 105 : 18;
    const nameWidth = layout === "centered" ? 150 : 174;
    const nameLines = pdf.splitTextToSize(form.name || "Your name", nameWidth);
    pdf.text(nameLines, nameX, cy, {
      align: layout === "centered" ? "center" : "left",
    });
    cy += nameLines.length * 7 + 2;
    setColour(pdf, accent);
    pdf.setFont(font, "normal");
    pdf.setFontSize(9.5);
    const roleLines = pdf.splitTextToSize(
      (form.expertise || form.role || "").toUpperCase(),
      nameWidth,
    );
    pdf.text(roleLines, nameX, cy, {
      align: layout === "centered" ? "center" : "left",
    });
    cy += roleLines.length * 4 + 3;
    cy = writeContactStacked(
      pdf,
      form,
      layout === "centered" ? 30 : 18,
      cy,
      nameWidth,
      font,
    );
    setColour(pdf, accent, true);
    pdf.rect(18, cy - 2, 174, 1.2, "F");
    y = cy + 8;
  } else if (classicLike) {
    setColour(pdf, primary);
    pdf.setFont(font, "bold");
    pdf.setFontSize(layout === "classic" ? 25 : 23);
    const nameWidth = photoData ? 130 : 174;
    const nameLines = pdf.splitTextToSize(form.name || "Your name", nameWidth);
    pdf.text(nameLines, 18, 21);
    const roleY = 21 + nameLines.length * 7 + 2;
    setColour(pdf, accent);
    pdf.setFontSize(10);
    pdf.text((form.expertise || form.role || "").toUpperCase(), 18, roleY);
    const ruleY = roleY + 6;
    setColour(pdf, accent, true);
    pdf.rect(18, ruleY, 174, 1.2, "F");
    if (photoData) pdf.addImage(photoData, "PNG", 164, 9, 28, 28);
    y = writeContactInline(pdf, form, 18, ruleY + 5, nameWidth, font);
    y = Math.max(y, photoData ? ruleY + 19 : ruleY + 15);
  } else {
    setColour(pdf, primary);
    pdf.setFont(font, "bold");
    pdf.setFontSize(23);
    const nameWidth = photoData ? 130 : 174;
    const nameLines = pdf.splitTextToSize(form.name || "Your name", nameWidth);
    pdf.text(nameLines, 18, 21);
    const roleY = 21 + nameLines.length * 7 + 2;
    setColour(pdf, accent);
    pdf.setFontSize(10);
    pdf.text((form.expertise || form.role || "").toUpperCase(), 18, roleY);
    const ruleY = roleY + 6;
    setColour(pdf, accent, true);
    pdf.rect(18, ruleY, 174, 1.2, "F");
    if (photoData) pdf.addImage(photoData, "PNG", 164, 9, 28, 28);
    y = writeContactInline(pdf, form, 18, ruleY + 5, nameWidth, font);
    y = Math.max(y, photoData ? ruleY + 19 : ruleY + 15);
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
  const typeScale = Math.min(1.22, 1 + (fillScale - 1) * 0.45);
  const filledLineHeight = lineHeight * Math.min(fillScale, 1.65);
  const sectionGap = 4 * fillScale;
  const sectionOptions = {
    x: contentX,
    width: contentWidth,
    accent,
    font,
    density,
    lineSpacing: template.lineSpacing,
    lineHeight: filledLineHeight,
    sectionGap,
    typeScale,
  };

  for (const section of mainSections) {
    if (!section.body && section.key !== "skills") continue;
    y = writeSection(pdf, sectionLabels[section.key], section.body, {
      ...sectionOptions,
      y,
    });
  }
  if (save) {
    pdf.save(
      `${safeName(form.name, "baakanya")}-${safeName(template.name, "cv")}-cv.pdf`,
    );
  }
  return pdf;
};

export const renderCoverLetterPdf = ({ form, template, photoData, letter }) => {
  const pdf = new jsPDF();
  const layout = template.layout || "letter";
  const { primary, accent } = template;
  const font = pdfFont(template.font);
  const background = template.background || "#ffffff";
  const lineHeight = bodyLineHeight(template);
  const lightHeader = layout === "band";
  const showRail = layout === "rail";
  const isCentered = layout === "centered";
  const isAccentTop = layout === "accent-top";
  const hasPhoto = photoData && template.photo !== "none";

  if (background.toLowerCase() !== "#ffffff") {
    setColour(pdf, background, true);
    pdf.rect(0, 0, 210, 297, "F");
  }

  const contentX = showRail ? 42 : 20;
  const contentWidth = showRail ? 148 : 170;
  const textWidth = contentWidth - (hasPhoto && !lightHeader ? 30 : 0);
  const nameColor = lightHeader ? [255, 255, 255] : rgb(primary);
  const contactColor = lightHeader ? [235, 242, 246] : rgb(accent);
  let y = isAccentTop ? 14 : 18;

  if (showRail) {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 28, 297, "F");
  }
  if (isAccentTop) {
    setColour(pdf, accent, true);
    pdf.rect(0, 0, 210, 6, "F");
  }

  if (lightHeader) {
    pdf.setFont(font, "bold");
    pdf.setFontSize(18);
    const nameLines = pdf.splitTextToSize(form.name || "Your name", textWidth);
    pdf.setFont(font, "normal");
    pdf.setFontSize(8.5);
    const contactText = contactValues(form).join("  •  ");
    const contactLines = contactText
      ? pdf.splitTextToSize(contactText, textWidth)
      : [];
    const bandHeight = Math.max(
      42,
      14 +
        nameLines.length * 6.5 +
        (contactLines.length ? contactLines.length * 4.2 + 4 : 0) +
        8,
    );
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 210, bandHeight, "F");
    pdf.setFont(font, "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...nameColor);
    pdf.text(nameLines, contentX, 16);
    let contactY = 16 + nameLines.length * 6.5 + 2;
    if (contactLines.length) {
      pdf.setFont(font, "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...contactColor);
      pdf.text(contactLines, contentX, contactY);
    }
    if (hasPhoto) pdf.addImage(photoData, "PNG", 170, 8, 24, 24);
    y = bandHeight + 6;
  } else if (isCentered) {
    let cy = 14;
    if (hasPhoto) {
      pdf.addImage(photoData, "PNG", 93, cy, 24, 24);
      cy += 30;
    }
    cy = writeWrapped(pdf, form.name || "Your name", 105, cy, 150, font, {
      color: nameColor,
      size: 18,
      style: "bold",
      lineHeight: 7,
      gap: 4,
      align: "center",
    });
    cy = writeContactStacked(pdf, form, 30, cy, 150, font, contactColor);
    y = cy + 4;
  } else {
    y = writeWrapped(pdf, form.name || "Your name", contentX, y, textWidth, font, {
      color: nameColor,
      size: 18,
      style: "bold",
      lineHeight: 7,
      gap: 2,
    });
    y = writeContactInline(pdf, form, contentX, y, textWidth, font, contactColor);
    if (hasPhoto) pdf.addImage(photoData, "PNG", 170, 8, 24, 24);
    y += 2;
  }

  y = drawAccentRule(pdf, contentX, y, contentWidth, accent);

  y = writeWrapped(
    pdf,
    new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    contentX,
    y,
    contentWidth,
    font,
    { color: [80, 95, 102], size: 9, lineHeight: 4.5, gap: 8 },
  );

  y = writeWrapped(
    pdf,
    form.hiringManager || "Hiring Manager",
    contentX,
    y,
    contentWidth,
    font,
    { color: [30, 42, 48], size: 10, style: "bold", lineHeight: 5, gap: 2 },
  );
  y = writeWrapped(
    pdf,
    form.company || "Company name",
    contentX,
    y,
    contentWidth,
    font,
    { color: [30, 42, 48], size: 9.5, lineHeight: 5, gap: 2 },
  );
  if (form.companyWebsite) {
    y = writeWrapped(pdf, form.companyWebsite, contentX, y, contentWidth, font, {
      color: [90, 105, 112],
      size: 9,
      lineHeight: 4.5,
      gap: 2,
    });
  }
  y += 3;

  setColour(pdf, accent);
  pdf.setFont(font, "bold");
  pdf.setFontSize(10);
  const subject = `Re: ${form.role ? `Application for ${form.role}` : "Application for the advertised role"}`;
  const subjectLines = pdf.splitTextToSize(subject, contentWidth);
  pdf.text(subjectLines, contentX, y);
  y += subjectLines.length * 5 + 6;

  pdf.setTextColor(40, 51, 58);
  pdf.setFont(font, "normal");
  pdf.setFontSize(10.2);
  const paragraphs = String(letter || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  let estimatedLines = 0;
  for (const paragraph of paragraphs) {
    estimatedLines += pdf.splitTextToSize(paragraph, contentWidth).length;
  }
  const estimatedHeight =
    estimatedLines * lineHeight + Math.max(paragraphs.length - 1, 0) * 3.5;
  const fillScale = pageFillScale(y, estimatedHeight);
  const filledLineHeight = lineHeight * fillScale;
  const paragraphGap = 3.5 * fillScale;
  for (const paragraph of paragraphs) {
    const lines = pdf.splitTextToSize(paragraph, contentWidth);
    for (const line of lines) {
      if (y > 278) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(line, contentX, y);
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
  const layout = template.layout || "clean";
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
  const isQuote = kind === "Quotation";
  const showBand =
    layout === "band" || layout === "proposal" || layout === "masthead";
  const showSide = layout === "side";
  const showEstimateBar = layout === "estimate" || layout === "scope";
  const left = showSide ? 56 : 16;
  const right = 194;
  const brandX = left + (logoData ? 34 : 0);
  const brandWidth = showBand ? 112 : 124;
  const lightHeader = showBand;

  if (showSide) {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 45, 297, "F");
  }
  if (showEstimateBar) {
    setColour(pdf, accent, true);
    pdf.rect(0, 0, 210, 6, "F");
  }

  pdf.setFont(font, "bold");
  pdf.setFontSize(logoData ? 15 : 22);
  const businessLines = pdf.splitTextToSize(
    form.business || "Your business",
    brandWidth,
  );
  pdf.setFont(font, "normal");
  pdf.setFontSize(8);
  const contactText = businessContactValues(form).join("  •  ");
  const contactLines = contactText
    ? pdf.splitTextToSize(contactText, brandWidth)
    : [];
  const brandBlockHeight =
    (logoData ? 22 : 0) +
    businessLines.length * (logoData ? 5.5 : 7) +
    (contactLines.length ? contactLines.length * 3.8 + 2 : 0) +
    8;
  const titleBlockHeight = isQuote ? 28 : 22;
  const headerInnerHeight = Math.max(brandBlockHeight, titleBlockHeight);
  const bandHeight = showBand
    ? Math.max(layout === "proposal" ? 52 : 48, headerInnerHeight + 14)
    : 0;
  const headerBottom = showBand ? bandHeight + 8 : Math.max(44, headerInnerHeight + 12);

  if (showBand) {
    setColour(pdf, primary, true);
    pdf.rect(0, 0, 210, bandHeight, "F");
  }

  if (logoData) pdf.addImage(logoData, "PNG", left, showBand ? 12 : 10, 28, 20);

  pdf.setFont(font, "bold");
  pdf.setFontSize(logoData ? 15 : 22);
  pdf.setTextColor(...(lightHeader ? [255, 255, 255] : rgb(primary)));
  pdf.text(businessLines, brandX, showBand ? 18 : 21);
  const brandEndY =
    (showBand ? 18 : 21) + businessLines.length * (logoData ? 5.5 : 7);
  if (contactLines.length) {
    writeBusinessContact(
      pdf,
      form,
      brandX,
      brandEndY + 1,
      brandWidth,
      font,
      lightHeader ? [230, 238, 244] : [100, 115, 122],
    );
  }

  pdf.setFont(font, "bold");
  pdf.setFontSize(isQuote ? 16 : 20);
  pdf.setTextColor(...(lightHeader ? [255, 255, 255] : rgb(primary)));
  pdf.text(isQuote ? "QUOTATION" : "INVOICE", right, showBand ? 18 : 21, {
    align: "right",
  });
  if (isQuote) {
    pdf.setFontSize(8);
    pdf.text(
      layout === "estimate"
        ? "ESTIMATE"
        : layout === "scope"
          ? "SCOPE OF WORK"
          : "PROPOSAL",
      right,
      showBand ? 26 : 28,
      { align: "right" },
    );
  }

  let metaY = headerBottom;
  if (showEstimateBar && isQuote) {
    setColour(pdf, accent, true);
    pdf.rect(left, metaY, right - left, 8, "F");
    pdf.setFont(font, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(20, 31, 37);
    pdf.text(
      `Valid until ${form.validUntil || "—"}  ·  Not a tax invoice`,
      left + 4,
      metaY + 5.5,
    );
    metaY += 12;
  }

  pdf.setTextColor(48, 60, 67);
  pdf.setFont(font, "normal");
  pdf.setFontSize(9);
  const clientLabel = `${isQuote ? "Prepared for" : "Bill to"}: ${form.client || "Client name"}`;
  const clientLines = pdf.splitTextToSize(clientLabel, 96);
  pdf.text(clientLines, left, metaY);
  let leftMetaBottom = metaY + clientLines.length * 4.5;
  if (form.clientAddress) {
    const addressLines = pdf.splitTextToSize(form.clientAddress, 96);
    pdf.text(addressLines, left, leftMetaBottom + 1);
    leftMetaBottom += addressLines.length * 4.5 + 1;
  }
  if (form.clientEmail) {
    const emailLines = pdf.splitTextToSize(form.clientEmail, 96);
    pdf.text(emailLines, left, leftMetaBottom + 1);
    leftMetaBottom += emailLines.length * 4.5 + 1;
  }

  let rightMetaY = metaY;
  pdf.text(
    `${isQuote ? "Quote" : "Invoice"} no: ${form.number || "001"}`,
    right,
    rightMetaY,
    { align: "right" },
  );
  rightMetaY += 6;
  pdf.text(`Issue date: ${form.date || "—"}`, right, rightMetaY, {
    align: "right",
  });
  rightMetaY += 6;
  if (kind === "Invoice" && form.dueDate) {
    pdf.text(`Due date: ${form.dueDate}`, right, rightMetaY, { align: "right" });
    rightMetaY += 6;
  }
  if (kind === "Quotation" && form.validUntil) {
    pdf.text(`Valid until: ${form.validUntil}`, right, rightMetaY, {
      align: "right",
    });
    rightMetaY += 6;
  }

  const tableTop = Math.max(leftMetaBottom, rightMetaY) + 8;
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
  drawTableHead(tableTop);
  let y = tableTop + 21;
  pdf.setFont(font, "normal");
  pdf.setTextColor(48, 60, 67);
  pdf.setFontSize(9);
  const itemCount = Math.max(items.length, 1);
  const rowFillScale = pageFillScale(y, itemCount * rowHeight + 48, 250);
  const filledRowHeight = rowHeight * Math.max(rowFillScale, 1);
  items.forEach((item) => {
    const descLines = pdf.splitTextToSize(item.description || "", 82);
    const rowH = Math.max(filledRowHeight, descLines.length * 4.5 + 4);
    if (y + rowH > 250) {
      pdf.addPage();
      drawTableHead(20);
      pdf.setFont(font, "normal");
      pdf.setTextColor(48, 60, 67);
      y = 36;
    }
    pdf.text(descLines, left + 4, y);
    pdf.text(String(item.qty), 139, y);
    pdf.text(amount(item.price), 158, y);
    pdf.text(amount(Number(item.qty) * Number(item.price)), right, y, {
      align: "right",
    });
    pdf.setDrawColor(222, 228, 231);
    pdf.line(left, y + rowH - 4, right, y + rowH - 4);
    y += rowH;
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
  const noteLines = pdf.splitTextToSize(
    form.notes ||
      (isQuote
        ? "This quotation is valid until the date shown. Acceptance confirms the scope and pricing above."
        : "Bank transfer · Include document number as reference · Payment due within stated terms."),
    right - left - 8,
  );
  pdf.text(noteLines, left, notesY + 5);
  pdf.save(
    `${kind.toLowerCase()}-${safeName(form.number, "document")}-${safeName(template.name, "template")}.pdf`,
  );
};
