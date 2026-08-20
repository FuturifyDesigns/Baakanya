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
import { useState } from "react";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";
import ToolShell from "../components/ToolShell";
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
export default function Converter() {
  const [mode, setMode] = useState("images");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const choose = (list) => {
    setFiles(Array.from(list));
    setMessage("");
  };
  const move = (i, dir) =>
    setFiles((current) => {
      const next = [...current],
        j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const convert = async () => {
    if (!files.length) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "images") {
        const pdf = new jsPDF();
        for (let i = 0; i < files.length; i++) {
          const { img, data } = await readImage(files[i]);
          if (i) pdf.addPage();
          const ratio = Math.min(180 / img.width, 260 / img.height),
            w = img.width * ratio,
            h = img.height * ratio;
          pdf.addImage(
            data,
            files[i].type.includes("png") ? "PNG" : "JPEG",
            (210 - w) / 2,
            (297 - h) / 2,
            w,
            h,
          );
        }
        pdf.save("baakanya-images.pdf");
      }
      if (mode === "merge") {
        const merged = await PDFDocument.create();
        for (const file of files) {
          const source = await PDFDocument.load(await file.arrayBuffer());
          const pages = await merged.copyPages(source, source.getPageIndices());
          pages.forEach((p) => merged.addPage(p));
        }
        saveBlob(
          new Blob([await merged.save()], { type: "application/pdf" }),
          "baakanya-merged.pdf",
        );
      }
      if (mode === "word") {
        const result = await mammoth.extractRawText({
          arrayBuffer: await files[0].arrayBuffer(),
        });
        const pdf = new jsPDF();
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(result.value, 175);
        let y = 22;
        lines.forEach((line) => {
          if (y > 278) {
            pdf.addPage();
            y = 22;
          }
          pdf.text(line, 18, y);
          y += 6;
        });
        pdf.save(files[0].name.replace(/\.docx$/i, "") + ".pdf");
      }
      setMessage("Done — your PDF has been downloaded.");
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
            onClick={() => {
              setMode("images");
              setFiles([]);
            }}
          >
            <Image />
            Images to PDF
          </button>
          <button
            className={mode === "merge" ? "active" : ""}
            onClick={() => {
              setMode("merge");
              setFiles([]);
            }}
          >
            <Merge />
            Merge PDFs
          </button>
          <button
            className={mode === "word" ? "active" : ""}
            onClick={() => {
              setMode("word");
              setFiles([]);
            }}
          >
            <File />
            Word to PDF
          </button>
        </div>
        <label className="drop-zone">
          <input
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
                : "DOCX · text is preserved in a clean PDF layout"}
          </p>
        </label>
        {files.length > 0 && (
          <div className="file-list">
            <div className="file-list-head">
              <b>
                {files.length} file{files.length > 1 ? "s" : ""} ready
              </b>
              <button onClick={() => setFiles([])}>Clear all</button>
            </div>
            {files.map((file, i) => (
              <div className="file-row" key={`${file.name}-${i}`}>
                <GripVertical />
                <FilePlus2 />
                <span>
                  <b>{file.name}</b>
                  <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </span>
                {files.length > 1 && (
                  <>
                    <button aria-label="Move up" onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </button>
                    <button aria-label="Move down" onClick={() => move(i, 1)}>
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
            disabled={!files.length || busy}
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
