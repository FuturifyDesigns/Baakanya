import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { renderAsync } from "docx-preview";
import { supabase } from "./supabase";
import { yieldToMain } from "./processingLock";

const CAPTURE_SCALE = 2;
const PX_TO_PT = 72 / 96;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const PREVIEW_CHROME_FIX = `
  .docx-wrapper > section.docx {
    box-shadow: none !important;
    margin: 0 !important;
  }
  .docx-wrapper {
    background: #fff !important;
    padding: 0 !important;
    gap: 0 !important;
  }
`;

const savePdfBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

const base64ToBlob = (base64, type = "application/pdf") => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
};

const waitForLayout = (frames = 2) =>
  new Promise((resolve) => {
    const step = (left) => {
      if (left <= 0) resolve();
      else requestAnimationFrame(() => step(left - 1));
    };
    step(frames);
  });

const waitForFonts = async (doc = document) => {
  if (doc.fonts?.ready) await doc.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 350));
};

const waitForAssets = async (root) => {
  const images = [...root.querySelectorAll("img")];
  await Promise.all(
    images.map(
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
  await Promise.all(
    images.map(async (img) => {
      try {
        await img.decode();
      } catch {
        /* ignore */
      }
    }),
  );
};

const createHiddenFrame = () => {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.title = "";
  iframe.style.cssText = [
    "position:fixed",
    "left:-20000px",
    "top:0",
    "width:1400px",
    "height:20000px",
    "border:0",
    "margin:0",
    "padding:0",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#fff;"></body></html>',
  );
  doc.close();

  return {
    iframe,
    doc,
    body: doc.body,
    cleanup: () => iframe.remove(),
  };
};

const canvasHasInk = (canvas) => {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) return false;
  const sampleHeight = Math.min(canvas.height, 320);
  const data = ctx.getImageData(0, 0, canvas.width, sampleHeight).data;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a > 8 && (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245)) {
      return true;
    }
  }
  return false;
};

const measurePage = (element) => {
  const rect = element.getBoundingClientRect();
  const widthPx = Math.ceil(
    Math.max(rect.width, element.scrollWidth, element.offsetWidth, 1),
  );
  const heightPx = Math.ceil(
    Math.max(rect.height, element.scrollHeight, element.offsetHeight, 1),
  );
  return {
    widthPt: widthPx * PX_TO_PT,
    heightPt: heightPx * PX_TO_PT,
  };
};

const captureElementCanvas = async (element, win) => {
  await waitForLayout(3);
  await waitForAssets(element);

  const widthPx = Math.ceil(
    Math.max(element.scrollWidth, element.offsetWidth, 1),
  );
  const heightPx = Math.ceil(
    Math.max(element.scrollHeight, element.offsetHeight, 1),
  );

  return html2canvas(element, {
    scale: CAPTURE_SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 30000,
    width: widthPx,
    height: heightPx,
    windowWidth: widthPx,
    windowHeight: heightPx,
    scrollX: 0,
    scrollY: 0,
    ...(win ? { window: win } : {}),
  });
};

const addPageImage = (pdf, canvas, widthPt, heightPt, isFirstPage) => {
  if (!isFirstPage) pdf.addPage([widthPt, heightPt]);
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    0,
    0,
    widthPt,
    heightPt,
    undefined,
    "FAST",
  );
};

const collectDocxPreviewPages = (bodyContainer) => {
  const sections = [...bodyContainer.querySelectorAll("section.docx")];
  if (sections.length) return sections;
  const wrapper = bodyContainer.querySelector(".docx-wrapper");
  if (wrapper) return [wrapper];
  return bodyContainer.childElementCount ? [bodyContainer] : [];
};

const convertViaServer = async (file, onProgress) => {
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const storagePath = `${user.id}/${crypto.randomUUID()}.docx`;
  let pdfStoragePath = null;

  onProgress?.({ label: "Uploading Word document…", phase: "prepare" });
  await yieldToMain();

  const upload = await supabase.storage
    .from("converter-temp")
    .upload(storagePath, file, {
      contentType: DOCX_MIME,
      upsert: false,
    });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  try {
    onProgress?.({
      label: "Converting with professional layout engine…",
      phase: "layout",
    });
    await yieldToMain();

    const { data, error } = await supabase.functions.invoke("word-to-pdf", {
      body: { storagePath, fileName: file.name },
    });

    if (data?.fallback) return null;
    if (data?.error) throw new Error(data.error);

    if (error) {
      const status = error.context?.status ?? error.status;
      if (status === 413 || status === 502 || status === 504) return null;
      throw new Error(error.message || "Server conversion failed.");
    }

    pdfStoragePath = data?.pdfStoragePath || null;
    const outputName =
      data?.fileName || file.name.replace(/\.docx$/i, "") + ".pdf";

    onProgress?.({ label: "Saving PDF…", phase: "save" });
    await yieldToMain();

    if (data?.signedUrl) {
      const pdfResponse = await fetch(data.signedUrl);
      if (!pdfResponse.ok) {
        throw new Error("Could not download the converted PDF.");
      }
      savePdfBlob(await pdfResponse.blob(), outputName);
    } else if (data?.pdfBase64) {
      savePdfBlob(base64ToBlob(data.pdfBase64), outputName);
    } else {
      throw new Error("Conversion completed but no PDF was returned.");
    }

    return { engine: "ilovepdf", remainingCredits: data.remainingCredits ?? null };
  } finally {
    const paths = [storagePath];
    if (pdfStoragePath) paths.push(pdfStoragePath);
    await supabase.storage.from("converter-temp").remove(paths);
  }
};

const convertViaBrowser = async (file, onProgress) => {
  const bytes = await file.arrayBuffer();
  const { doc, body, cleanup, iframe } = createHiddenFrame();

  try {
    const styleContainer = doc.createElement("div");
    const bodyContainer = doc.createElement("div");
    const chromeFix = doc.createElement("style");
    chromeFix.textContent = PREVIEW_CHROME_FIX;

    doc.head.appendChild(chromeFix);
    body.appendChild(styleContainer);
    body.appendChild(bodyContainer);

    onProgress?.({ label: "Rendering Word layout…", phase: "layout" });
    await yieldToMain();

    await renderAsync(bytes, bodyContainer, styleContainer, {
      className: "docx",
      inWrapper: true,
      breakPages: true,
      ignoreFonts: false,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreLastRenderedPageBreak: false,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      renderAltChunks: true,
    });

    await waitForFonts(doc);
    await waitForLayout(4);
    await waitForAssets(bodyContainer);
    await yieldToMain();

    const pages = collectDocxPreviewPages(bodyContainer);
    if (!pages.length) return false;

    let pdf = null;
    let capturedPages = 0;

    for (let index = 0; index < pages.length; index++) {
      onProgress?.({
        label: `Rendering page ${index + 1} of ${pages.length}`,
        phase: "render",
        current: index + 1,
        total: pages.length,
      });
      await yieldToMain();

      const section = pages[index];
      const { widthPt, heightPt } = measurePage(section);
      const canvas = await captureElementCanvas(section, iframe.contentWindow);
      await yieldToMain();

      if (!canvasHasInk(canvas)) continue;

      if (!pdf) {
        pdf = new jsPDF({
          unit: "pt",
          format: [widthPt, heightPt],
          compress: true,
        });
      }

      addPageImage(pdf, canvas, widthPt, heightPt, capturedPages === 0);
      capturedPages += 1;
      await yieldToMain();
    }

    if (!pdf) return false;

    onProgress?.({ label: "Saving PDF…", phase: "save" });
    await yieldToMain();
    pdf.save(file.name.replace(/\.docx$/i, "") + ".pdf");
    return true;
  } finally {
    cleanup();
  }
};

const logBrowserConversion = async (file) => {
  if (!supabase) return;
  try {
    await supabase.functions.invoke("word-to-pdf", {
      body: {
        mode: "log_browser",
        fileName: file.name,
        fileSizeBytes: file.size,
      },
    });
  } catch {
    /* logging should not block conversion */
  }
};

export async function convertDocxToPdf(file, { onProgress } = {}) {
  const report = (payload) => onProgress?.(payload);

  report({ label: "Reading Word document…", phase: "prepare" });
  await yieldToMain();

  try {
    const serverResult = await convertViaServer(file, report);
    if (serverResult) return;
  } catch (error) {
    console.error("Server Word to PDF failed:", error);
    report({ label: "Trying on-device conversion…", phase: "layout" });
    await yieldToMain();
  }

  report({ label: "Using on-device preview conversion…", phase: "layout" });
  await yieldToMain();

  const convertedInBrowser = await convertViaBrowser(file, report);
  if (!convertedInBrowser) {
    throw new Error(
      "Could not convert this Word file while keeping its formatting. Save it as .docx in Word and try again.",
    );
  }

  await logBrowserConversion(file);
}
