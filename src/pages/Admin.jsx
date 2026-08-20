import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
export default function Admin() {
  const { user, configured } = useAuth();
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const allowed =
    user?.email ===
    (import.meta.env.VITE_ADMIN_EMAIL || "baakanya@baakanya.com");
  const load = useCallback(async () => {
    if (!supabase || !allowed) return;
    const { data, error } = await supabase
      .from("payment_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) setMessage(error.message);
    else setRows(data || []);
  }, [allowed]);
  useEffect(() => {
    load();
  }, [load]);
  const review = async (id, status) => {
    const { error } = await supabase.rpc("review_payment", {
      submission_id: id,
      new_status: status,
    });
    if (error) setMessage(error.message);
    else load();
  };
  return (
    <Layout>
      <section className="admin-page container">
        <span className="kicker">ADMIN</span>
        <h1>Payment reviews</h1>
        {!configured ? (
          <div className="empty-state">
            Connect Supabase to use the admin panel.
          </div>
        ) : !allowed ? (
          <div className="empty-state">
            This route is restricted to the configured owner account.
          </div>
        ) : (
          <>
            {message && <div className="form-message">{message}</div>}
            <div className="admin-list">
              {rows.length === 0 ? (
                <div className="empty-state">No payment submissions yet.</div>
              ) : (
                rows.map((row) => (
                  <article key={row.id}>
                    <div>
                      <b>
                        P{row.amount} · {row.plan_type}
                      </b>
                      <small>
                        {new Date(row.submitted_at).toLocaleString()}
                      </small>
                      <span className={`status ${row.status}`}>
                        {row.status}
                      </span>
                    </div>
                    <code>{row.user_id}</code>
                    {row.status === "pending" && (
                      <div>
                        <button
                          className="btn btn-small btn-outline"
                          onClick={() => review(row.id, "rejected")}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn-small btn-blue"
                          onClick={() => review(row.id, "approved")}
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </Layout>
  );
}
