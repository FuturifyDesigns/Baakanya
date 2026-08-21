import { Globe2, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/i18n";
export function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="logo-mark">
        <img src={`${import.meta.env.BASE_URL}baakanya-mark.png?v=2`} alt="" />
      </span>
      <span>Baakanya</span>
    </Link>
  );
}
export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { language, toggle, t } = useLanguage();
  const navigate = useNavigate();
  const close = () => setOpen(false);
  const handleSignOut = async () => {
    close();
    await signOut();
    navigate("/", { replace: true });
  };
  return (
    <div className="site">
      <header className="nav-wrap">
        <nav className="nav container">
          <Logo />
          <button
            className="menu-btn"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </button>
          <div className={`nav-links ${open ? "open" : ""}`}>
            <NavLink to="/tools" onClick={close}>
              {t.tools}
            </NavLink>
            <NavLink to="/how-it-works" onClick={close}>
              {t.how}
            </NavLink>
            <NavLink to="/about" onClick={close}>
              {t.about}
            </NavLink>
            <NavLink to="/pricing" onClick={close}>
              {t.pricing}
            </NavLink>
            <button className="language" onClick={toggle}>
              <Globe2 size={16} />
              {language === "en" ? "Setswana" : "English"}
            </button>
            {user ? (
              <>
                <NavLink to={isAdmin ? "/admin" : "/workspace"} onClick={close}>
                  {isAdmin ? "Admin" : t.dashboard}
                </NavLink>
                <button className="btn btn-small btn-ink" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <NavLink
                className="btn btn-small btn-blue"
                to="/auth?mode=signup"
                onClick={close}
              >
                {t.getStarted}
              </NavLink>
            )}
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <div className="container footer-lead">
          <div>
            <span className="micro-label light">READY WHEN YOU ARE</span>
            <h2>Your next document can be done today.</h2>
          </div>
          <Link className="btn btn-white" to="/auth?mode=signup">
            Get started
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="container footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>
              Professional documents and practical file tools, built for the
              work you need to finish.
            </p>
            <span>7 days free · No card required</span>
          </div>
          <div>
            <b>Explore</b>
            <Link to="/tools">Document tools</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div>
            <b>Company</b>
            <Link to="/about">About Baakanya</Link>
            <Link to="/auth?mode=signup">Create an account</Link>
            <Link to="/workspace">Workspace</Link>
          </div>
          <div>
            <b>Contact</b>
            <a href="mailto:futurifydesigns@gmail.com">
              futurifydesigns@gmail.com
            </a>
            <span>Gaborone · Botswana</span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Baakanya</span>
          <span>
            Built by{" "}
            <a
              href="https://futurifydesigns.com/"
              target="_blank"
              rel="noreferrer"
            >
              Futurify Designs
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
