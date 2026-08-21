import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import Layout from "./Layout";

export default function RequireAuth({ children, title = "Sign in required" }) {
  const { user, loading, configured } = useAuth();
  const location = useLocation();

  if (!configured) return children;
  if (loading) {
    return (
      <Layout>
        <div className="empty-state container">Checking your account…</div>
      </Layout>
    );
  }
  if (!user) {
    return (
      <Layout>
        <section className="locked-card container auth-gate">
          <span className="kicker">WORKSPACE ACCESS</span>
          <h1>{title}</h1>
          <p>
            Only created and signed-in accounts can use the workspace and
            document tools.
          </p>
          <div>
            <Link
              className="btn btn-blue"
              to={`/auth?mode=signin&next=${encodeURIComponent(location.pathname)}`}
            >
              Sign in
            </Link>
            <Link className="btn btn-outline" to="/auth?mode=signup">
              Create account
            </Link>
          </div>
        </section>
      </Layout>
    );
  }
  return children;
}

export function RedirectIfAuthed({ children }) {
  const { user, loading, isAdmin, roleLoading } = useAuth();
  if (loading || roleLoading) return children;
  if (user) return <Navigate to={isAdmin ? "/admin" : "/workspace"} replace />;
  return children;
}
