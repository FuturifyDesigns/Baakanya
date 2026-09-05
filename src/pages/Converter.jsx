import {
  ArrowDown,
  ArrowUp,
  File,
  FilePlus2,
  GripVertical,
  Image,
  Loader2,
  Merge,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import ToolShell from "../components/ToolShell";
import { checkGenerationAccess, finalizeGeneration } from "../lib/generation";
import { registerFinalizedDraft } from "../lib/finalizedAccess";
import { useAccess } from "../lib/access";
import {
  beginProcessing,
  endProcessing,
  yieldToMain,
} from "../lib/processingLock";
import { useToast } from "../lib/toast";
import { convertDocxToPdf } from "../lib/wordToPdf";

const saveBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const readImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => resolve({ img, data: reader.result });
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const cloneBytes = async (file) => {
  const buffer = await file.arrayBuffer();
  return buffer.slice(0);
};

const defaultPrompt = (mode) =>
  mode === "merge"
    ? "Ready for another merge when you are."
    : "Ready for another conversion when you are.";

export default function Converter() {
  const toast = useToast();
  const access = useAccess();
  const [mode, setMode] = useState("images");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [graceDraftKey, setGraceDraftKey] = useState(null);
  const resetTimer = useRef(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const scheduleReset = () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setFiles([]);
      setInputKey((value) => value + 1);
      toast.info(defaultPrompt(mode));
    }, 5000);
  };

  const choose = (list) => {
    const selected = Array.from(list || []);
    const pattern =
      mode === "images"
        ? /\.(jpe?g|png)$/i
        : mode === "merge"
          ? /\.pdf$/i
          : /\.docx$/i;
    if (selected.length > 20) {
      setFiles([]);
      toast.error("Choose no more than 20 files at a time.");
      return;
    }
    if (selected.some((file) => !pattern.test(file.name))) {
      setFiles([]);
      toast.error("One or more files do not match the selected conversion type.");
      return;
    }
    if (selected.some((file) => file.size > 20 * 1024 * 1024)) {
      setFiles([]);
      toast.error("Each file must be smaller than 20 MB.");
      return;
    }
    setFiles(selected);
  };

  const changeMode = (next) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setMode(next);
    setFiles([]);
    setInputKey((value) => value + 1);
    setDragIndex(null);
  };

  const reorder = (from, to) =>
    setFiles((current) => {
      if (from === to || from < 0 || to < 0 || to >= current.length)
        return current;
      const next = [...current];
      const [selected] = next.splice(from, 1);
      next.splice(to, 0, selected);
      return next;
    });
  const move = (index, direction) => reorder(index, index + direction);

  const convert = async () => {
    if (!files.length) {
      toast.error("Choose at least one file first.");
      return;
    }
    if (mode === "merge" && files.length < 2) {
      toast.error("Choose at least two PDF files to merge.");
      return;
    }
    setBusy(true);
    setProgress({
      label: "Starting…",
      phase: "prepare",
      current: 0,
      total: 0,
    });
    beginProcessing();
    const queue = [...files];
    const toolName = `converter_${mode}`;
    const draftKey = crypto.randomUUID();
    let conversionResult = null;
    try {
      await checkGenerationAccess(toolName);
      if (mode === "images") {
        const pdf = new jsPDF();
        for (let i = 0; i < queue.length; i++) {
          setProgress({
            label: `Adding image ${i + 1} of ${queue.length}`,
            phase: "render",
            current: i + 1,
            total: queue.length,
          });
          await yieldToMain();
          const { img, data } = await readImage(queue[i]);
          if (i) pdf.addPage();
          const ratio = Math.min(180 / img.width, 260 / img.height),
            w = img.width * ratio,
            h = img.height * ratio;
          pdf.addImage(
            data,
            queue[i].type.includes("png") ? "PNG" : "JPEG",
            (210 - w) / 2,
            (297 - h) / 2,
            w,
            h,
          );
          await yieldToMain();
        }
        setProgress({ label: "Saving PDF…", phase: "save" });
        await yieldToMain();
        pdf.save(`baakanya-images-${Date.now()}.pdf`);
      }
      if (mode === "merge") {
        const merged = await PDFDocument.create();
        for (let i = 0; i < queue.length; i++) {
          setProgress({
            label: `Merging file ${i + 1} of ${queue.length}`,
            phase: "render",
            current: i + 1,
            total: queue.length,
          });
          await yieldToMain();
          const bytes = await cloneBytes(queue[i]);
          const source = await PDFDocument.load(bytes, {
            ignoreEncryption: true,
          });
          const indices = source.getPageIndices();
          const pages = await merged.copyPages(source, indices);
          pages.forEach((page) => merged.addPage(page));
          await yieldToMain();
        }
        setProgress({ label: "Saving merged PDF…", phase: "save" });
        await yieldToMain();
        const output = await merged.save();
        saveBlob(
          new Blob([output], { type: "application/pdf" }),
          `baakanya-merged-${Date.now()}.pdf`,
        );
      }
      if (mode === "word") {
        conversionResult = await convertDocxToPdf(queue[0], {
          onProgress: setProgress,
          draftKey,
        });
      }

      const result =
        conversionResult?.accessResult ||
        (await finalizeGeneration(toolName, draftKey));
      registerFinalizedDraft(draftKey);
      setGraceDraftKey(draftKey);
      access.refresh?.();

      if (result?.accessType === "credits" && result?.charged) {
        const creditsLeft =
          typeof result.remainingCredits === "number"
            ? result.remainingCredits
            : null;
        if (creditsLeft === 0) {
          toast.success(
            "Done — your PDF downloaded. That was your last credit. Renew access to convert more files.",
          );
        } else {
          toast.success(
            `Done — your PDF downloaded.${creditsLeft !== null ? ` ${creditsLeft} credit${creditsLeft === 1 ? "" : "s"} left.` : ""}`,
          );
        }
      } else {
        toast.success("Done — your PDF has been downloaded.");
      }
      setFiles([]);
      setInputKey((value) => value + 1);
      scheduleReset();
    } catch (error) {
      toast.error(`We couldn't process that file: ${error.message}`);
    } finally {
      setProgress(null);
      endProcessing();
      setBusy(false);
    }
  };

  const progressPercent =
    progress?.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : null;

  const processingOverlay =
    busy &&
    createPortal(
      <div className="processing-overlay" role="status" aria-live="polite">
        <div className="processing-card">
          <Loader2 className="spin" size={28} aria-hidden="true" />
          <b>{progress?.label || "Processing your files…"}</b>
          <small>This may take a moment for larger files.</small>
          {progressPercent != null && (
            <div className="processing-bar" aria-hidden="true">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>
      </div>,
      document.body,
    );

  const accepts =
    mode === "images" ? ".jpg,.jpeg,.png" : mode === "merge" ? ".pdf" : ".docx";
  return (
    <>
      {processingOverlay}
      <ToolShell
      eyebrow="FILE CONVERTER"
      title="Convert and combine files."
      description="Make one clean PDF from Word documents, images or several existing PDFs."
      sessionGraceDraftKey={graceDraftKey}
      privacyNote={
        mode === "word"
          ? "Word formatting is preserved as closely as possible."
          : "Files are processed on your device"
      }
    >
      <div className="tool-panel">
        {graceDraftKey && !access.allowed && (
          <div className="renewal-banner" role="status">
            Your last credit was used for the download above. Renew access to
            convert more files.
          </div>
        )}
        <div className="tabs">
          <button
            className={mode === "images" ? "active" : ""}
            onClick={() => changeMode("images")}
          >
            <Image />
            Images to PDF
          </button>
          <button
            className={mode === "merge" ? "active" : ""}
            onClick={() => changeMode("merge")}
          >
            <Merge />
            Merge PDFs
          </button>
          <button
            className={mode === "word" ? "active" : ""}
            onClick={() => changeMode("word")}
          >
            <File />
            Word to PDF
          </button>
        </div>
        <label className="drop-zone">
          <input
            key={inputKey}
            type="file"
            accept={accepts}
            multiple={mode !== "word"}
            onChange={(e) => choose(e.target.files)}
          />
          <UploadCloud />
          <h3>Drop files here or click to browse</h3>
          <p>
            {mode === "images"
              ? "JPG or PNG · select more than one"
              : mode === "merge"
                ? "PDF files · arrange them before merging"
                : "DOCX · keeps the document content and formatting as closely as possible"}
          </p>
        </label>
        {files.length > 0 && (
          <div className={`file-list ${mode === "merge" ? "merge-queue" : ""}`}>
            <div className="file-list-head">
              <div>
                <b>
                  {mode === "merge"
                    ? "PDF MERGE ORDER"
                    : `${files.length} file${files.length > 1 ? "s" : ""} ready`}
                </b>
                {mode === "merge" && (
                  <small>
                    Files merge from top to bottom. Drag them or use the arrow
                    buttons to set the final order.
                  </small>
                )}
              </div>
              <button
                onClick={() => {
                  setFiles([]);
                  setInputKey((value) => value + 1);
                }}
              >
                Clear all
              </button>
            </div>
            {files.map((file, i) => (
              <div
                className={`file-row ${dragIndex === i ? "dragging" : ""}`}
                key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
                draggable={mode === "merge"}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) reorder(dragIndex, i);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                {mode === "merge" && <span className="file-order">{i + 1}</span>}
                <GripVertical aria-hidden="true" />
                <FilePlus2 />
                <span>
                  <b>{file.name}</b>
                  <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </span>
                {files.length > 1 && (
                  <>
                    <button
                      aria-label={`Move ${file.name} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp />
                    </button>
                    <button
                      aria-label={`Move ${file.name} down`}
                      disabled={i === files.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown />
                    </button>
                  </>
                )}
                <button
                  aria-label="Remove"
                  onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="tool-actions">
          <button
            className={`btn btn-blue${busy ? " is-loading" : ""}`}
            disabled={
              !files.length || (mode === "merge" && files.length < 2) || busy
            }
            onClick={convert}
          >
            {busy
              ? "Processing…"
              : mode === "merge"
                ? "Merge & download PDF"
                : "Convert & download PDF"}
          </button>
        </div>
      </div>
    </ToolShell>
    </>
  );
}
