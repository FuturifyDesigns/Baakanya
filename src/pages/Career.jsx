import { Download, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import ToolShell from "../components/ToolShell";
import { supabase } from "../lib/supabase";
const split = (text) =>
  text
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
export default function Career() {
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
  const set = (k, v) => setForm((x) => ({ ...x, [k]: v }));
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
    const { data, error } = await supabase.functions.invoke(
      "company-research",
      {
        body: { company: form.company, role: form.role, website: form.website },
      },
    );
    setResearch({
      loading: false,
      text: data?.overview || "",
      error: error?.message || data?.error || "",
    });
  };
  const letter = useMemo(
    () =>
      `Dear Hiring Team,\n\nI am writing to apply for the ${form.role || "[role]"} position at ${form.company || "[company]"}. ${form.summary || "My background, practical experience and commitment to doing high-quality work make me a strong candidate for this opportunity."}${research.text ? ` I was particularly drawn to your organisation's work: ${research.text}` : ""}\n\n${form.experience || "I have developed relevant skills through my work, studies and personal projects."} I would bring ${split(form.skills).slice(0, 3).join(", ") || "reliability, initiative and a willingness to learn"} to the team.\n\nI would welcome the opportunity to discuss how I can contribute to ${form.company || "your organisation"}. Thank you for considering my application.\n\nYours sincerely,\n${form.name || "[Your name]"}`,
    [form, research.text],
  );
  const cv = () => {
    const pdf = new jsPDF();
    pdf.setFillColor(16, 27, 34);
    pdf.rect(0, 0, 210, 42, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.text(form.name || "Your Name", 18, 20);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(form.role || "Professional profile", 18, 30);
    pdf.setTextColor(35, 49, 58);
    pdf.setFontSize(9);
    pdf.text(
      [form.email, form.phone, form.location].filter(Boolean).join("  •  "),
      18,
      51,
    );
    let y = 67;
    const section = (title, body) => {
      if (!body) return;
      pdf.setTextColor(48, 139, 196);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(title.toUpperCase(), 18, y);
      y += 8;
      pdf.setTextColor(35, 49, 58);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(body, 174);
      lines.forEach((line) => {
        if (y > 278) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, 18, y);
        y += 5.5;
      });
      y += 7;
    };
    section("Profile", form.summary);
    section("Experience", form.experience);
    section("Skills", split(form.skills).join("  •  "));
    pdf.save(
      `${(form.name || "baakanya").replace(/\s+/g, "-").toLowerCase()}-cv.pdf`,
    );
  };
  const cover = () => {
    const pdf = new jsPDF();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(form.name || "Your Name", 18, 22);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(
      [form.email, form.phone, form.location].filter(Boolean).join("  •  "),
      18,
      31,
    );
    pdf.setDrawColor(102, 181, 229);
    pdf.setLineWidth(1);
    pdf.line(18, 38, 192, 38);
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(letter, 174);
    let y = 56;
    lines.forEach((line) => {
      pdf.text(line, 18, y);
      y += 6;
    });
    pdf.save(
      `${(form.name || "baakanya").replace(/\s+/g, "-").toLowerCase()}-cover-letter.pdf`,
    );
  };
  return (
    <ToolShell
      eyebrow="CAREER DOCUMENTS"
      title="Put your best work on paper."
      description="Build a clear ATS-friendly CV and tailored cover letter from one guided form."
    >
      <div className="career-grid">
        <div className="form-card">
          <div className="field-grid">
            <label>
              Full name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
              />
            </label>
            <label>
              Target role
              <input
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="e.g. Project Coordinator"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+267 ..."
              />
            </label>
            <label>
              Target company
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Company name"
              />
            </label>
            <label>
              Company website <span className="optional">Optional</span>
              <input
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://company.co.bw"
              />
            </label>
            <label>
              Location
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </label>
          </div>
          <div className="research-box">
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
          </div>
          <label>
            Professional summary
            <textarea
              rows="4"
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="What do you do well, and what kind of opportunity are you looking for?"
            />
          </label>
          <label>
            Experience and achievements
            <textarea
              rows="7"
              value={form.experience}
              onChange={(e) => set("experience", e.target.value)}
              placeholder="Include roles, projects, responsibilities and results. Use a new line for each point."
            />
          </label>
          <label>
            Skills
            <textarea
              rows="3"
              value={form.skills}
              onChange={(e) => set("skills", e.target.value)}
              placeholder="Project coordination, Excel, customer service..."
            />
          </label>
          <div className="form-downloads">
            <button className="btn btn-blue" onClick={cv}>
              <Download />
              Download CV
            </button>
            <button className="btn btn-outline" onClick={cover}>
              <Download />
              Cover letter
            </button>
          </div>
        </div>
        <aside className="letter-preview">
          <div className="preview-label">
            <Sparkles />
            Draft preview
          </div>
          <h3>{form.role || "Your target role"}</h3>
          <p className="preline">{letter}</p>
          <small>
            Web research runs only when you select “Research company”. Your CV
            and PDF generation remain on this device.
          </small>
        </aside>
      </div>
    </ToolShell>
  );
}
