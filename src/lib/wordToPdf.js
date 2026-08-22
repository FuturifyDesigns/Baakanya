import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import mammoth from "mammoth";
import { yieldToMain } from "./processingLock";

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;
const PAGE_PADDING = { top: 48, right: 56, bottom: 48, left: 56 };
const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "TABLE",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "IMG",
  "HR",
  "PRE",
  "FIGURE",
  "DIV",
]);

const CAPTURE_SCALE = 1.15;

const MAMMOTH_STYLE_MAP = [
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

const CAPTURE_STYLES = `
  .word-pdf-page {
    box-sizing: border-box;
    color: #111 !important;
    font: 12pt/1.5 "Times New Roman", Times, serif;
    word-wrap: break-word;
    overflow-wrap: anywhere;
    background: #fff !important;
  }
  .word-pdf-page * {
    box-sizing: border-box;
    color: inherit;
  }
  .word-pdf-page img {
    max-width: 100%;
    height: auto;
    display: block;
  }
  .word-pdf-page table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    table-layout: fixed;
  }
  .word-pdf-page td, .word-pdf-page th {
    border: 1px solid #777;
    padding: 4px 6px;
    vertical-align: top;
    word-break: break-word;
  }
  .word-pdf-page p { margin: 0 0 10px; }
  .word-pdf-page h1 { font-size: 20pt; margin: 18px 0 10px; font-weight: bold; }
  .word-pdf-page h2 { font-size: 16pt; margin: 16px 0 8px; font-weight: bold; }
  .word-pdf-page h3 { font-size: 14pt; margin: 14px 0 8px; font-weight: bold; }
  .word-pdf-page h4 { font-size: 12pt; margin: 12px 0 6px; font-weight: bold; }
  .word-pdf-page ul, .word-pdf-page ol { margin: 0 0 10px 24px; padding: 0; }
  .word-pdf-page li { margin-bottom: 4px; }
  .word-pdf-page blockquote {
    margin: 10px 0 10px 16px;
    padding-left: 12px;
    border-left: 3px solid #ccc;
  }
  .word-pdf-page strong, .word-pdf-page b { font-weight: bold; }
  .word-pdf-page em, .word-pdf-page i { font-style: italic; }
`;

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

const waitForFonts = () => document.fonts?.ready ?? Promise.resolve();

const pageShellStyle = () =>
  [
    `width:${PAGE_WIDTH_PX}px`,
    `min-height:${PAGE_HEIGHT_PX}px`,
    `padding:${PAGE_PADDING.top}px ${PAGE_PADDING.right}px ${PAGE_PADDING.bottom}px ${PAGE_PADDING.left}px`,
    "background:#fff",
    "box-sizing:border-box",
    "overflow:visible",
  ].join(";");

const createPageShell = () => {
  const page = document.createElement("div");
  page.className = "word-pdf-page";
  page.style.cssText = pageShellStyle();
  return page;
};

const cloneBlock = (node) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) return null;
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  return node.cloneNode(true);
};

const flattenBlockNodes = (root) => {
  const blocks = [];
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const block = cloneBlock(node);
      if (block) blocks.push(block);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName;
    if (tag === "TABLE" || tag === "UL" || tag === "OL" || tag === "IMG" || tag === "HR") {
      const block = cloneBlock(node);
      if (block) blocks.push(block);
      return;
    }
    if (["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "FIGURE"].includes(tag)) {
      const block = cloneBlock(node);
      if (block) blocks.push(block);
      return;
    }
    if (tag === "DIV") {
      const elementChildren = [...node.childNodes].filter(
        (child) =>
          child.nodeType === Node.ELEMENT_NODE ||
          (child.nodeType === Node.TEXT_NODE && child.textContent.trim()),
      );
      if (!elementChildren.length) return;
      const onlyBlocks = elementChildren.every(
        (child) =>
          child.nodeType === Node.ELEMENT_NODE &&
          BLOCK_TAGS.has(child.tagName) &&
          child.tagName !== "DIV",
      );
      if (onlyBlocks) {
        elementChildren.forEach(walk);
        return;
      }
      const block = cloneBlock(node);
      if (block) blocks.push(block);
      return;
    }
    [...node.childNodes].forEach(walk);
  };

  [...root.childNodes].forEach(walk);
  return blocks;
};

const pageOverflows = (page) => page.scrollHeight > PAGE_HEIGHT_PX + 4;

const buildPages = (blocks) => {
  const staging = document.createElement("div");
  staging.style.cssText =
    "position:absolute;left:0;top:0;width:794px;visibility:hidden;pointer-events:none;";
  document.body.appendChild(staging);

  const pages = [];
  let currentPage = createPageShell();
  staging.appendChild(currentPage);

  const pushPage = () => {
    if (currentPage.childNodes.length) pages.push(currentPage);
    currentPage.remove();
    currentPage = createPageShell();
    staging.appendChild(currentPage);
  };

  for (const block of blocks) {
    currentPage.appendChild(block);
    if (pageOverflows(currentPage)) {
      const overflow = currentPage.lastChild;
      if (overflow && currentPage.childNodes.length > 1) {
        overflow.remove();
        pushPage();
        currentPage.appendChild(overflow);
        if (pageOverflows(currentPage) && currentPage.childNodes.length === 1) {
          pushPage();
        }
      } else {
        pushPage();
      }
    }
  }

  currentPage.remove();
  if (currentPage.childNodes.length) pages.push(currentPage);
  staging.remove();
  return pages.length ? pages : [createPageShell()];
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

const capturePageCanvas = async (page, styleEl) => {
  const mount = document.createElement("div");
  mount.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    `width:${PAGE_WIDTH_PX}px`,
    "background:#fff",
    "z-index:2147483647",
  ].join(";");
  if (styleEl) mount.appendChild(styleEl.cloneNode(true));
  mount.appendChild(page);
  document.body.appendChild(mount);

  try {
    await waitForLayout();
    await waitForImages(page);
    return await html2canvas(page, {
      scale: CAPTURE_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 20000,
      width: PAGE_WIDTH_PX,
      height: Math.max(page.scrollHeight, PAGE_HEIGHT_PX),
      windowWidth: PAGE_WIDTH_PX,
      windowHeight: Math.max(page.scrollHeight, PAGE_HEIGHT_PX),
      scrollX: 0,
      scrollY: 0,
      onclone: (_doc, element) => {
        element.style.opacity = "1";
        element.style.visibility = "visible";
        element.style.color = "#111";
        element.style.background = "#fff";
      },
    });
  } finally {
    mount.remove();
  }
};

const addCanvasToPdf = (pdf, canvas, isFirstPage) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight + 1) {
    if (!isFirstPage) pdf.addPage();
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
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
      sliceCanvas.toDataURL("image/jpeg", 0.92),
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

const convertDocx = async (bytes) => {
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
  const [htmlResult, textResult] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer: bytes.slice(0) }, options),
    mammoth.extractRawText({ arrayBuffer: bytes.slice(0) }),
  ]);
  return { htmlResult, textResult };
};

export async function convertDocxToPdf(file, { onProgress } = {}) {
  const report = (payload) => onProgress?.(payload);

  report({ label: "Reading Word document…", phase: "prepare" });
  await yieldToMain();

  const bytes = await file.arrayBuffer();
  const { htmlResult, textResult } = await convertDocx(bytes);
  const plainText = (textResult.value || "").trim();
  const htmlText = (htmlResult.value || "").replace(/<[^>]+>/g, "").trim();

  if (!plainText && !htmlText) {
    throw new Error(
      "This Word file has no readable content. Try saving it as .docx and upload again.",
    );
  }

  report({ label: "Preparing layout…", phase: "layout" });
  await yieldToMain();

  const parser = document.createElement("div");
  parser.innerHTML = htmlResult.value || `<p>${plainText}</p>`;
  const blocks = flattenBlockNodes(parser);
  if (!blocks.length && plainText) {
    const p = document.createElement("p");
    p.textContent = plainText;
    blocks.push(p);
  }

  const styleEl = document.createElement("style");
  styleEl.textContent = CAPTURE_STYLES;
  const pages = buildPages(blocks);
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  let capturedPages = 0;
  const totalPages = pages.length;

  for (let index = 0; index < totalPages; index++) {
    report({
      label: `Rendering page ${index + 1} of ${totalPages}`,
      phase: "render",
      current: index + 1,
      total: totalPages,
    });
    await yieldToMain();

    const page = pages[index].cloneNode(true);
    const canvas = await capturePageCanvas(page, styleEl);
    await yieldToMain();

    if (!canvasHasInk(canvas)) continue;
    addCanvasToPdf(pdf, canvas, capturedPages === 0);
    capturedPages += 1;
    await yieldToMain();
  }

  if (capturedPages > 0) {
    report({ label: "Saving PDF…", phase: "save" });
    await yieldToMain();
    pdf.save(file.name.replace(/\.docx$/i, "") + ".pdf");
    return;
  }

  await renderPlainTextPdf(file, plainText || htmlText, report);
}
