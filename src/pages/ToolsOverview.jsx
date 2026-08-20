import { ArrowRight, BriefcaseBusiness, FileOutput, Files } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const tools = [
  {
    number: "01",
    icon: BriefcaseBusiness,
    title: "CV + Cover Letter",
    lead: "Build the application, not the formatting.",
    copy: "Create a clear ATS-friendly CV, research the company and shape a cover letter around the role.",
    action: "Build career documents",
    path: "/tools/career",
    tone: "sky",
  },
  {
    number: "02",
    icon: FileOutput,
    title: "Invoice + Quotation",
    lead: "Professional paperwork for work already done.",
    copy: "Add line items, calculate Botswana VAT and download a client-ready business document.",
    action: "Create an invoice",
    path: "/tools/invoice",
    tone: "ink",
  },
  {
    number: "03",
    icon: Files,
    title: "Convert + Merge",
    lead: "Every file, in the shape it needs to be.",
    copy: "Turn images or Word documents into PDF, arrange several PDFs and merge them privately in your browser.",
    action: "Prepare a file",
    path: "/tools/convert",
    tone: "sand",
  },
];

export default function ToolsOverview() {
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
          <Link className="btn btn-ink" to="/workspace">
            Open workspace <ArrowRight />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
