import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Logo } from "../components/Layout";
import { supabase, supabaseAnonKey, supabaseUrl } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const OAUTH_NEXT_KEY = "baakanya-oauth-next";
const allowedNextPrefixes = ["/workspace", "/account", "/access", "/tools", "/payment"];
const appOrigin = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? window.location.origin
  : "https://baakanya.co.bw";

const safeNextPath = (value) => {
  if (!value || typeof value !== "string" || value.length > 1024) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "";
    const allowed = allowedNextPrefixes.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );
    return allowed ? `${url.pathname}${url.search}${url.hash}` : "";
  } catch {
    return "";
  }
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

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
  const [googleAvailable, setGoogleAvailable] = useState(null);
  const { user, isAdmin, roleLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [oauthNextPath] = useState(() =>
    safeNextPath(window.sessionStorage.getItem(OAUTH_NEXT_KEY)),
  );
  const nextPath = safeNextPath(params.get("next")) || oauthNextPath || "/workspace";
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
    if (!supabase) {
      setGoogleAvailable(false);
      return undefined;
    }
    const controller = new AbortController();
    fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
      credentials: "omit",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((settings) =>
        setGoogleAvailable(Boolean(settings?.external?.google)),
      )
      .catch((error) => {
        if (error.name !== "AbortError") setGoogleAvailable(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!user || roleLoading || signup) return;
    (async () => {
      window.sessionStorage.removeItem(OAUTH_NEXT_KEY);
      if (isAdmin) {
        navigate("/admin", { replace: true });
        return;
      }
      const [{ data }, pendingResult] = await Promise.all([
        supabase
          ?.from("profiles")
          .select("plan_type,trial_end_date,signup_intent")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          ?.from("payment_submissions")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle(),
      ]);
      const now = Date.now();
      const trialActive =
        data?.trial_end_date && new Date(data.trial_end_date).getTime() > now;
      const hasIntent = Boolean(data?.signup_intent);
      if (!trialActive && pendingResult?.data?.id) {
        navigate("/access?step=review", { replace: true });
        return;
      }
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

  const continueWithGoogle = async () => {
    if (!supabase || busy || googleAvailable !== true) return;
    setBusy(true);
    setMessage("");
    window.sessionStorage.setItem(OAUTH_NEXT_KEY, nextPath);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appOrigin}/auth`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      window.sessionStorage.removeItem(OAUTH_NEXT_KEY);
      setBusy(false);
      setMessage("Google sign-in could not be started. Please try again.");
    }
  };

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
          emailRedirectTo: `${appOrigin}/verified.html`,
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
          <button
            type="button"
            className="google-auth-button"
            onClick={continueWithGoogle}
            disabled={busy || googleAvailable !== true}
          >
            <GoogleIcon />
            {busy
              ? "Opening Google…"
              : googleAvailable === false
                ? "Google sign-in unavailable"
                : googleAvailable === null
                  ? "Checking Google sign-in…"
                  : "Continue with Google"}
          </button>
          <p className="auth-legal-note">
            By continuing with Google, you agree to our{" "}
            <Link to="/terms">Terms of Use</Link> and acknowledge our{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
          <div className="auth-divider" aria-hidden="true">
            <span>or continue with email</span>
          </div>
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
          <button type="submit" className="btn btn-blue" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
          </button>
          <p className="auth-legal-note">
            {signup ? "By creating an account" : "By continuing"}, you agree to
            our <Link to="/terms">Terms of Use</Link> and acknowledge our{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
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
