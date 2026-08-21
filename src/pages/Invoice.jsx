import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ToolShell from "../components/ToolShell";
import TemplatePicker from "../components/TemplatePicker";
import MediaAdjuster from "../components/MediaAdjuster";
import GenerateDocIcon from "../components/GenerateDocIcon";
import { BusinessDocumentPreview } from "../components/DocumentPreview";
import { defaultCustomization, defaultsForKind } from "../lib/customization";
import {
  BUSINESS_DRAFT_KEY,
  readLocalDraft,
  useAutoSave,
} from "../lib/draftStore";
import { saveEditorDocument } from "../lib/documentEditorStore";
import { checkGenerationAccess } from "../lib/generation";
import { invoiceTemplates, quotationTemplates } from "../lib/documentTemplates";
import { cropImage } from "../lib/media";

const money = (n) =>
  Number(n || 0).toLocaleString("en-BW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const emptyInvoice = {
  business: "",
  businessAddress: "",
  businessEmail: "",
  businessPhone: "",
  taxId: "",
  client: "",
  clientAddress: "",
  clientEmail: "",
  number: `INV-${new Date().getFullYear()}-001`,
  date: new Date().toISOString().slice(0, 10),
  dueDate: "",
  paymentTerms: "Payment due within 14 days",
  notes: "Thank you for your business.",
};

const emptyQuotation = {
  business: "",
  businessAddress: "",
  businessEmail: "",
  businessPhone: "",
  taxId: "",
  client: "",
  clientAddress: "",
  clientEmail: "",
  number: `QUO-${new Date().getFullYear()}-001`,
  date: new Date().toISOString().slice(0, 10),
  validUntil: "",
  paymentTerms: "Quote valid for 14 days",
  notes: "Thank you for the opportunity to quote.",
};

export default function Invoice() {
  const navigate = useNavigate();
  const [kind, setKind] = useState("Invoice");
  const [vat, setVat] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice);
  const [quotationForm, setQuotationForm] = useState(emptyQuotation);
  const [invoiceItems, setInvoiceItems] = useState([
    { description: "", qty: 1, price: "" },
  ]);
  const [quotationItems, setQuotationItems] = useState([
    { description: "", qty: 1, price: "" },
  ]);
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
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [quotationGenerated, setQuotationGenerated] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const form = kind === "Invoice" ? invoiceForm : quotationForm;
  const items = kind === "Invoice" ? invoiceItems : quotationItems;
  const logoPreview = useMemo(
    () => (logo ? URL.createObjectURL(logo) : ""),
    [logo],
  );
  useEffect(
    () => () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview],
  );

  useEffect(() => {
    const saved = readLocalDraft(BUSINESS_DRAFT_KEY);
    if (!saved) {
      setDraftReady(true);
      return;
    }
    try {
      if (["Invoice", "Quotation"].includes(saved.kind)) setKind(saved.kind);
      setVat(Boolean(saved.vat));
      if (saved.invoiceForm)
        setInvoiceForm((current) => ({ ...current, ...saved.invoiceForm }));
      if (saved.quotationForm)
        setQuotationForm((current) => ({ ...current, ...saved.quotationForm }));
      if (saved.form) {
        if (saved.kind === "Quotation")
          setQuotationForm((current) => ({ ...current, ...saved.form }));
        else setInvoiceForm((current) => ({ ...current, ...saved.form }));
      }
      if (Array.isArray(saved.invoiceItems) && saved.invoiceItems.length)
        setInvoiceItems(saved.invoiceItems);
      if (Array.isArray(saved.quotationItems) && saved.quotationItems.length)
        setQuotationItems(saved.quotationItems);
      if (Array.isArray(saved.items) && saved.items.length) {
        if (saved.kind === "Quotation") setQuotationItems(saved.items);
        else setInvoiceItems(saved.items);
      }
      if (invoiceTemplates.some(({ id }) => id === saved.invoiceTemplateId))
        setInvoiceTemplateId(saved.invoiceTemplateId);
      if (quotationTemplates.some(({ id }) => id === saved.quotationTemplateId))
        setQuotationTemplateId(saved.quotationTemplateId);
      if (saved.logoCrop) setLogoCrop(saved.logoCrop);
      if (saved.customization)
        setCustomization({ ...defaultCustomization, ...saved.customization });
      setInvoiceGenerated(Boolean(saved.invoiceGenerated));
      setQuotationGenerated(Boolean(saved.quotationGenerated));
      setStudioMessage(
        "Your previous draft was restored. Logos are not stored — select again if needed.",
      );
    } catch {
      setStudioMessage("A previous draft was found but could not be restored.");
    } finally {
      setDraftReady(true);
    }
  }, []);

  const businessDraftPayload = useMemo(
    () => ({
      kind,
      vat,
      invoiceForm,
      quotationForm,
      invoiceItems,
      quotationItems,
      invoiceTemplateId,
      quotationTemplateId,
      logoCrop,
      customization,
      invoiceGenerated,
      quotationGenerated,
    }),
    [
      kind,
      vat,
      invoiceForm,
      quotationForm,
      invoiceItems,
      quotationItems,
      invoiceTemplateId,
      quotationTemplateId,
      logoCrop,
      customization,
      invoiceGenerated,
      quotationGenerated,
    ],
  );

  const autosaveStatus = useAutoSave(BUSINESS_DRAFT_KEY, businessDraftPayload, {
    enabled: draftReady,
    delay: 700,
  });
  const templates = kind === "Invoice" ? invoiceTemplates : quotationTemplates;
  const templateId =
    kind === "Invoice" ? invoiceTemplateId : quotationTemplateId;
  const template = templates.find(({ id }) => id === templateId);
  const styledTemplate = {
    ...template,
    accent: customization.accent || template.accent,
    primary: customization.primary || template.primary,
    background: customization.background || template.background || "#ffffff",
    font: customization.font || template.font || "arial",
    density: customization.density || template.density || "comfortable",
    lineSpacing: customization.lineSpacing || template.lineSpacing || "1.15",
  };
  const setTemplate =
    kind === "Invoice" ? setInvoiceTemplateId : setQuotationTemplateId;
  const setFormState = kind === "Invoice" ? setInvoiceForm : setQuotationForm;
  const setItemsState =
    kind === "Invoice" ? setInvoiceItems : setQuotationItems;

  const set = (key, value) => {
    setValidation("");
    setFormState((x) => ({ ...x, [key]: value }));
  };
  const setItem = (i, key, value) =>
    setItemsState((x) =>
      x.map((item, j) => (j === i ? { ...item, [key]: value } : item)),
    );

  const validateDocument = () => {
    if (form.business.trim().length < 2) return "Enter your business name.";
    if (form.client.trim().length < 2) return "Enter the client name.";
    if (!form.number.trim()) return `Enter a ${kind} number.`;
    if (!form.date) return "Choose an issue date.";
    if (kind === "Invoice" && !form.dueDate) return "Choose a due date.";
    if (kind === "Quotation" && !form.validUntil)
      return "Choose a valid-until date.";
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

  const openEditor = async () => {
    const logoData = logo ? await cropImage(logo, logoCrop, "square") : null;
    saveEditorDocument({
      kind: kind === "Quotation" ? "quotation" : "invoice",
      draftKey: crypto.randomUUID(),
      toolName: kind.toLowerCase(),
      billed: false,
      templateId,
      form,
      items,
      vat,
      logoData,
      customization: {
        ...defaultCustomization,
        ...defaultsForKind(kind === "Quotation" ? "quotation" : "invoice"),
        ...customization,
        accent: customization.accent || "",
        primary: customization.primary || "",
        background: customization.background || "#ffffff",
        font:
          customization.font ||
          defaultsForKind(kind === "Quotation" ? "quotation" : "invoice").font,
        lineSpacing:
          customization.lineSpacing ||
          defaultsForKind(kind === "Quotation" ? "quotation" : "invoice")
            .lineSpacing,
        density:
          customization.density ||
          defaultsForKind(kind === "Quotation" ? "quotation" : "invoice")
            .density,
      },
      returnPath: "/tools/invoice",
    });
    navigate("/tools/editor");
  };

  const generate = async () => {
    const invalid = validateDocument();
    if (invalid) return setValidation(invalid);
    setValidation("");
    try {
      await checkGenerationAccess(kind.toLowerCase());
      if (kind === "Invoice") setInvoiceGenerated(true);
      else setQuotationGenerated(true);
      await openEditor();
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <ToolShell
      eyebrow="BUSINESS DOCUMENTS"
      title="Invoice without the admin."
      description="Fill the form, generate, then finish layout and wording in the document editor before you download."
    >
      <nav
        className="document-workflow"
        aria-label="Business document being edited"
      >
        <button
          className={kind === "Invoice" ? "active" : ""}
          onClick={() => setKind("Invoice")}
        >
          <span>01</span>
          <div>
            <b>Invoice</b>
            <small>
              {
                invoiceTemplates.find(({ id }) => id === invoiceTemplateId)
                  ?.name
              }
            </small>
          </div>
          <em>{kind === "Invoice" ? "Editing now" : "Open invoice"}</em>
        </button>
        <button
          className={kind === "Quotation" ? "active" : ""}
          onClick={() => setKind("Quotation")}
        >
          <span>02</span>
          <div>
            <b>Quotation</b>
            <small>
              {
                quotationTemplates.find(({ id }) => id === quotationTemplateId)
                  ?.name
              }
            </small>
          </div>
          <em>{kind === "Quotation" ? "Editing now" : "Open quotation"}</em>
        </button>
      </nav>
      <div className="editing-context">
        <div>
          <span className="kicker">CURRENT DOCUMENT</span>
          <h2>You’re editing an {kind.toLowerCase()}.</h2>
        </div>
        <p>
          Invoice and quotation forms stay separate so each keeps the right
          commercial fields.
        </p>
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
      <div className="tool-dual-pane">
        <aside className="summary-card live-document-preview business">
          <div className="preview-chrome">
            <div className="preview-label">
              LIVE {kind.toUpperCase()} PREVIEW · {template.name}
            </div>
          </div>
          <div className="preview-scroll">
            <div className="preview-fit">
              <BusinessDocumentPreview
                kind={kind}
                form={form}
                items={items}
                vat={vat}
                template={styledTemplate}
                logoUrl={logoPreview}
                money={money}
              />
            </div>
            <small>
              Same layout as your downloadable PDF — what you see is what you
              get.
            </small>
          </div>
        </aside>
        <div className="form-card tool-dual-form">
          <div className="tool-dual-form-scroll">
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
              Business email <span className="optional">Optional</span>
              <input
                type="email"
                maxLength="254"
                value={form.businessEmail}
                onChange={(e) => set("businessEmail", e.target.value)}
              />
            </label>
            <label>
              Business phone <span className="optional">Optional</span>
              <input
                maxLength="40"
                value={form.businessPhone}
                onChange={(e) => set("businessPhone", e.target.value)}
              />
            </label>
            <label>
              Tax / VAT number <span className="optional">Optional</span>
              <input
                maxLength="60"
                value={form.taxId}
                onChange={(e) => set("taxId", e.target.value)}
              />
            </label>
            <label>
              Business address <span className="optional">Optional</span>
              <input
                maxLength="200"
                value={form.businessAddress}
                onChange={(e) => set("businessAddress", e.target.value)}
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
              Client email <span className="optional">Optional</span>
              <input
                type="email"
                maxLength="254"
                value={form.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
              />
            </label>
            <label>
              Client address <span className="optional">Optional</span>
              <input
                maxLength="200"
                value={form.clientAddress}
                onChange={(e) => set("clientAddress", e.target.value)}
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
            {kind === "Invoice" ? (
              <label>
                Due date
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </label>
            ) : (
              <label>
                Valid until
                <input
                  required
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => set("validUntil", e.target.value)}
                />
              </label>
            )}
            <label>
              Payment / validity terms
              <input
                maxLength="160"
                value={form.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value)}
              />
            </label>
          </div>
          <div className="items">
            <div className="items-head">
              <b>Items or services</b>
              <button
                onClick={() =>
                  setItemsState((x) => [
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
                  onClick={() =>
                    setItemsState((x) => x.filter((_, j) => j !== i))
                  }
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
          <div className="form-downloads">
            <button className="btn btn-blue" onClick={generate}>
              <GenerateDocIcon />
              Generate {kind.toLowerCase()}
            </button>
          </div>
          <p className="generate-hint">
            Generate opens the editor without using a credit. You only pay when
            you confirm the final document before download. Your form autosaves
            on this device.
          </p>
          {studioMessage && (
            <div className="form-message" role="status">
              {studioMessage}
            </div>
          )}
          {autosaveStatus && (
            <p className="autosave-status" role="status">
              {autosaveStatus}
            </p>
          )}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
