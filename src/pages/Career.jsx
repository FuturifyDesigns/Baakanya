import { Download, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import ToolShell from "../components/ToolShell";
import TemplatePicker from "../components/TemplatePicker";
import MediaAdjuster from "../components/MediaAdjuster";
import DocumentStudio from "../components/DocumentStudio";
import { defaultCustomization } from "../lib/customization";
import { supabase } from "../lib/supabase";
import { authorizeGeneration } from "../lib/generation";
import { coverLetterTemplates, cvTemplates } from "../lib/documentTemplates";
import { cropImage } from "../lib/media";
import { renderCoverLetterPdf, renderCvPdf } from "../lib/pdfTemplates";
import { exportCoverWord, exportCvWord } from "../lib/wordExport";
const split = (text) =>
  text
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
export default function Career() {
  const [activeDocument, setActiveDocument] = useState("cv");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "Gaborone, Botswana",
    role: "",
    company: "",
    website: "",
    summary: "",
    experience: "",
    skills: "",
  });
  const [research, setResearch] = useState({
    loading: false,
    text: "",
    error: "",
  });
  const [manualCompany, setManualCompany] = useState("");
  const [showCompanyFallback, setShowCompanyFallback] = useState(false);
  const [cvTemplateId, setCvTemplateId] = useState(cvTemplates[0].id);
  const [coverTemplateId, setCoverTemplateId] = useState(
    coverLetterTemplates[0].id,
  );
  const [photo, setPhoto] = useState(null);
  const [photoCrop, setPhotoCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const [validation, setValidation] = useState("");
  const [customization, setCustomization] = useState(defaultCustomization);
  const [studioMessage, setStudioMessage] = useState("");
  const cvTemplate = cvTemplates.find(({ id }) => id === cvTemplateId);
  const coverTemplate = coverLetterTemplates.find(
    ({ id }) => id === coverTemplateId,
  );
  const activeTemplate = activeDocument === "cv" ? cvTemplate : coverTemplate;
  const photoShape = activeTemplate.photo;
  const styledCvTemplate = {
    ...cvTemplate,
    accent: customization.accent || cvTemplate.accent,
    font: customization.font,
    density: customization.density,
  };
  const styledCoverTemplate = {
    ...coverTemplate,
    accent: customization.accent || coverTemplate.accent,
    font: customization.font,
    density: customization.density,
  };
  const set = (k, v) => {
    setValidation("");
    setForm((x) => ({ ...x, [k]: v }));
  };
  const validate = (needsCompany = false) => {
    if (form.name.trim().length < 2) return "Enter your full name.";
    if (form.role.trim().length < 2) return "Enter the role you are targeting.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return "Enter a valid email address.";
    if (form.phone && !/^\+?[0-9 ()-]{7,20}$/.test(form.phone.trim()))
      return "Enter a valid phone number.";
    if (needsCompany && form.company.trim().length < 2)
      return "Enter the company you are applying to.";
    if (form.website) {
      try {
        new URL(form.website);
      } catch {
        return "Enter a complete company website URL, including https://.";
      }
    }
    if (form.summary.trim().length < 30)
      return "Add a professional summary of at least 30 characters.";
    if (form.experience.trim().length < 30)
      return "Add at least 30 characters about your experience.";
    if (split(form.skills).length < 2)
      return "Add at least two relevant skills.";
    return "";
  };
  const researchCompany = async () => {
    if (!form.company.trim()) {
      setResearch({
        loading: false,
        text: "",
        error: "Add a company name first.",
      });
      return;
    }
    setResearch({ loading: true, text: "", error: "" });
    setShowCompanyFallback(false);
    const { data, error } = await supabase.functions.invoke(
      "company-research",
      {
        body: { company: form.company, role: form.role, website: form.website },
      },
    );
    const notFound = !error && data?.found === false;
    setShowCompanyFallback(Boolean(error || data?.error || notFound));
    setResearch({
      loading: false,
      text: notFound ? "" : data?.overview || "",
      error:
        error?.message ||
        data?.error ||
        (notFound
          ? "We could not find enough reliable public information. Tell us about the company below."
          : ""),
    });
  };
  const useCompanyDescription = () => {
    const detail = manualCompany.trim().replace(/\s+/g, " ");
    if (detail.length < 30) {
      setResearch((current) => ({
        ...current,
        error: "Add at least 30 characters about the company.",
      }));
      return;
    }
    const sentence = /[.!?]$/.test(detail) ? detail : `${detail}.`;
    setResearch({
      loading: false,
      error: "",
      text: `${form.company} is described as an organisation that ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)} This context has been shaped into a concise professional note for your application.`,
    });
    setShowCompanyFallback(false);
  };
  const letter = useMemo(
    () =>
      `Dear Hiring Team,\n\nI am writing to apply for the ${form.role || "[role]"} position at ${form.company || "[company]"}. ${form.summary || "My background, practical experience and commitment to doing high-quality work make me a strong candidate for this opportunity."}${research.text ? ` I was particularly drawn to your organisation's work: ${research.text}` : ""}\n\n${form.experience || "I have developed relevant skills through my work, studies and personal projects."} I would bring ${split(form.skills).slice(0, 3).join(", ") || "reliability, initiative and a willingness to learn"} to the team.\n\nI would welcome the opportunity to discuss how I can contribute to ${form.company || "your organisation"}. Thank you for considering my application.\n\nYours sincerely,\n${form.name || "[Your name]"}`,
    [form, research.text],
  );
  const cv = async () => {
    const invalid = validate(false);
    if (invalid) {
      setValidation(invalid);
      return;
    }
    try {
      await authorizeGeneration("cv");
    } catch (error) {
      window.alert(error.message);
      return;
    }
    const photoData =
      photo && cvTemplate.photo !== "none"
        ? await cropImage(photo, photoCrop, cvTemplate.photo)
        : null;
    renderCvPdf({
      form,
      template: styledCvTemplate,
      photoData,
      skills: split(form.skills),
    });
  };
  const cover = async () => {
    const invalid = validate(true);
    if (invalid) {
      setValidation(invalid);
      return;
    }
    try {
      await authorizeGeneration("cover_letter");
    } catch (error) {
      window.alert(error.message);
      return;
    }
    const photoData =
      photo && coverTemplate.photo !== "none"
        ? await cropImage(photo, photoCrop, coverTemplate.photo)
        : null;
    renderCoverLetterPdf({
      form,
      template: styledCoverTemplate,
      photoData,
      letter,
    });
  };
  const saveDraft = () => {
    localStorage.setItem(
      "baakanya-career-draft",
      JSON.stringify({
        form,
        researchText: research.text,
        cvTemplateId,
        coverTemplateId,
        photoCrop,
        customization,
      }),
    );
    setStudioMessage(
      `Draft saved on this device.${photo ? " For privacy, select your photo again when you return." : ""}`,
    );
  };
  const loadDraft = () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("baakanya-career-draft") || "null",
      );
      if (!saved) return setStudioMessage("No saved career draft was found.");
      if (saved.form) setForm((current) => ({ ...current, ...saved.form }));
      if (saved.researchText)
        setResearch({ loading: false, error: "", text: saved.researchText });
      if (cvTemplates.some(({ id }) => id === saved.cvTemplateId))
        setCvTemplateId(saved.cvTemplateId);
      if (coverLetterTemplates.some(({ id }) => id === saved.coverTemplateId))
        setCoverTemplateId(saved.coverTemplateId);
      if (saved.photoCrop) setPhotoCrop(saved.photoCrop);
      if (saved.customization)
        setCustomization({ ...defaultCustomization, ...saved.customization });
      setStudioMessage("Saved career draft loaded. You can continue editing.");
    } catch {
      setStudioMessage("The saved draft could not be opened.");
    }
  };
  const downloadCvWord = async () => {
    const invalid = validate(false);
    if (invalid) return setValidation(invalid);
    try {
      await authorizeGeneration("cv_word");
      exportCvWord({
        form,
        skills: split(form.skills),
        template: styledCvTemplate,
        customization,
      });
    } catch (error) {
      setValidation(error.message);
    }
  };
  const downloadCoverWord = async () => {
    const invalid = validate(true);
    if (invalid) return setValidation(invalid);
    try {
      await authorizeGeneration("cover_letter_word");
      exportCoverWord({
        form,
        letter,
        template: styledCoverTemplate,
        customization,
      });
    } catch (error) {
      setValidation(error.message);
    }
  };
  return (
    <ToolShell
      eyebrow="CAREER DOCUMENTS"
      title="Put your best work on paper."
      description="Build a clear ATS-friendly CV and tailored cover letter from one guided form."
    >
      <nav className="document-workflow" aria-label="Career document being edited">
        <button className={activeDocument === "cv" ? "active" : ""} onClick={() => setActiveDocument("cv")}>
          <span>01</span><div><b>Curriculum vitae</b><small>{cvTemplate.name}</small></div><em>{activeDocument === "cv" ? "Editing now" : "Open CV"}</em>
        </button>
        <button className={activeDocument === "cover" ? "active" : ""} onClick={() => setActiveDocument("cover")}>
          <span>02</span><div><b>Cover letter</b><small>{coverTemplate.name}</small></div><em>{activeDocument === "cover" ? "Editing now" : "Open letter"}</em>
        </button>
      </nav>
      <div className="editing-context">
        <div><span className="kicker">CURRENT DOCUMENT</span><h2>You’re editing your {activeDocument === "cv" ? "CV" : "cover letter"}.</h2></div>
        <p>Your contact and experience details stay in sync across both documents.</p>
      </div>
      {activeDocument === "cv" ? <TemplatePicker label="CV template" templates={cvTemplates} value={cvTemplateId} onChange={setCvTemplateId} />
        : <TemplatePicker label="Cover letter template" templates={coverLetterTemplates} value={coverTemplateId} onChange={setCoverTemplateId} />}
      {photoShape !== "none" && (
        <MediaAdjuster
          label={`${photoShape === "circle" ? "Circular" : "Square"} profile photo`}
          file={photo}
          onFile={setPhoto}
          crop={photoCrop}
          onCrop={setPhotoCrop}
          shape={photoShape}
        />
      )}
      <div className="career-grid">
        <div className="form-card">
          <div className="field-grid">
            <label>
              Full name
              <input
                required
                minLength="2"
                maxLength="80"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
              />
            </label>
            <label>
              Target role
              <input
                required
                minLength="2"
                maxLength="100"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="e.g. Project Coordinator"
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                maxLength="254"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                maxLength="20"
                pattern="\+?[0-9 ()-]{7,20}"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+267 ..."
              />
            </label>
            <label>
              Target company
              <input
                minLength="2"
                maxLength="120"
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Company name"
              />
            </label>
            <label>
              Company website <span className="optional">Optional</span>
              <input
                type="url"
                maxLength="300"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://company.co.bw"
              />
            </label>
            <label>
              Location
              <input
                required
                minLength="2"
                maxLength="120"
                autoComplete="address-level2"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </label>
          </div>
          {activeDocument === "cover" && <div className="research-box">
            <div>
              <b>Company research</b>
              <span>
                Search public web information and add a relevant detail to your
                letter.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              disabled={research.loading}
              onClick={researchCompany}
            >
              <Search size={17} />{" "}
              {research.loading ? "Researching…" : "Research company"}
            </button>
            {(research.text || research.error) && (
              <p className={research.error ? "research-error" : ""}>
                {research.error || research.text}
              </p>
            )}
            {showCompanyFallback && (
              <div className="company-fallback">
                <label>
                  What does the company do?
                  <textarea
                    minLength="30"
                    maxLength="900"
                    rows="4"
                    value={manualCompany}
                    onChange={(event) => setManualCompany(event.target.value)}
                    placeholder="Describe its services, customers, mission or recent work in your own words."
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={useCompanyDescription}
                >
                  Format company description
                </button>
              </div>
            )}
          </div>}
          <label>
            Professional summary
            <textarea
              required
              minLength="30"
              maxLength="800"
              rows="4"
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="What do you do well, and what kind of opportunity are you looking for?"
            />
          </label>
          <label>
            Experience and achievements
            <textarea
              required
              minLength="30"
              maxLength="3000"
              rows="7"
              value={form.experience}
              onChange={(e) => set("experience", e.target.value)}
              placeholder="Include roles, projects, responsibilities and results. Use a new line for each point."
            />
          </label>
          <label>
            Skills
            <textarea
              required
              minLength="3"
              maxLength="500"
              rows="3"
              value={form.skills}
              onChange={(e) => set("skills", e.target.value)}
              placeholder="Project coordination, Excel, customer service..."
            />
          </label>
          {validation && (
            <div className="form-message validation-error" role="alert">
              {validation}
            </div>
          )}
          <div className="form-downloads">
            <button className="btn btn-blue" onClick={activeDocument === "cv" ? cv : cover}>
              <Download />
              Download {activeDocument === "cv" ? "CV" : "cover letter"}
            </button>
            <button className="btn btn-outline" onClick={() => setActiveDocument(activeDocument === "cv" ? "cover" : "cv")}>Edit {activeDocument === "cv" ? "cover letter" : "CV"}</button>
          </div>
        </div>
        <aside className={`letter-preview live-document-preview ${activeDocument}`}>
          <div className="preview-label">
            <Sparkles />
            Live {activeDocument === "cv" ? "CV" : "letter"} preview
          </div>
          {activeDocument === "cv" ? <div className="cv-preview-content">
            <header><h3>{form.name || "Your name"}</h3><b>{form.role || "Target role"}</b><small>{[form.email, form.phone, form.location].filter(Boolean).join(" · ")}</small></header>
            <section><strong>PROFILE</strong><p>{form.summary || "Your professional summary will appear here as you type."}</p></section>
            <section><strong>EXPERIENCE</strong><p className="preline">{form.experience || "Add your roles, projects and achievements to build this section."}</p></section>
            <section><strong>SKILLS</strong><div className="preview-skills">{(split(form.skills).length ? split(form.skills) : ["Your skills"]).map((skill) => <span key={skill}>{skill}</span>)}</div></section>
          </div> : <><h3>{form.role || "Your target role"}</h3><p className="preline">{letter}</p></>}
          <small>
            This preview updates as you type. PDF and Word generation remain on this device.
          </small>
        </aside>
      </div>
      <DocumentStudio
        customization={customization}
        onChange={setCustomization}
        onSave={saveDraft}
        onLoad={loadDraft}
        message={studioMessage}
        wordActions={[activeDocument === "cv" ? { label: "Download CV for Word", onClick: downloadCvWord } : { label: "Download cover letter for Word", onClick: downloadCoverWord }]}
      />
    </ToolShell>
  );
}
