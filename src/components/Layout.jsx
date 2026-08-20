import { Globe2, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/i18n";
export function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="logo-mark">
        <img src={`${import.meta.env.BASE_URL}baakanya-mark.png`} alt="" />
      </span>
      <span>Baakanya</span>
    </Link>
  );
}
export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { language, toggle, t } = useLanguage();
  const close = () => setOpen(false);
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
            <NavLink to="/pricing" onClick={close}>
              {t.pricing}
            </NavLink>
            <button className="language" onClick={toggle}>
              <Globe2 size={16} />
              {language === "en" ? "Setswana" : "English"}
            </button>
            {user ? (
              <>
                <NavLink to="/workspace" onClick={close}>
                  {t.dashboard}
                </NavLink>
                <button className="btn btn-small btn-ink" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/auth" onClick={close}>
                  {t.login}
                </NavLink>
                <NavLink
                  className="btn btn-small btn-blue"
                  to="/auth?mode=signup"
                  onClick={close}
                >
                  {t.start}
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <div className="container footer-grid">
          <div>
            <Logo />
            <p>Documents, sorted. Botswana-style.</p>
          </div>
          <div>
            <b>Product</b>
            <Link to="/tools">Document tools</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div>
            <b>Support</b>
            <a href="mailto:hello@baakanya.co.bw">hello@baakanya.co.bw</a>
            <span>Gaborone, Botswana</span>
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
