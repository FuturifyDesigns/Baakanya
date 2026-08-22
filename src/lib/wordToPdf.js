import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import mammoth from "mammoth";
import { renderAsync } from "docx-preview";
import { yieldToMain } from "./processingLock";

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;
const CAPTURE_SCALE = 1.5;
const JPEG_QUALITY = 0.95;

/** Only strip preview chrome (shadows/margins) — never override Word typography. */
const CAPTURE_CHROME_FIX = `
  .docx-wrapper > section.docx {
    box-shadow: none !important;
    margin: 0 !important;
  }
  .docx-wrapper {
    background: #fff !important;
    padding: 0 !important;
  }
`;

const MAMMOTH_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Title'] => h1.title:fresh",
  "p[style-name='Subtitle'] => h2.subtitle:fresh",
  "r[style-name='Strong'] => strong",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote.intense:fresh",
  "p[style-name='List Paragraph'] => p.list-paragraph:fresh",
];

const waitForImages = (root) =>
  Promise.all(
    [...root.querySelectorAll("img")].map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        }),
    ),
  );

const waitForLayout = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

const waitForFonts = (doc = document) => doc.fonts?.ready ?? Promise.resolve();

const createHiddenMount = () => {
  const mount = document.createElement("div");
  mount.setAttribute("aria-hidden", "true");
  mount.tabIndex = -1;
  mount.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${PAGE_WIDTH_PX}px`,
    "opacity:0",
    "visibility:hidden",
    "pointer-events:none",
    "overflow:hidden",
    "z-index:-1",
    "contain:strict",
  ].join(";");
  document.body.appendChild(mount);
  return {
    mount,
    cleanup: () => mount.remove(),
  };
};

const canvasHasInk = (canvas) => {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) return false;
  const sampleHeight = Math.min(canvas.height, 240);
  const sampleWidth = Math.min(canvas.width, canvas.width);
  const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a > 8 && (r < 245 || g < 245 || b < 245)) return true;
  }
  return false;
};

const captureElementCanvas = async (element) => {
  await waitForLayout();
  await waitForImages(element);

  const width = Math.max(element.scrollWidth, element.offsetWidth, PAGE_WIDTH_PX);
  const height = Math.max(element.scrollHeight, element.offsetHeight, PAGE_HEIGHT_PX);

  return html2canvas(element, {
    scale: CAPTURE_SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 20000,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
  });
};

const addCanvasToPdf = (pdf, canvas, isFirstPage) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight + 1) {
    if (!isFirstPage) pdf.addPage();
    pdf.addImage(
      canvas.toDataURL("image/jpeg", JPEG_QUALITY),
      "JPEG",
      0,
      0,
      imgWidth,
      imgHeight,
    );
    return;
  }

  const sliceHeightPx = (pageHeight / imgHeight) * canvas.height;
  let renderedPx = 0;
  let sliceIndex = 0;
  while (renderedPx < canvas.height) {
    if (!isFirstPage || sliceIndex > 0) pdf.addPage();
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - renderedPx);
    const ctx = sliceCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      renderedPx,
      canvas.width,
      sliceCanvas.height,
      0,
      0,
      canvas.width,
      sliceCanvas.height,
    );
    const sliceHeightPt = (sliceCanvas.height * imgWidth) / canvas.width;
    pdf.addImage(
      sliceCanvas.toDataURL("image/jpeg", JPEG_QUALITY),
      "JPEG",
      0,
      0,
      imgWidth,
      sliceHeightPt,
    );
    renderedPx += sliceCanvas.height;
    sliceIndex += 1;
  }
};

const renderPlainTextPdf = async (file, text, onProgress) => {
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const margin = 56;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const paragraphs = String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  let y = margin;
  let lineCount = 0;

  pdf.setFont("times", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(17, 17, 17);

  onProgress?.({
    label: "Building PDF from document text…",
    phase: "text",
    current: 0,
    total: paragraphs.length || 1,
  });
  await yieldToMain();

  for (let index = 0; index < paragraphs.length; index++) {
    const paragraph = paragraphs[index];
    const lines = pdf.splitTextToSize(paragraph, maxWidth);
    onProgress?.({
      label: `Writing section ${index + 1} of ${paragraphs.length}`,
      phase: "text",
      current: index + 1,
      total: paragraphs.length,
    });
    for (const line of lines) {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 14;
      lineCount += 1;
      if (lineCount % 40 === 0) await yieldToMain();
    }
    y += 8;
  }

  if (!paragraphs.length) {
    pdf.text(" ", margin, y);
  }

  onProgress?.({ label: "Saving PDF…", phase: "save" });
  await yieldToMain();
  pdf.save(file.name.replace(/\.docx$/i, "") + ".pdf");
};

const collectDocxPreviewPages = (bodyContainer) => {
  const sections = [...bodyContainer.querySelectorAll("section.docx")];
  if (sections.length) return sections;

  const wrapper = bodyContainer.querySelector(".docx-wrapper");
  if (wrapper) return [wrapper];

  return bodyContainer.childElementCount ? [bodyContainer] : [];
};

const renderWithDocxPreview = async (bytes, onProgress) => {
  const { mount, cleanup } = createHiddenMount();

  try {
    const styleContainer = document.createElement("div");
    const bodyContainer = document.createElement("div");
    const chromeFix = document.createElement("style");
    chromeFix.textContent = CAPTURE_CHROME_FIX;

    mount.appendChild(styleContainer);
    mount.appendChild(chromeFix);
    mount.appendChild(bodyContainer);

    onProgress?.({ label: "Rendering Word layout…", phase: "layout" });
    await yieldToMain();

    await renderAsync(bytes, bodyContainer, styleContainer, {
      className: "docx",
      inWrapper: true,
      breakPages: true,
      ignoreFonts: false,
      ignoreWidth: false,
      ignoreHeight: false,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    });

    await waitForFonts();
    await waitForLayout();
    await waitForImages(bodyContainer);
    await yieldToMain();

    const pages = collectDocxPreviewPages(bodyContainer);
    if (!pages.length) return null;

    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    let capturedPages = 0;

    for (let index = 0; index < pages.length; index++) {
      onProgress?.({
        label: `Rendering page ${index + 1} of ${pages.length}`,
        phase: "render",
        current: index + 1,
        total: pages.length,
      });
      await yieldToMain();

      const canvas = await captureElementCanvas(pages[index]);
      await yieldToMain();

      if (!canvasHasInk(canvas)) continue;
      addCanvasToPdf(pdf, canvas, capturedPages === 0);
      capturedPages += 1;
      await yieldToMain();
    }

    return capturedPages > 0 ? pdf : null;
  } finally {
    cleanup();
  }
};

const renderWithMammothFallback = async (bytes, plainText, onProgress) => {
  const options = {
    includeDefaultStyleMap: true,
    includeEmbeddedStyleMap: true,
    styleMap: MAMMOTH_STYLE_MAP,
    convertImage: mammoth.images.imgElement((image) =>
      image.read("base64").then((imageBuffer) => ({
        src: `data:${image.contentType};base64,${imageBuffer}`,
      })),
    ),
  };

  const htmlResult = await mammoth.convertToHtml({ arrayBuffer: bytes.slice(0) }, options);
  const html = (htmlResult.value || "").trim();
  if (!html) return null;

  const { mount, cleanup } = createHiddenMount();

  try {
    const styleContainer = document.createElement("div");
    const bodyContainer = document.createElement("div");
    bodyContainer.className = "docx-fallback-capture";
    bodyContainer.style.cssText = `width:${PAGE_WIDTH_PX}px;background:#fff;`;
    bodyContainer.innerHTML = html;

    mount.appendChild(styleContainer);
    mount.appendChild(bodyContainer);

    await waitForFonts();
    await waitForLayout();
    await waitForImages(bodyContainer);
    await yieldToMain();

    onProgress?.({ label: "Rendering document…", phase: "render", current: 1, total: 1 });
    const canvas = await captureElementCanvas(bodyContainer);
    if (!canvasHasInk(canvas)) return null;

    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    addCanvasToPdf(pdf, canvas, true);
    return pdf;
  } finally {
    cleanup();
  }
};

const extractPlainText = async (bytes) => {
  const textResult = await mammoth.extractRawText({ arrayBuffer: bytes.slice(0) });
  return (textResult.value || "").trim();
};

export async function convertDocxToPdf(file, { onProgress } = {}) {
  const report = (payload) => onProgress?.(payload);

  report({ label: "Reading Word document…", phase: "prepare" });
  await yieldToMain();

  const bytes = await file.arrayBuffer();

  let pdf = null;
  try {
    pdf = await renderWithDocxPreview(bytes, report);
  } catch {
    pdf = null;
  }

  if (!pdf) {
    report({ label: "Trying alternate renderer…", phase: "layout" });
    await yieldToMain();
    const plainText = await extractPlainText(bytes);
    try {
      pdf = await renderWithMammothFallback(bytes, plainText, report);
    } catch {
      pdf = null;
    }

    if (!pdf && plainText) {
      await renderPlainTextPdf(file, plainText, report);
      return;
    }
  }

  if (!pdf) {
    throw new Error(
      "This Word file could not be converted. Try saving it as .docx and upload again.",
    );
  }

  report({ label: "Saving PDF…", phase: "save" });
  await yieldToMain();
  pdf.save(file.name.replace(/\.docx$/i, "") + ".pdf");
}
