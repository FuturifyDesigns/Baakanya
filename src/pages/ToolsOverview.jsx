import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BusinessMark,
  CareerMark,
  FilesMark,
} from "../components/BrandIllustrations";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const tools = [
  {
    number: "01",
    icon: CareerMark,
    title: "CV + Cover Letter",
    lead: "Build the application, not the formatting.",
    copy: "Create a clear ATS-friendly CV, research the company and shape a cover letter around the role.",
    action: "Build career documents",
    path: "/tools/career",
    tone: "sky",
  },
  {
    number: "02",
    icon: BusinessMark,
    title: "Invoice + Quotation",
    lead: "Professional paperwork for work already done.",
    copy: "Add line items, calculate Botswana VAT and download a client-ready business document.",
    action: "Create an invoice",
    path: "/tools/invoice",
    tone: "ink",
  },
  {
    number: "03",
    icon: FilesMark,
    title: "Convert + Merge",
    lead: "Every file, in the shape it needs to be.",
    copy: "Turn images or Word documents into PDF, arrange several PDFs and merge them privately in your browser.",
    action: "Prepare a file",
    path: "/tools/convert",
    tone: "sand",
  },
];

export default function ToolsOverview() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState({
    email: user?.email || "",
    tool: "",
    reason: "",
    website: "",
  });
  const submitRequest = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.functions.invoke(
      "automation-request",
      { body: request },
    );
    setBusy(false);
    if (error || !data?.ok) {
      setMessage(data?.error || "Your request could not be sent right now.");
      return;
    }
    setMessage("Thank you. Your automation idea has been sent to the admin.");
    setRequest((current) => ({ ...current, tool: "", reason: "" }));
  };
  return (
    <Layout>
      <section className="page-hero page-hero-cream">
        <div className="container">
          <span className="micro-label">BAAKANYA TOOLS</span>
          <h1>Three ways to get unstuck.</h1>
          <p>
            Focused tools for the document jobs that tend to arrive at the worst
            possible time.
          </p>
        </div>
      </section>
      <section className="automation-future">
        <div className="container automation-future-grid">
          <div className="automation-future-copy">
            <span className="micro-label light">WHAT SHOULD COME NEXT?</span>
            <h2>More automation tools are on the way.</h2>
            <p>
              Tell us about a repetitive task you want Baakanya to make shorter.
              Good requests go directly into the admin review queue.
            </p>
            <ul className="automation-future-points">
              <li>Reviewed by the Baakanya team</li>
              <li>Shapes what we build next</li>
              <li>No payment or signup required to suggest</li>
            </ul>
          </div>
          <div className="automation-request-card">
            {!open ? (
              <div className="automation-request-closed">
                <span className="kicker light">IDEA BOX</span>
                <h3>Got a document chore that still eats your time?</h3>
                <p>
                  Send the workflow. If it fits Baakanya, it joins the build
                  queue.
                </p>
                <button className="btn btn-white" onClick={() => setOpen(true)}>
                  Recommend an automation <ArrowRight />
                </button>
              </div>
            ) : (
              <form onSubmit={submitRequest} className="automation-request-form">
                <div className="automation-request-form-head">
                  <span className="kicker light">SEND A REQUEST</span>
                  <h3>Recommend an automation</h3>
                </div>
                <div className="bot-field" aria-hidden="true">
                  <label>
                    Website
                    <input
                      tabIndex="-1"
                      autoComplete="off"
                      value={request.website}
                      onChange={(event) =>
                        setRequest((current) => ({
                          ...current,
                          website: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label>
                  Your email
                  <input
                    required
                    type="email"
                    maxLength="254"
                    autoComplete="email"
                    value={request.email}
                    onChange={(event) =>
                      setRequest((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  Automation idea
                  <input
                    required
                    minLength="3"
                    maxLength="120"
                    pattern=".*\S.*"
                    title="Describe the automation in at least three characters."
                    value={request.tool}
                    onChange={(event) =>
                      setRequest((current) => ({
                        ...current,
                        tool: event.target.value,
                      }))
                    }
                    placeholder="e.g. Turn meeting notes into action items"
                  />
                </label>
                <label>
                  What would it help you finish?
                  <textarea
                    required
                    minLength="10"
                    maxLength="800"
                    rows="4"
                    value={request.reason}
                    onChange={(event) =>
                      setRequest((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    placeholder="Describe the repetitive work and the result you need."
                  />
                </label>
                <button className="btn btn-white" disabled={busy}>
                  {busy ? "Sending…" : "Send recommendation"}
                  {!busy && <ArrowRight />}
                </button>
                {message && <div className="form-message">{message}</div>}
              </form>
            )}
          </div>
        </div>
      </section>
      <section className="tools-editorial">
        {tools.map(({ icon: Icon, ...tool }) => (
          <article className={`editorial-tool ${tool.tone}`} key={tool.number}>
            <div className="container editorial-tool-grid">
              <div className="editorial-tool-number">{tool.number}</div>
              <div className="editorial-tool-icon">
                <Icon />
              </div>
              <div>
                <span>{tool.title}</span>
                <h2>{tool.lead}</h2>
                <p>{tool.copy}</p>
                <Link className="plain-arrow" to={tool.path}>
                  {tool.action}
                  <ArrowRight />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
      <section className="simple-cta">
        <div className="container">
          <h2>Not sure where to begin?</h2>
          <p>Open the workspace and choose the output you need.</p>
          <Link className="btn btn-ink" to="/auth?mode=signup">
            Open workspace <ArrowRight />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
