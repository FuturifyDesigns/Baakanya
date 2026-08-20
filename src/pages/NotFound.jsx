import { Link } from "react-router-dom";
import Layout from "../components/Layout";

export default function NotFound() {
  return (
    <Layout>
      <section className="error-page">
        <div className="container">
          <span className="micro-label">404 / PAGE NOT FOUND</span>
          <h1>This page moved without leaving paperwork.</h1>
          <p>The address may be incomplete, outdated or no longer available.</p>
          <Link className="btn btn-ink" to="/">
            Back to Baakanya
          </Link>
        </div>
      </section>
    </Layout>
  );
}
