import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Radio, RefreshCw } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const requestStatuses = ["new", "reviewing", "planned", "declined"];

const submissionKindLabel = (kind, planType) => {
  switch (kind) {
    case "credit_topup":
      return "Credit top-up";
    case "monthly_renewal":
      return "Monthly renewal";
    case "new_credits":
      return "New credits";
    case "new_subscription":
      return "New monthly";
    default:
      return planType === "credits" ? "Credits" : "Monthly";
  }
};

export default function AdminControl() {
  const { user, configured, isAdmin, roleLoading } = useAuth();
  const [payments, setPayments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setLoading(true);
    const [paymentResult, requestResult, userResult] = await Promise.all([
      supabase
        .from("payment_submissions")
        .select("*")
        .order("submitted_at", { ascending: false }),
      supabase
        .from("automation_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.rpc("admin_user_statuses"),
    ]);
    const error =
      paymentResult.error || requestResult.error || userResult.error;
    if (error) setMessage(error.message);
    else {
      setPayments(paymentResult.data || []);
      setRequests(requestResult.data || []);
      setUsers(userResult.data || []);
      setMessage("");
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !supabase) return undefined;
    load();
    const channel = supabase
      .channel("admin-control-panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_submissions" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "automation_requests" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credits" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        load,
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      setLive(false);
      supabase.removeChannel(channel);
    };
  }, [isAdmin, load]);

  const metrics = useMemo(
    () => ({
      pending: payments.filter((row) => row.status === "pending").length,
      approved: payments.filter((row) => row.status === "approved").length,
      requests: requests.filter((request) => request.status === "new").length,
      trialActive: users.filter((row) => row.access_status === "trial_active")
        .length,
      expired: users.filter((row) => row.access_status === "trial_expired")
        .length,
      monthlyActive: users.filter(
        (row) => row.access_status === "subscription_active",
      ).length,
      monthlyExpired: users.filter(
        (row) => row.access_status === "subscription_expired",
      ).length,
      creditsActive: users.filter(
        (row) => row.access_status === "credits_available",
      ).length,
      creditsEmpty: users.filter(
        (row) => row.access_status === "credits_exhausted",
      ).length,
      awaiting: users.filter((row) => row.access_status === "awaiting_payment")
        .length,
      underReview: users.filter((row) => row.access_status === "under_review")
        .length,
      creditPool: users.reduce(
        (sum, row) => sum + (Number(row.credit_balance) || 0),
        0,
      ),
      creditTopups: payments.filter(
        (row) => row.submission_kind === "credit_topup",
      ).length,
      monthlyRenewals: payments.filter(
        (row) => row.submission_kind === "monthly_renewal",
      ).length,
    }),
    [payments, requests, users],
  );

  const reviewPayment = async (id, status) => {
    setBusyId(id);
    setMessage("");
    const { error } = await supabase.rpc("review_payment", {
      submission_id: id,
      new_status: status,
    });
    setBusyId("");
    if (error) setMessage(error.message);
    else await load();
  };

  const updateRequest = async (id, status) => {
    setBusyId(id);
    setMessage("");
    const { error } = await supabase
      .from("automation_requests")
      .update({ status })
      .eq("id", id);
    setBusyId("");
    if (error) setMessage(error.message);
    else await load();
  };

  const openReceipt = async (path) => {
    setMessage("");
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(path, 120);
    if (error) setMessage(error.message);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Layout>
      <section className="admin-page container">
        <div className="admin-title-row">
          <div>
            <span className="kicker">ADMIN CONTROL PANEL</span>
            <h1>Keep Baakanya moving.</h1>
            <p>Monitor user access, review payments and product requests.</p>
          </div>
          {isAdmin && (
            <div className={`realtime-pill ${live ? "live" : ""}`}>
              <Radio size={15} /> {live ? "Live updates on" : "Connecting…"}
            </div>
          )}
        </div>
        {!configured ? (
          <div className="empty-state">
            Connect Supabase to use the admin panel.
          </div>
        ) : roleLoading ? (
          <div className="empty-state">Checking administrator access…</div>
        ) : !user || !isAdmin ? (
          <div className="empty-state">
            This route is restricted to a registered administrator account.
          </div>
        ) : (
          <>
            <div className="admin-metrics">
              <article>
                <span>Needs review</span>
                <b>{metrics.pending}</b>
              </article>
              <article>
                <span>Approved payments</span>
                <b>{metrics.approved}</b>
              </article>
              <article>
                <span>New tool ideas</span>
                <b>{metrics.requests}</b>
              </article>
              <article>
                <span>Trials active</span>
                <b>{metrics.trialActive}</b>
              </article>
              <article>
                <span>Trials expired</span>
                <b>{metrics.expired}</b>
              </article>
              <article>
                <span>Monthly active</span>
                <b>{metrics.monthlyActive}</b>
              </article>
              <article>
                <span>Monthly ended</span>
                <b>{metrics.monthlyExpired}</b>
              </article>
              <article>
                <span>Users with credits</span>
                <b>{metrics.creditsActive}</b>
              </article>
              <article>
                <span>Credits exhausted</span>
                <b>{metrics.creditsEmpty}</b>
              </article>
              <article>
                <span>Credits in pool</span>
                <b>{metrics.creditPool}</b>
              </article>
              <article>
                <span>Awaiting payment</span>
                <b>{metrics.awaiting}</b>
              </article>
              <article>
                <span>Under review</span>
                <b>{metrics.underReview}</b>
              </article>
              <article>
                <span>Credit top-ups</span>
                <b>{metrics.creditTopups}</b>
              </article>
              <article>
                <span>Monthly renewals</span>
                <b>{metrics.monthlyRenewals}</b>
              </article>
            </div>
            <div className="admin-toolbar">
              <div>
                <span className="kicker">USERS</span>
                <h2>Access status monitor</h2>
              </div>
              <button
                className="btn btn-small btn-outline"
                onClick={load}
                disabled={loading}
              >
                <RefreshCw size={15} /> {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div className="admin-list user-status-list">
              {users.length === 0 ? (
                <div className="empty-state">No users yet.</div>
              ) : (
                users.map((row) => (
                  <article key={row.user_id}>
                    <div>
                      <b>
                        {row.name || "Unnamed"} · {row.email}
                      </b>
                      <small>
                        Intent: {row.signup_intent || "—"} · Plan:{" "}
                        {row.plan_type}
                      </small>
                      <span className={`status ${row.access_status}`}>
                        {row.access_status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <code>{row.user_id}</code>
                    <div>
                      <small className="admin-access-meta">
                        {row.access_status === "trial_active" &&
                          `Trial · ${row.trial_days_left ?? "—"} days left · ends ${
                            row.trial_end_date
                              ? new Date(row.trial_end_date).toLocaleString()
                              : "—"
                          }`}
                        {row.access_status === "subscription_active" &&
                          `Monthly · ${row.subscription_days_left ?? "—"} days left · ends ${
                            row.subscription_end
                              ? new Date(row.subscription_end).toLocaleString()
                              : "—"
                          }`}
                        {row.access_status === "credits_available" &&
                          `${row.credit_balance || 0} credits remaining`}
                        {row.access_status === "credits_exhausted" &&
                          "0 credits · needs renew"}
                        {row.access_status === "trial_expired" &&
                          `Trial ended ${
                            row.trial_end_date
                              ? new Date(row.trial_end_date).toLocaleString()
                              : ""
                          }`}
                        {row.access_status === "subscription_expired" &&
                          `Monthly ended ${
                            row.subscription_end
                              ? new Date(row.subscription_end).toLocaleString()
                              : ""
                          }`}
                        {row.access_status === "awaiting_payment" &&
                          `Awaiting ${row.signup_intent || "payment"}`}
                        {row.access_status === "under_review" &&
                          "Payment receipt pending review"}
                        {row.access_status === "no_access" && "No active access"}
                        {(row.access_status === "trial_active" ||
                          row.access_status === "subscription_active") &&
                          ` · ${row.credit_balance || 0} credits on account`}
                      </small>
                      {row.user_id !== user.id && (
                        <button
                          className="btn btn-small btn-outline"
                          disabled={busyId === row.user_id}
                          onClick={async () => {
                            const ok = window.confirm(
                              `Permanently delete ${row.email}? This cannot be undone.`,
                            );
                            if (!ok) return;
                            setBusyId(row.user_id);
                            setMessage("");
                            const { error } = await supabase.rpc(
                              "admin_delete_user",
                              { target_user_id: row.user_id },
                            );
                            setBusyId("");
                            if (error) setMessage(error.message);
                            else await load();
                          }}
                        >
                          Delete user
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="admin-toolbar">
              <div>
                <span className="kicker">PAYMENTS</span>
                <h2>Payment reviews</h2>
              </div>
            </div>
            {message && <div className="form-message">{message}</div>}
            <div className="admin-list">
              {loading && payments.length === 0 ? (
                <div className="empty-state">Loading payment submissions…</div>
              ) : payments.length === 0 ? (
                <div className="empty-state">No payment submissions yet.</div>
              ) : (
                payments.map((row) => (
                  <article key={row.id}>
                    <div>
                      <b>
                        P{row.amount} ·{" "}
                        {submissionKindLabel(row.submission_kind, row.plan_type)}
                      </b>
                      <small>
                        {row.plan_type} · {row.payment_method} ·{" "}
                        {new Date(row.submitted_at).toLocaleString()}
                      </small>
                      <span className={`status ${row.status}`}>
                        {row.status}
                      </span>
                      {row.submission_kind && (
                        <span className={`status ${row.submission_kind}`}>
                          {submissionKindLabel(
                            row.submission_kind,
                            row.plan_type,
                          )}
                        </span>
                      )}
                    </div>
                    <code>{row.user_id}</code>
                    <div className="admin-actions">
                      <button
                        className="btn btn-small btn-outline"
                        onClick={() => openReceipt(row.receipt_image_path)}
                      >
                        Receipt <ExternalLink size={14} />
                      </button>
                      {row.status === "pending" && (
                        <>
                          <button
                            className="btn btn-small btn-outline"
                            disabled={busyId === row.id}
                            onClick={() => reviewPayment(row.id, "rejected")}
                          >
                            Reject
                          </button>
                          <button
                            className="btn btn-small btn-blue"
                            disabled={busyId === row.id}
                            onClick={() => reviewPayment(row.id, "approved")}
                          >
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="admin-toolbar admin-section-head">
              <div>
                <span className="kicker">PRODUCT IDEAS</span>
                <h2>Automation requests</h2>
              </div>
            </div>
            <div className="admin-list automation-admin-list">
              {requests.length === 0 ? (
                <div className="empty-state">No automation requests yet.</div>
              ) : (
                requests.map((request) => (
                  <article key={request.id}>
                    <div>
                      <b>{request.tool_name}</b>
                      <small>{request.email}</small>
                      <small>
                        {new Date(request.created_at).toLocaleString()}
                      </small>
                    </div>
                    <p>{request.details}</p>
                    <label className="admin-status-select">
                      Status
                      <select
                        value={request.status}
                        disabled={busyId === request.id}
                        onChange={(event) =>
                          updateRequest(request.id, event.target.value)
                        }
                      >
                        {requestStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
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
