import { Navigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import PaymentPanel from "../components/PaymentPanel";
import { useAccess } from "../lib/access";
import { getAccessDestination } from "../lib/accessRoutes";
import { useAuth } from "../lib/auth";

export default function Payment() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const access = useAccess();
  const plan = params.get("plan") === "credits" ? "credits" : "subscription";
  const reason = params.get("reason");

  // Keep payment inside the access setup flow for users who are not unlocked yet.
  if (!loading && user && !access.loading && !access.allowed) {
    const destination = getAccessDestination(access);
    if (destination && !destination.startsWith("/payment")) {
      return <Navigate to={destination} replace />;
    }
    if (access.status === "awaiting_mode") {
      return <Navigate to="/access" replace />;
    }
    return (
      <Navigate
        to={`/access?step=pay&plan=${plan}${reason === "trial_ended" ? "&reason=trial_ended" : ""}`}
        replace
      />
    );
  }

  return (
    <Layout>
      <section className="payment-page container">
        <span className="kicker">MANUAL PAYMENT</span>
        <h1>
          {reason === "trial_ended"
            ? "Your free trial has ended"
            : "Choose access that fits."}
        </h1>
        {reason === "trial_ended" && (
          <div className="form-message" role="status">
            Pay for credits or monthly access to continue using the tools.
          </div>
        )}
        <PaymentPanel initialPlan={plan} />
      </section>
    </Layout>
  );
}
