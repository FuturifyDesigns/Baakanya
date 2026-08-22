import { useEffect, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import RequireAuth from "../components/RequireAuth";
import WorkspaceTabs from "../components/WorkspaceTabs";
import {
  downloadDraftPdf,
  downloadDraftWord,
  kindLabel,
} from "../lib/documentDownloads";
import {
  deleteDocumentHistory,
  draftFromHistoryRecord,
  listDocumentHistory,
  markDocumentHistoryDownloaded,
  updateDocumentHistoryTitle,
} from "../lib/documentHistory";
import { saveEditorDocument } from "../lib/documentEditorStore";

function formatWhen(value) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryBody() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await listDocumentHistory();
      setItems(rows);
    } catch (error) {
      setMessage(error.message || "Could not load your document history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openInEditor = (record) => {
    saveEditorDocument(draftFromHistoryRecord(record));
    navigate("/tools/editor?step=download");
  };

  const handleDownloadPdf = async (record) => {
    setBusyId(`${record.id}-pdf`);
    setMessage("");
    try {
      downloadDraftPdf(draftFromHistoryRecord(record));
      await markDocumentHistoryDownloaded(record.id);
      await refresh();
      setMessage(`PDF downloaded for ${record.title}.`);
    } catch (error) {
      setMessage(error.message || "Could not download PDF.");
    } finally {
      setBusyId("");
    }
  };

  const handleDownloadWord = async (record) => {
    setBusyId(`${record.id}-word`);
    setMessage("");
    try {
      downloadDraftWord(draftFromHistoryRecord(record));
      await markDocumentHistoryDownloaded(record.id);
      await refresh();
      setMessage(`Word file downloaded for ${record.title}.`);
    } catch (error) {
      setMessage(error.message || "Could not download Word file.");
    } finally {
      setBusyId("");
    }
  };

  const startRename = (record) => {
    setEditingId(record.id);
    setEditTitle(record.title);
    setMessage("");
  };

  const saveRename = async (record) => {
    setBusyId(`${record.id}-rename`);
    try {
      await updateDocumentHistoryTitle(record.id, editTitle);
      setEditingId("");
      setEditTitle("");
      await refresh();
      setMessage("Document name updated.");
    } catch (error) {
      setMessage(error.message || "Could not rename this document.");
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (record) => {
    const ok = window.confirm(
      `Delete "${record.title}" from your history? You can still create a new document from scratch.`,
    );
    if (!ok) return;
    setBusyId(`${record.id}-delete`);
    setMessage("");
    try {
      await deleteDocumentHistory(record.id);
      await refresh();
      setMessage("Document removed from history.");
    } catch (error) {
      setMessage(error.message || "Could not delete this document.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <Layout>
      <section className="workspace container">
        <div className="workspace-head">
          <div>
            <span className="kicker">YOUR WORKSPACE</span>
            <h1>Document history</h1>
            <p>
              Confirmed documents are saved here so you can download them again
              if you leave before saving a file.
            </p>
          </div>
        </div>

        <WorkspaceTabs />

        {loading ? (
          <p className="history-empty">Loading your finished documents…</p>
        ) : items.length === 0 ? (
          <div className="history-empty-card">
            <h2>No finished documents yet</h2>
            <p>
              When you confirm a CV, cover letter, invoice or quotation, it
              appears here — even if you navigate away before downloading.
            </p>
            <Link className="btn btn-blue" to="/workspace">
              Back to tools
            </Link>
          </div>
        ) : (
          <ul className="document-history-list">
            {items.map((record) => (
              <li key={record.id} className="document-history-item">
                <div className="document-history-main">
                  <div className="document-history-meta">
                    <span className="history-kind">{kindLabel(record.kind)}</span>
                    <span>{record.template_name}</span>
                    <span>{formatWhen(record.finalized_at)}</span>
                    {record.downloaded_at && (
                      <span className="history-downloaded">Downloaded</span>
                    )}
                  </div>
                  {editingId === record.id ? (
                    <form
                      className="history-rename-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveRename(record);
                      }}
                    >
                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        aria-label="Document name"
                      />
                      <button
                        type="submit"
                        className="btn btn-small btn-blue"
                        disabled={busyId === `${record.id}-rename`}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-outline"
                        onClick={() => {
                          setEditingId("");
                          setEditTitle("");
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <h2>{record.title}</h2>
                  )}
                </div>
                <div className="document-history-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-blue"
                    disabled={Boolean(busyId)}
                    onClick={() => handleDownloadPdf(record)}
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-ink"
                    disabled={Boolean(busyId)}
                    onClick={() => handleDownloadWord(record)}
                  >
                    <Download size={14} /> Word
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-outline"
                    disabled={Boolean(busyId)}
                    onClick={() => openInEditor(record)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-outline"
                    disabled={Boolean(busyId)}
                    onClick={() => startRename(record)}
                    aria-label={`Rename ${record.title}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-outline history-delete-btn"
                    disabled={Boolean(busyId)}
                    onClick={() => handleDelete(record)}
                    aria-label={`Delete ${record.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {message && (
          <div className="form-message" role="status">
            {message}
          </div>
        )}
      </section>
    </Layout>
  );
}

export default function DocumentHistory() {
  return (
    <RequireAuth title="Sign in to view your document history">
      <HistoryBody />
    </RequireAuth>
  );
}
