import { Download, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ToolShell from "../components/ToolShell";
import TemplatePicker from "../components/TemplatePicker";
import MediaAdjuster from "../components/MediaAdjuster";
import DocumentStudio from "../components/DocumentStudio";
import { defaultCustomization } from "../lib/customization";
import { authorizeGeneration } from "../lib/generation";
import { invoiceTemplates, quotationTemplates } from "../lib/documentTemplates";
import { cropImage } from "../lib/media";
import { renderBusinessPdf } from "../lib/pdfTemplates";
import { exportBusinessWord } from "../lib/wordExport";
const money = (n) =>
  Number(n || 0).toLocaleString("en-BW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export default function Invoice() {
  const [kind, setKind] = useState("Invoice");
  const [vat, setVat] = useState(false);
  const [form, setForm] = useState({
    business: "",
    client: "",
    number: `INV-${new Date().getFullYear()}-001`,
    date: new Date().toISOString().slice(0, 10),
    notes: "Thank you for your business.",
  });
  const [items, setItems] = useState([{ description: "", qty: 1, price: "" }]);
  const [validation, setValidation] = useState("");
  const [invoiceTemplateId, setInvoiceTemplateId] = useState(
    invoiceTemplates[0].id,
  );
  const [quotationTemplateId, setQuotationTemplateId] = useState(
    quotationTemplates[0].id,
  );
  const [logo, setLogo] = useState(null);
  const [logoCrop, setLogoCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const [customization, setCustomization] = useState(defaultCustomization);
  const [studioMessage, setStudioMessage] = useState("");
  const logoPreview = useMemo(() => logo ? URL.createObjectURL(logo) : "", [logo]);
  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);
  const templates = kind === "Invoice" ? invoiceTemplates : quotationTemplates;
  const templateId =
    kind === "Invoice" ? invoiceTemplateId : quotationTemplateId;
  const template = templates.find(({ id }) => id === templateId);
  const styledTemplate = {
    ...template,
    accent: customization.accent || template.accent,
    font: customization.font,
    density: customization.density,
  };
  const setTemplate =
    kind === "Invoice" ? setInvoiceTemplateId : setQuotationTemplateId;
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, x) => sum + Number(x.qty || 0) * Number(x.price || 0),
        0,
      ),
    [items],
  );
  const vatAmount = vat ? subtotal * 0.14 : 0,
    total = subtotal + vatAmount;
  const set = (key, value) => {
    setValidation("");
    setForm((x) => ({ ...x, [key]: value }));
  };
  const setItem = (i, key, value) =>
    setItems((x) =>
      x.map((item, j) => (j === i ? { ...item, [key]: value } : item)),
    );
  const changeKind = (next) => {
    setKind(next);
    setForm((current) => ({
      ...current,
      number: current.number.replace(
        /^(INV|QUO)/,
        next === "Invoice" ? "INV" : "QUO",
      ),
    }));
  };
  const download = async () => {
    if (form.business.trim().length < 2)
      return setValidation("Enter your business name.");
    if (form.client.trim().length < 2)
      return setValidation("Enter the client name.");
    if (!form.number.trim()) return setValidation(`Enter a ${kind} number.`);
    if (!form.date) return setValidation("Choose an issue date.");
    if (
      items.some(
        (item) =>
          !item.description.trim() ||
          Number(item.qty) <= 0 ||
          !Number.isFinite(Number(item.price)) ||
          Number(item.price) < 0,
      )
    )
      return setValidation(
        "Every item needs a description, quantity and valid price.",
      );
    setValidation("");
    try {
      await authorizeGeneration(kind.toLowerCase());
    } catch (error) {
      window.alert(error.message);
      return;
    }
    const logoData = logo ? await cropImage(logo, logoCrop, "square") : null;
    renderBusinessPdf({
      kind,
      form,
      items,
      vat,
      template: styledTemplate,
      logoData,
    });
  };
  const validateDocument = () => {
    if (form.business.trim().length < 2) return "Enter your business name.";
    if (form.client.trim().length < 2) return "Enter the client name.";
    if (!form.number.trim()) return `Enter a ${kind} number.`;
    if (!form.date) return "Choose an issue date.";
    if (
      items.some(
        (item) =>
          !item.description.trim() ||
          Number(item.qty) <= 0 ||
          !Number.isFinite(Number(item.price)) ||
          Number(item.price) < 0,
      )
    )
      return "Every item needs a description, quantity and valid price.";
    return "";
  };
  const saveDraft = () => {
    localStorage.setItem(
      "baakanya-business-draft",
      JSON.stringify({
        kind,
        vat,
        form,
        items,
        invoiceTemplateId,
        quotationTemplateId,
        logoCrop,
        customization,
      }),
    );
    setStudioMessage(
      `Draft saved on this device.${logo ? " For privacy, select your logo again when you return." : ""}`,
    );
  };
  const loadDraft = () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("baakanya-business-draft") || "null",
      );
      if (!saved) return setStudioMessage("No saved business draft was found.");
      if (["Invoice", "Quotation"].includes(saved.kind)) setKind(saved.kind);
      setVat(Boolean(saved.vat));
      if (saved.form) setForm((current) => ({ ...current, ...saved.form }));
      if (Array.isArray(saved.items) && saved.items.length)
        setItems(saved.items);
      if (invoiceTemplates.some(({ id }) => id === saved.invoiceTemplateId))
        setInvoiceTemplateId(saved.invoiceTemplateId);
      if (quotationTemplates.some(({ id }) => id === saved.quotationTemplateId))
        setQuotationTemplateId(saved.quotationTemplateId);
      if (saved.logoCrop) setLogoCrop(saved.logoCrop);
      if (saved.customization)
        setCustomization({ ...defaultCustomization, ...saved.customization });
      setStudioMessage(
        "Saved business draft loaded. You can continue editing.",
      );
    } catch {
      setStudioMessage("The saved draft could not be opened.");
    }
  };
  const downloadWord = async () => {
    const invalid = validateDocument();
    if (invalid) return setValidation(invalid);
    try {
      await authorizeGeneration(`${kind.toLowerCase()}_word`);
      exportBusinessWord({
        kind,
        form,
        items,
        vat,
        template: styledTemplate,
        customization,
      });
    } catch (error) {
      setValidation(error.message);
    }
  };
  return (
    <ToolShell
      eyebrow="BUSINESS DOCUMENTS"
      title="Invoice without the admin."
      description="Add the details, let Baakanya calculate the totals, and download a client-ready PDF."
    >
      <nav className="document-workflow" aria-label="Business document being edited">
        <button className={kind === "Invoice" ? "active" : ""} onClick={() => changeKind("Invoice")}>
          <span>01</span><div><b>Invoice</b><small>{invoiceTemplates.find(({ id }) => id === invoiceTemplateId)?.name}</small></div><em>{kind === "Invoice" ? "Editing now" : "Open invoice"}</em>
        </button>
        <button className={kind === "Quotation" ? "active" : ""} onClick={() => changeKind("Quotation")}>
          <span>02</span><div><b>Quotation</b><small>{quotationTemplates.find(({ id }) => id === quotationTemplateId)?.name}</small></div><em>{kind === "Quotation" ? "Editing now" : "Open quotation"}</em>
        </button>
      </nav>
      <div className="editing-context">
        <div><span className="kicker">CURRENT DOCUMENT</span><h2>You’re editing an {kind.toLowerCase()}.</h2></div>
        <p>Client and line-item details carry across when you switch document type.</p>
      </div>
      <TemplatePicker
        label={`${kind} template`}
        templates={templates}
        value={templateId}
        onChange={setTemplate}
      />
      <MediaAdjuster
        label="Business logo"
        file={logo}
        onFile={setLogo}
        crop={logoCrop}
        onCrop={setLogoCrop}
        shape="square"
      />
      <div className="builder-grid">
        <div className="form-card">
          <div className="field-grid">
            <label>
              Business name
              <input
                required
                minLength="2"
                maxLength="120"
                value={form.business}
                onChange={(e) => set("business", e.target.value)}
                placeholder="e.g. Kgetsi Creative"
              />
            </label>
            <label>
              Client name
              <input
                required
                minLength="2"
                maxLength="120"
                value={form.client}
                onChange={(e) => set("client", e.target.value)}
                placeholder="Client or company"
              />
            </label>
            <label>
              {kind} number
              <input
                required
                maxLength="60"
                value={form.number}
                onChange={(e) => set("number", e.target.value)}
              />
            </label>
            <label>
              Issue date
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
          </div>
          <div className="items">
            <div className="items-head">
              <b>Items or services</b>
              <button
                onClick={() =>
                  setItems((x) => [
                    ...x,
                    { description: "", qty: 1, price: "" },
                  ])
                }
              >
                <Plus />
                Add item
              </button>
            </div>
            {items.map((item, i) => (
              <div className="item-fields" key={i}>
                <input
                  required
                  maxLength="180"
                  aria-label="Description"
                  value={item.description}
                  onChange={(e) => setItem(i, "description", e.target.value)}
                  placeholder="Description"
                />
                <input
                  aria-label="Quantity"
                  type="number"
                  min="1"
                  max="9999"
                  step="1"
                  required
                  value={item.qty}
                  onChange={(e) => setItem(i, "qty", e.target.value)}
                />
                <div className="money-input">
                  <span>P</span>
                  <input
                    aria-label="Price"
                    type="number"
                    min="0"
                    max="99999999"
                    step="0.01"
                    required
                    value={item.price}
                    onChange={(e) => setItem(i, "price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <button
                  aria-label="Delete item"
                  onClick={() => setItems((x) => x.filter((_, j) => j !== i))}
                  disabled={items.length === 1}
                >
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={vat}
              onChange={(e) => setVat(e.target.checked)}
            />
            <span>
              <b>Add Botswana VAT (14%)</b>
              <small>
                Only select this if your business is VAT registered.
              </small>
            </span>
          </label>
          <label>
            Footer note
            <textarea
              maxLength="300"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows="2"
            />
          </label>
          {validation && (
            <div className="form-message validation-error" role="alert">
              {validation}
            </div>
          )}
        </div>
        <aside className="summary-card business-live-preview">
          <div className="preview-label">LIVE {kind.toUpperCase()} PREVIEW</div>
          <div className="business-preview-head">
            <div>{logoPreview ? <img src={logoPreview} alt="Business logo preview" /> : <span>{(form.business || "B").slice(0, 2).toUpperCase()}</span>}<b>{form.business || "Your business"}</b></div>
            <h3>{kind.toUpperCase()}</h3>
          </div>
          <div className="business-preview-meta"><span>Bill to<b>{form.client || "Client name"}</b></span><span>No.<b>{form.number}</b></span><span>Date<b>{form.date}</b></span></div>
          <div className="business-preview-items">
            <div><b>Description</b><b>Qty</b><b>Amount</b></div>
            {items.slice(0, 5).map((item, index) => <div key={index}><span>{item.description || "Item or service"}</span><span>{item.qty || 0}</span><span>P {money(Number(item.qty || 0) * Number(item.price || 0))}</span></div>)}
          </div>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>P {money(subtotal)}</dd>
            </div>
            {vat && (
              <div>
                <dt>VAT</dt>
                <dd>P {money(vatAmount)}</dd>
              </div>
            )}
            <div className="grand">
              <dt>Total</dt>
              <dd>P {money(total)}</dd>
            </div>
          </dl>
          <button className="btn btn-blue" onClick={download}>
            <Download />
            Download PDF
          </button>
          <p>The preview updates as you type. Your PDF is generated on this device.</p>
        </aside>
      </div>
      <DocumentStudio
        customization={customization}
        onChange={setCustomization}
        onSave={saveDraft}
        onLoad={loadDraft}
        message={studioMessage}
        wordActions={[
          {
            label: `Download editable ${kind} for Word`,
            onClick: downloadWord,
          },
        ]}
      />
    </ToolShell>
  );
}
