import {
  ArrowDown,
  ArrowUp,
  File,
  FilePlus2,
  GripVertical,
  Image,
  Merge,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";
import html2canvas from "html2canvas";
import ToolShell from "../components/ToolShell";
import { authorizeGeneration } from "../lib/generation";

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
  const [mode, setMode] = useState("images");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [inputKey, setInputKey] = useState(0);
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
      setMessage(defaultPrompt(mode));
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
      setMessage("Choose no more than 20 files at a time.");
      return;
    }
    if (selected.some((file) => !pattern.test(file.name))) {
      setFiles([]);
      setMessage(
        "One or more files do not match the selected conversion type.",
      );
      return;
    }
    if (selected.some((file) => file.size > 20 * 1024 * 1024)) {
      setFiles([]);
      setMessage("Each file must be smaller than 20 MB.");
      return;
    }
    // Always replace the queue so previous merge selections cannot leak.
    setFiles(selected);
    setMessage("");
  };

  const changeMode = (next) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setMode(next);
    setFiles([]);
    setInputKey((value) => value + 1);
    setMessage("");
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

  const convertWordExact = async (file) => {
    const bytes = await cloneBytes(file);
    const { value: html } = await mammoth.convertToHtml(
      { arrayBuffer: bytes },
      {
        includeDefaultStyleMap: true,
        convertImage: mammoth.images.imgElement((image) =>
          image.read("base64").then((imageBuffer) => ({
            src: `data:${image.contentType};base64,${imageBuffer}`,
          })),
        ),
      },
    );
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-10000px;top:0;width:794px;padding:48px;background:#fff;color:#111;font:16px/1.5 'Times New Roman',Times,serif;";
    host.innerHTML = html || "<p></p>";
    document.body.appendChild(host);
    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      await pdf.html(host, {
        margin: [36, 36, 36, 36],
        autoPaging: "text",
        width: 523,
        windowWidth: 794,
        html2canvas: {
          scale: 0.75,
          useCORS: true,
          backgroundColor: "#ffffff",
          // Ensure the dependency is retained in the production bundle.
          logging: false,
        },
      });
      // Touch import so bundlers keep html2canvas available to jsPDF.html.
      if (!html2canvas) throw new Error("PDF renderer unavailable");
      pdf.save(file.name.replace(/\.docx$/i, "") + ".pdf");
    } finally {
      host.remove();
    }
  };

  const convert = async () => {
    if (!files.length) {
      setMessage("Choose at least one file first.");
      return;
    }
    if (mode === "merge" && files.length < 2) {
      setMessage("Choose at least two PDF files to merge.");
      return;
    }
    setBusy(true);
    setMessage("");
    const queue = [...files];
    try {
      await authorizeGeneration(`converter_${mode}`);
      if (mode === "images") {
        const pdf = new jsPDF();
        for (let i = 0; i < queue.length; i++) {
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
        }
        pdf.save(`baakanya-images-${Date.now()}.pdf`);
      }
      if (mode === "merge") {
        const merged = await PDFDocument.create();
        for (const file of queue) {
          const bytes = await cloneBytes(file);
          const source = await PDFDocument.load(bytes, {
            ignoreEncryption: true,
          });
          const indices = source.getPageIndices();
          const pages = await merged.copyPages(source, indices);
          pages.forEach((page) => merged.addPage(page));
        }
        const output = await merged.save();
        saveBlob(
          new Blob([output], { type: "application/pdf" }),
          `baakanya-merged-${Date.now()}.pdf`,
        );
      }
      if (mode === "word") {
        await convertWordExact(queue[0]);
      }
      setMessage("Done — your PDF has been downloaded.");
      setFiles([]);
      setInputKey((value) => value + 1);
      scheduleReset();
    } catch (error) {
      setMessage(`We couldn't process that file: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const accepts =
    mode === "images" ? ".jpg,.jpeg,.png" : mode === "merge" ? ".pdf" : ".docx";
  return (
    <ToolShell
      eyebrow="FILE CONVERTER"
      title="Convert and combine files."
      description="Make one clean PDF from Word documents, images or several existing PDFs."
    >
      <div className="tool-panel">
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
          <p>{message}</p>
          <button
            className="btn btn-blue"
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
  );
}
