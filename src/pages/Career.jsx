import { Loader2, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ToolShell from "../components/ToolShell";
import TemplatePicker from "../components/TemplatePicker";
import MediaAdjuster from "../components/MediaAdjuster";
import GenerateDocIcon from "../components/GenerateDocIcon";
import {
  CoverDocumentPreview,
  CvDocumentPreview,
  split,
} from "../components/DocumentPreview";
import { defaultCustomization, defaultsForKind } from "../lib/customization";
import {
  CAREER_DRAFT_KEY,
  readLocalDraft,
  useAutoSave,
} from "../lib/draftStore";
import { saveEditorDocument } from "../lib/documentEditorStore";
import { checkGenerationAccess } from "../lib/generation";
import { useToast } from "../lib/toast";
import { coverLetterTemplates, cvTemplates } from "../lib/documentTemplates";
import { cropImage } from "../lib/media";
import { isValidWebsite, normalizeWebsite } from "../lib/urls";
import { formatCompanyContext } from "../lib/companyContext";

const emptyCv = {
  name: "",
  email: "",
  phone: "",
  location: "Gaborone, Botswana",
  expertise: "",
  website: "",
  linkedin: "",
  summary: "",
  experience: "",
  education: "",
  skills: "",
  certifications: "",
};

const emptyCover = {
  name: "",
  email: "",
  phone: "",
  location: "Gaborone, Botswana",
  role: "",
  company: "",
  companyWebsite: "",
  hiringManager: "",
  summary: "",
  experience: "",
  skills: "",
};

export default function Career() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [generating, setGenerating] = useState(false);
  const [activeDocument, setActiveDocument] = useState("cv");
  const [cvForm, setCvForm] = useState(emptyCv);
  const [coverForm, setCoverForm] = useState(emptyCover);
  const [research, setResearch] = useState({
    text: "",
    motivation: "",
    error: "",
  });
  const [manualCompany, setManualCompany] = useState("");
  const [cvTemplateId, setCvTemplateId] = useState(cvTemplates[0].id);
  const [coverTemplateId, setCoverTemplateId] = useState(
    coverLetterTemplates[0].id,
  );
  const [photo, setPhoto] = useState(null);
  const [photoCrop, setPhotoCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const [validation, setValidation] = useState("");
  const [customization, setCustomization] = useState(defaultCustomization);
  const [cvGenerated, setCvGenerated] = useState(false);
  const [coverGenerated, setCoverGenerated] = useState(false);
  const [letterFinal, setLetterFinal] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const cvTemplate = cvTemplates.find(({ id }) => id === cvTemplateId);
  const coverTemplate = coverLetterTemplates.find(
    ({ id }) => id === coverTemplateId,
  );
  const activeTemplate = activeDocument === "cv" ? cvTemplate : coverTemplate;
  const photoShape = activeTemplate.photo;
  const styledCvTemplate = {
    ...cvTemplate,
    accent: customization.accent || cvTemplate.accent,
    primary: customization.primary || cvTemplate.primary,
    background:
      customization.background || cvTemplate.background || "#ffffff",
    font: customization.font || cvTemplate.font || "calibri",
    density: customization.density || cvTemplate.density || "comfortable",
    lineSpacing:
      customization.lineSpacing || cvTemplate.lineSpacing || "1.15",
    titles: {
      ...(cvTemplate.titles || {}),
      ...(customization.titles || {}),
    },
  };
  const styledCoverTemplate = {
    ...coverTemplate,
    accent: customization.accent || coverTemplate.accent,
    primary: customization.primary || coverTemplate.primary,
    background:
      customization.background || coverTemplate.background || "#ffffff",
    font: customization.font || coverTemplate.font || "georgia",
    density: customization.density || coverTemplate.density || "comfortable",
    lineSpacing:
      customization.lineSpacing || coverTemplate.lineSpacing || "1.5",
  };
  const photoPreview = useMemo(
    () => (photo ? URL.createObjectURL(photo) : ""),
    [photo],
  );
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  const resetCareerWorkspace = () => {
    setActiveDocument("cv");
    setCvForm(emptyCv);
    setCoverForm(emptyCover);
    setResearch({
      text: "",
      motivation: "",
      error: "",
    });
    setManualCompany("");
    setCvTemplateId(cvTemplates[0].id);
    setCoverTemplateId(coverLetterTemplates[0].id);
    setPhoto(null);
    setPhotoCrop({ zoom: 1, x: 0, y: 0 });
    setCustomization(defaultCustomization);
    setCvGenerated(false);
    setCoverGenerated(false);
    setLetterFinal("");
    setValidation("");
  };

  useEffect(() => {
    if (location.state?.freshDocument) {
      resetCareerWorkspace();
      toast.success("Ready for a new document. Pick a template and fill in the form.");
      navigate(location.pathname, { replace: true, state: null });
      setDraftReady(true);
      return;
    }

    const saved = readLocalDraft(CAREER_DRAFT_KEY);
    if (!saved) {
      setDraftReady(true);
      return;
    }
    try {
      if (saved.cvForm) setCvForm((current) => ({ ...current, ...saved.cvForm }));
      else if (saved.form) {
        setCvForm((current) => ({
          ...current,
          name: saved.form.name || "",
          email: saved.form.email || "",
          phone: saved.form.phone || "",
          location: saved.form.location || current.location,
          expertise: saved.form.expertise || saved.form.role || "",
          website: saved.form.website || "",
          summary: saved.form.summary || "",
          experience: saved.form.experience || "",
          skills: saved.form.skills || "",
        }));
        setCoverForm((current) => ({
          ...current,
          name: saved.form.name || "",
          email: saved.form.email || "",
          phone: saved.form.phone || "",
          location: saved.form.location || current.location,
          role: saved.form.role || "",
          company: saved.form.company || "",
          companyWebsite: saved.form.website || "",
          summary: saved.form.summary || "",
          experience: saved.form.experience || "",
          skills: saved.form.skills || "",
        }));
      }
      if (saved.coverForm)
        setCoverForm((current) => ({ ...current, ...saved.coverForm }));
      if (saved.researchText)
        setResearch({
          error: "",
          text: saved.researchText,
          motivation: saved.researchMotivation || saved.researchFit || "",
        });
      if (saved.manualCompany) setManualCompany(saved.manualCompany);
      if (cvTemplates.some(({ id }) => id === saved.cvTemplateId))
        setCvTemplateId(saved.cvTemplateId);
      if (coverLetterTemplates.some(({ id }) => id === saved.coverTemplateId))
        setCoverTemplateId(saved.coverTemplateId);
      if (saved.photoCrop) setPhotoCrop(saved.photoCrop);
      if (saved.customization)
        setCustomization({
          ...defaultCustomization,
          ...saved.customization,
          titles: {
            ...defaultCustomization.titles,
            ...(saved.customization.titles || {}),
          },
        });
      setCvGenerated(Boolean(saved.cvGenerated));
      setCoverGenerated(Boolean(saved.coverGenerated));
      if (saved.letterFinal) setLetterFinal(saved.letterFinal);
      if (saved.activeDocument === "cover" || saved.activeDocument === "cv") {
        setActiveDocument(saved.activeDocument);
      }
      toast.info(
        "Your previous draft was restored. Photos are not stored — select again if needed.",
      );
    } catch {
      toast.error("A previous draft was found but could not be restored.");
    } finally {
      setDraftReady(true);
    }
  }, [location.pathname, location.state?.freshDocument, navigate]);

  const careerDraftPayload = useMemo(
    () => ({
      activeDocument,
      cvForm,
      coverForm,
      researchText: research.text,
      researchMotivation: research.motivation,
      manualCompany,
      cvTemplateId,
      coverTemplateId,
      photoCrop,
      customization,
      cvGenerated,
      coverGenerated,
      letterFinal,
    }),
    [
      activeDocument,
      cvForm,
      coverForm,
      research.text,
      research.motivation,
      manualCompany,
      cvTemplateId,
      coverTemplateId,
      photoCrop,
      customization,
      cvGenerated,
      coverGenerated,
      letterFinal,
    ],
  );

  const autosaveStatus = useAutoSave(CAREER_DRAFT_KEY, careerDraftPayload, {
    enabled: draftReady,
    delay: 700,
  });

  const setCv = (k, v) => {
    setValidation("");
    setCvForm((x) => ({ ...x, [k]: v }));
  };
  const setCover = (k, v) => {
    setValidation("");
    if (
      ["company", "role"].includes(k) &&
      v !== coverForm[k]
    ) {
      setResearch({
        text: "",
        motivation: "",
        error: "",
      });
      if (k === "company") setManualCompany("");
    }
    setCoverForm((x) => ({ ...x, [k]: v }));
  };

  const validateCv = () => {
    if (cvForm.name.trim().length < 2) return "Enter your full name.";
    if (cvForm.expertise.trim().length < 2)
      return "Enter your expertise or professional headline.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cvForm.email.trim()))
      return "Enter a valid email address.";
    if (cvForm.phone && !/^\+?[0-9 ()-]{7,20}$/.test(cvForm.phone.trim()))
      return "Enter a valid phone number.";
    if (cvForm.website && !isValidWebsite(cvForm.website))
      return "Enter a website domain or URL, for example futurifydesigns.com";
    if (cvForm.linkedin && !/linkedin\.com/i.test(cvForm.linkedin))
      return "Enter a LinkedIn profile URL, or leave it blank.";
    if (cvForm.summary.trim().length < 30)
      return "Add a professional summary of at least 30 characters.";
    if (cvForm.experience.trim().length < 30)
      return "Add at least 30 characters about your experience.";
    if (cvForm.education.trim().length < 10)
      return "Add your education background.";
    if (split(cvForm.skills).length < 2)
      return "Add at least two relevant skills.";
    return "";
  };

  const validateCover = () => {
    if (coverForm.name.trim().length < 2) return "Enter your full name.";
    if (coverForm.role.trim().length < 2) return "Enter the target role.";
    if (coverForm.company.trim().length < 2)
      return "Enter the company you are applying to.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coverForm.email.trim()))
      return "Enter a valid email address.";
    if (coverForm.phone && !/^\+?[0-9 ()-]{7,20}$/.test(coverForm.phone.trim()))
      return "Enter a valid phone number.";
    if (coverForm.companyWebsite && !isValidWebsite(coverForm.companyWebsite))
      return "Enter a company website domain or URL, for example company.co.bw";
    if (coverForm.summary.trim().length < 30)
      return "Add why you are applying (at least 30 characters).";
    if (coverForm.experience.trim().length < 30)
      return "Add relevant experience for this letter.";
    if (split(coverForm.skills).length < 2)
      return "Add at least two skills to highlight.";
    return "";
  };

  const useCompanyDescription = () => {
    setResearch(formatCompanyContext({
      company: coverForm.company,
      description: manualCompany,
      role: coverForm.role,
      skills: split(coverForm.skills),
    }));
  };

  const letterDraft = useMemo(() => {
    const manager = coverForm.hiringManager.trim() || "Hiring Team";
    const companyParagraph = research.text
      ? `\n\n${research.text} ${research.motivation}`.trimEnd()
      : "";
    return `Dear ${manager},\n\nI am writing to apply for the ${coverForm.role || "[role]"} position at ${coverForm.company || "[company]"}. ${coverForm.summary || "My background, practical experience and commitment to doing high-quality work make me a strong candidate for this opportunity."}${companyParagraph}\n\n${coverForm.experience || "I have developed relevant skills through my work, studies and personal projects."} I would bring ${split(coverForm.skills).slice(0, 3).join(", ") || "reliability, initiative and a willingness to learn"} to the team.\n\nI would welcome the opportunity to discuss how I can contribute to ${coverForm.company || "your organisation"}. Thank you for considering my application.\n\nYours sincerely,\n${coverForm.name || "[Your name]"}`;
  }, [coverForm, research.motivation, research.text]);

  const letter = coverGenerated && letterFinal ? letterFinal : letterDraft;

  const openEditor = async (kind) => {
    const isCv = kind === "cv";
    const activeTemplateLocal = isCv ? cvTemplate : coverTemplate;
    const photoData =
      photo && activeTemplateLocal.photo !== "none"
        ? await cropImage(photo, photoCrop, activeTemplateLocal.photo)
        : null;
    saveEditorDocument({
      kind,
      draftKey: crypto.randomUUID(),
      toolName: kind === "cv" ? "cv" : "cover_letter",
      billed: false,
      templateId: isCv ? cvTemplateId : coverTemplateId,
      form: isCv
        ? {
            ...cvForm,
            website: normalizeWebsite(cvForm.website),
            linkedin: normalizeWebsite(cvForm.linkedin),
          }
        : {
            ...coverForm,
            companyWebsite: normalizeWebsite(coverForm.companyWebsite),
          },
      letter: isCv ? "" : letterDraft,
      photoData,
      customization: {
        ...defaultCustomization,
        ...defaultsForKind(kind),
        ...customization,
        titles: {
          ...defaultCustomization.titles,
          ...(customization.titles || {}),
        },
        accent: customization.accent || "",
        primary: customization.primary || "",
        background: customization.background || "#ffffff",
        font: customization.font || defaultsForKind(kind).font,
        lineSpacing:
          customization.lineSpacing || defaultsForKind(kind).lineSpacing,
        density: customization.density || defaultsForKind(kind).density,
      },
      returnPath: "/tools/career",
    });
    navigate("/tools/editor");
  };

  const generateCv = async () => {
    const invalid = validateCv();
    if (invalid) {
      setValidation(invalid);
      toast.error(invalid);
      return;
    }
    setGenerating(true);
    toast.info("Preparing your CV…");
    try {
      await checkGenerationAccess("cv");
      setCvGenerated(true);
      await openEditor("cv");
      toast.success("CV ready — opening the document editor.");
    } catch (error) {
      toast.error(error.message || "Could not open the CV editor.");
    } finally {
      setGenerating(false);
    }
  };

  const generateCover = async () => {
    const invalid = validateCover();
    if (invalid) {
      setValidation(invalid);
      toast.error(invalid);
      return;
    }
    setGenerating(true);
    toast.info("Preparing your cover letter…");
    try {
      await checkGenerationAccess("cover_letter");
      setLetterFinal(letterDraft);
      setCoverGenerated(true);
      await openEditor("cover");
      toast.success("Cover letter ready — opening the document editor.");
    } catch (error) {
      toast.error(error.message || "Could not open the cover letter editor.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ToolShell
      eyebrow="CAREER DOCUMENTS"
      title="Put your best work on paper."
      description="Fill the form, generate, then finish layout and wording in the document editor before you download."
    >
      <nav className="document-workflow" aria-label="Career document being edited">
        <button
          className={activeDocument === "cv" ? "active" : ""}
          onClick={() => setActiveDocument("cv")}
        >
          <span>01</span>
          <div>
            <b>Curriculum vitae</b>
            <small>{cvTemplate.name}</small>
          </div>
          <em>{activeDocument === "cv" ? "Editing now" : "Open CV"}</em>
        </button>
        <button
          className={activeDocument === "cover" ? "active" : ""}
          onClick={() => setActiveDocument("cover")}
        >
          <span>02</span>
          <div>
            <b>Cover letter</b>
            <small>{coverTemplate.name}</small>
          </div>
          <em>{activeDocument === "cover" ? "Editing now" : "Open letter"}</em>
        </button>
      </nav>
      <div className="editing-context">
        <div>
          <span className="kicker">CURRENT DOCUMENT</span>
          <h2>
            You’re editing your {activeDocument === "cv" ? "CV" : "cover letter"}.
          </h2>
        </div>
        <p>
          Each document keeps its own international-standard fields. They do not
          share form data.
        </p>
      </div>
      {activeDocument === "cv" ? (
        <TemplatePicker
          label="CV template"
          templates={cvTemplates}
          value={cvTemplateId}
          onChange={setCvTemplateId}
        />
      ) : (
        <TemplatePicker
          label="Cover letter template"
          templates={coverLetterTemplates}
          value={coverTemplateId}
          onChange={setCoverTemplateId}
        />
      )}
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
      <div className="tool-dual-pane">
        <aside
          className={`letter-preview live-document-preview ${activeDocument}`}
        >
          <div className="preview-chrome">
            <div className="preview-label">
              <Eye size={14} />
              Live {activeDocument === "cv" ? "CV" : "letter"} preview ·{" "}
              {activeTemplate.name}
            </div>
          </div>
          <div className="preview-scroll">
            <div className="preview-fit">
              {activeDocument === "cv" ? (
                <CvDocumentPreview
                  form={cvForm}
                  template={styledCvTemplate}
                  skills={split(cvForm.skills)}
                  photoUrl={photoPreview}
                />
              ) : (
                <CoverDocumentPreview
                  form={coverForm}
                  template={styledCoverTemplate}
                  letter={letter}
                  photoUrl={photoPreview}
                />
              )}
            </div>
            <small>
              Same layout as your downloadable PDF — what you see is what you
              get.
            </small>
          </div>
        </aside>
        <div className="form-card tool-dual-form">
          <div className="tool-dual-form-scroll">
          {activeDocument === "cv" ? (
            <>
              <div className="field-grid">
                <label>
                  Full name
                  <input
                    required
                    minLength="2"
                    maxLength="80"
                    autoComplete="name"
                    value={cvForm.name}
                    onChange={(e) => setCv("name", e.target.value)}
                    placeholder="Your full name"
                  />
                </label>
                <label>
                  Expertise / professional headline
                  <input
                    required
                    minLength="2"
                    maxLength="100"
                    value={cvForm.expertise}
                    onChange={(e) => setCv("expertise", e.target.value)}
                    placeholder="e.g. Operations & project coordination"
                  />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    maxLength="254"
                    autoComplete="email"
                    value={cvForm.email}
                    onChange={(e) => setCv("email", e.target.value)}
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
                    value={cvForm.phone}
                    onChange={(e) => setCv("phone", e.target.value)}
                    placeholder="+267 ..."
                  />
                </label>
                <label>
                  Location
                  <input
                    required
                    minLength="2"
                    maxLength="120"
                    autoComplete="address-level2"
                    value={cvForm.location}
                    onChange={(e) => setCv("location", e.target.value)}
                  />
                </label>
                <label>
                  Personal website <span className="optional">Optional</span>
                  <input
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    maxLength="300"
                    value={cvForm.website}
                    onChange={(e) => setCv("website", e.target.value)}
                    onBlur={() => {
                      if (cvForm.website.trim() && isValidWebsite(cvForm.website)) {
                        setCv("website", normalizeWebsite(cvForm.website));
                      }
                    }}
                    placeholder="futurifydesigns.com"
                  />
                </label>
                <label>
                  LinkedIn <span className="optional">Optional</span>
                  <input
                    type="text"
                    inputMode="url"
                    maxLength="300"
                    value={cvForm.linkedin}
                    onChange={(e) => setCv("linkedin", e.target.value)}
                    onBlur={() => {
                      if (
                        cvForm.linkedin.trim() &&
                        /linkedin\.com/i.test(cvForm.linkedin)
                      ) {
                        setCv("linkedin", normalizeWebsite(cvForm.linkedin));
                      }
                    }}
                    placeholder="linkedin.com/in/you"
                  />
                </label>
              </div>
              <label>
                Professional summary
                <textarea
                  required
                  minLength="30"
                  maxLength="800"
                  rows="4"
                  value={cvForm.summary}
                  onChange={(e) => setCv("summary", e.target.value)}
                  placeholder="What do you do well, and what kind of opportunity are you looking for?"
                />
              </label>
              <label>
                Work experience
                <textarea
                  required
                  minLength="30"
                  maxLength="3000"
                  rows="7"
                  value={cvForm.experience}
                  onChange={(e) => setCv("experience", e.target.value)}
                  placeholder="Include roles, employers, dates, responsibilities and results."
                />
              </label>
              <label>
                Education
                <textarea
                  required
                  minLength="10"
                  maxLength="1200"
                  rows="4"
                  value={cvForm.education}
                  onChange={(e) => setCv("education", e.target.value)}
                  placeholder="Qualification, institution and year."
                />
              </label>
              <label>
                Skills
                <textarea
                  required
                  minLength="3"
                  maxLength="500"
                  rows="3"
                  value={cvForm.skills}
                  onChange={(e) => setCv("skills", e.target.value)}
                  placeholder="Project coordination, Excel, customer service..."
                />
              </label>
              <label>
                Certifications <span className="optional">Optional</span>
                <textarea
                  maxLength="800"
                  rows="3"
                  value={cvForm.certifications}
                  onChange={(e) => setCv("certifications", e.target.value)}
                  placeholder="Relevant licences or certificates."
                />
              </label>
            </>
          ) : (
            <>
              <div className="field-grid">
                <label>
                  Full name
                  <input
                    required
                    minLength="2"
                    maxLength="80"
                    value={coverForm.name}
                    onChange={(e) => setCover("name", e.target.value)}
                    placeholder="Your full name"
                  />
                </label>
                <label>
                  Target role
                  <input
                    required
                    minLength="2"
                    maxLength="100"
                    value={coverForm.role}
                    onChange={(e) => setCover("role", e.target.value)}
                    placeholder="e.g. Project Coordinator"
                  />
                </label>
                <label>
                  Target company
                  <input
                    required
                    minLength="2"
                    maxLength="120"
                    value={coverForm.company}
                    onChange={(e) => setCover("company", e.target.value)}
                    placeholder="Company name"
                  />
                </label>
                <label>
                  Hiring manager <span className="optional">Optional</span>
                  <input
                    maxLength="120"
                    value={coverForm.hiringManager}
                    onChange={(e) => setCover("hiringManager", e.target.value)}
                    placeholder="Name or leave blank for Hiring Team"
                  />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    maxLength="254"
                    value={coverForm.email}
                    onChange={(e) => setCover("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="tel"
                    maxLength="20"
                    value={coverForm.phone}
                    onChange={(e) => setCover("phone", e.target.value)}
                    placeholder="+267 ..."
                  />
                </label>
                <label>
                  Location
                  <input
                    required
                    minLength="2"
                    maxLength="120"
                    value={coverForm.location}
                    onChange={(e) => setCover("location", e.target.value)}
                  />
                </label>
                <label>
                  Company website <span className="optional">Optional</span>
                  <input
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    maxLength="300"
                    value={coverForm.companyWebsite}
                    onChange={(e) => setCover("companyWebsite", e.target.value)}
                    onBlur={() => {
                      if (
                        coverForm.companyWebsite.trim() &&
                        isValidWebsite(coverForm.companyWebsite)
                      ) {
                        setCover(
                          "companyWebsite",
                          normalizeWebsite(coverForm.companyWebsite),
                        );
                      }
                    }}
                    placeholder="company.co.bw"
                  />
                </label>
              </div>
              <div className="research-box">
                <div>
                  <b>Tell us about the company</b>
                  <span>
                    Add what you know about its work, mission or services. We
                    will shape it into professional wording for your letter.
                  </span>
                </div>
                <div className="company-fallback">
                  <label>
                    Company description
                    <textarea
                      minLength="30"
                      maxLength="900"
                      rows="4"
                      value={manualCompany}
                      onChange={(event) => setManualCompany(event.target.value)}
                      placeholder="For example: what the company does, who it serves, what it values, or work that interests you."
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={useCompanyDescription}
                  >
                    Format for my cover letter
                  </button>
                </div>
                {(research.text || research.error) && (
                  <p className={research.error ? "research-error" : ""}>
                    {research.error ||
                      `${research.text} ${research.motivation}`.trim()}
                  </p>
                )}
              </div>
              <label>
                Why you are applying
                <textarea
                  required
                  minLength="30"
                  maxLength="800"
                  rows="4"
                  value={coverForm.summary}
                  onChange={(e) => setCover("summary", e.target.value)}
                  placeholder="Connect your motivation to this role and company."
                />
              </label>
              <label>
                Experience to highlight
                <textarea
                  required
                  minLength="30"
                  maxLength="2000"
                  rows="6"
                  value={coverForm.experience}
                  onChange={(e) => setCover("experience", e.target.value)}
                  placeholder="Evidence that matches this specific role."
                />
              </label>
              <label>
                Skills to highlight
                <textarea
                  required
                  minLength="3"
                  maxLength="500"
                  rows="3"
                  value={coverForm.skills}
                  onChange={(e) => setCover("skills", e.target.value)}
                  placeholder="Skills most relevant to this application"
                />
              </label>
            </>
          )}
          {validation && (
            <div className="form-message validation-error" role="alert">
              {validation}
            </div>
          )}
          <div className="form-downloads">
            <button
              className={`btn btn-blue${generating ? " is-loading" : ""}`}
              disabled={generating}
              onClick={activeDocument === "cv" ? generateCv : generateCover}
            >
              {generating ? (
                <>
                  <Loader2 size={18} className="spin" aria-hidden="true" />
                  Preparing {activeDocument === "cv" ? "CV" : "cover letter"}…
                </>
              ) : (
                <>
                  <GenerateDocIcon />
                  Generate {activeDocument === "cv" ? "CV" : "cover letter"}
                </>
              )}
            </button>
          </div>
          <p className="generate-hint">
            Generate opens the editor without using a credit. You only pay when
            you confirm the final document before download. Your form autosaves
            on this device.
          </p>
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
