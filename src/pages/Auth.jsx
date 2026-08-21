import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Logo } from "../components/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function Auth() {
  const [params] = useSearchParams();
  const [signup, setSignup] = useState(params.get("mode") === "signup");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    website: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, isAdmin, roleLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const nextPath = params.get("next") || "/workspace";
  const passwordChecks = {
    length: form.password.length >= 10,
    letter: /[A-Za-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
  };
  const strengthScore = [
    passwordChecks.length,
    /[a-z]/.test(form.password) && /[A-Z]/.test(form.password),
    passwordChecks.number,
    /[^A-Za-z0-9]/.test(form.password),
  ].filter(Boolean).length;
  const strength =
    strengthScore <= 1
      ? { label: "Weak", className: "weak" }
      : strengthScore === 2
        ? { label: "Fair", className: "fair" }
        : strengthScore === 3
          ? { label: "Good", className: "good" }
          : { label: "Strong", className: "strong" };

  useEffect(() => {
    setSignup(params.get("mode") === "signup");
  }, [params]);

  useEffect(() => {
    if (!user || roleLoading || signup) return;
    (async () => {
      if (isAdmin) {
        navigate("/admin", { replace: true });
        return;
      }
      const { data } = await supabase
        ?.from("profiles")
        .select("plan_type,trial_end_date,signup_intent")
        .eq("id", user.id)
        .maybeSingle();
      const now = Date.now();
      const trialActive =
        data?.trial_end_date && new Date(data.trial_end_date).getTime() > now;
      const hasIntent = Boolean(data?.signup_intent);
      if (!trialActive && data?.plan_type === "none" && !hasIntent) {
        navigate("/access", { replace: true });
        return;
      }
      if (
        !trialActive &&
        data?.plan_type === "none" &&
        (data?.signup_intent === "credits" ||
          data?.signup_intent === "subscription")
      ) {
        navigate(
          `/access?step=pay&plan=${data.signup_intent === "credits" ? "credits" : "subscription"}`,
          { replace: true },
        );
        return;
      }
      navigate(nextPath, { replace: true });
    })();
  }, [user, isAdmin, roleLoading, navigate, signup, nextPath]);

  const submit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setMessage(
        "Account services are temporarily unavailable. Please try again shortly.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    const email = form.email.trim().toLowerCase();
    let result;
    if (signup) {
      result = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}verified.html`,
          data: {
            name: form.name,
            website: form.website,
          },
        },
      });
      if (!result.error) {
        if (result.data?.session) await signOut();
        setBusy(false);
        setSignup(false);
        setMessage(
          "Please check your email and verify your account, then sign in.",
        );
        navigate("/auth?mode=signin", { replace: true });
        return;
      }
    } else {
      result = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });
    }
    setBusy(false);
    if (result.error) setMessage(result.error.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Logo />
        <div>
          <span className="kicker light">DOCUMENTS, SORTED.</span>
          <h1>A small toolkit for the admin that moves life forward.</h1>
          <ul>
            <li>
              <CheckCircle2 />
              Create an account, verify, then choose access
            </li>
            <li>
              <CheckCircle2 />
              Free trial or paid options after verification
            </li>
            <li>
              <CheckCircle2 />
              Editable Word and PDF downloads
            </li>
          </ul>
        </div>
      </div>
      <div className="auth-form-wrap">
        <Link to="/" className="auth-back">
          ← Back to home
        </Link>
        <form className="auth-form" onSubmit={submit}>
          <div className="bot-field" aria-hidden="true">
            <label>
              Website
              <input
                name="website"
                tabIndex="-1"
                autoComplete="off"
                value={form.website}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    website: e.target.value,
                  }))
                }
              />
            </label>
          </div>
          <span className="kicker">
            {signup ? "CREATE ACCOUNT" : "WELCOME BACK"}
          </span>
          <h2>{signup ? "Create your account" : "Log in to Baakanya"}</h2>
          <p>
            {signup
              ? "Verify your email, then choose free trial or paid access."
              : "Pick up where you left off."}
          </p>
          {signup && (
            <label>
              Full name
              <input
                required
                minLength="2"
                maxLength="80"
                pattern=".*\S.*"
                title="Enter your full name."
                autoComplete="name"
                value={form.name}
                onChange={(e) =>
                  setForm((x) => ({ ...x, name: e.target.value }))
                }
                placeholder="Your full name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              maxLength="254"
              autoComplete="email"
              value={form.email}
              onChange={(e) =>
                setForm((x) => ({ ...x, email: e.target.value }))
              }
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                required
                minLength={signup ? 10 : undefined}
                maxLength={signup ? 72 : undefined}
                pattern={
                  signup ? "(?=.*[A-Za-z])(?=.*[0-9]).{10,72}" : undefined
                }
                title={
                  signup
                    ? "Use 10–72 characters with at least one letter and one number."
                    : undefined
                }
                type={showPassword ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                value={form.password}
                onChange={(e) =>
                  setForm((x) => ({ ...x, password: e.target.value }))
                }
                placeholder={
                  signup ? "At least 10 characters" : "Enter your password"
                }
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {signup && form.password && (
            <div className="password-strength">
              <div className="password-strength-head">
                <span>Password strength</span>
                <b className={strength.className}>{strength.label}</b>
              </div>
              <div
                className={`strength-bar ${strength.className}`}
                role="progressbar"
                aria-label="Password strength"
                aria-valuemin="0"
                aria-valuemax="4"
                aria-valuenow={strengthScore}
              >
                {[1, 2, 3, 4].map((step) => (
                  <span
                    className={step <= strengthScore ? "active" : ""}
                    key={step}
                  />
                ))}
              </div>
              <div className="password-requirements">
                <span className={passwordChecks.length ? "met" : ""}>
                  <Check /> 10 or more characters
                </span>
                <span className={passwordChecks.letter ? "met" : ""}>
                  <Check /> At least one letter
                </span>
                <span className={passwordChecks.number ? "met" : ""}>
                  <Check /> At least one number
                </span>
              </div>
            </div>
          )}
          <button className="btn btn-blue" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
          </button>
          {message && <div className="form-message">{message}</div>}
          <p className="switch-auth">
            {signup ? "Already have an account?" : "New to Baakanya?"}{" "}
            <button
              type="button"
              onClick={() => {
                setSignup(!signup);
                setMessage("");
                setShowPassword(false);
                navigate(signup ? "/auth?mode=signin" : "/auth?mode=signup");
              }}
            >
              {signup ? "Log in" : "Create account"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
