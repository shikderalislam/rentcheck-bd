import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n, LangToggle } from "../lib/i18n.jsx";
import { dashboardPathOf } from "../lib/roles.js";

const LINKS = [
  { to: "/search", key: "nav.findHome" },
  { to: "/list-property", key: "nav.listProperty" },
  { to: "/reports", key: "nav.liveReports" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition ${
      isActive ? "text-brand-600" : "text-neutral-700 dark:text-neutral-200 hover:text-brand-600"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">R</span>
          RentCheck <span className="text-brand-600">BD</span>
        </Link>

        {/* desktop */}
        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <LangToggle />
          {user ? (
            <>
              <Link to={dashboardPathOf(user)} className="btn-secondary !py-1.5 !px-3 text-sm">
                {t("nav.dashboard")}
              </Link>
              <button onClick={handleLogout} className="text-sm text-neutral-500 hover:text-rose-600">
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary !py-1.5 !px-4 text-sm">
              {t("nav.login")}
            </Link>
          )}
        </div>

        {/* mobile trigger */}
        <div className="flex md:hidden items-center gap-2">
          <LangToggle />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="h-9 w-9 grid place-items-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-lg"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* mobile panel */}
      {open && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 animate-fade-in">
          <div className="container-page py-3 flex flex-col">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `py-2.5 text-sm font-medium ${isActive ? "text-brand-600" : "text-neutral-700 dark:text-neutral-200"}`
                }
              >
                {t(l.key)}
              </NavLink>
            ))}
            <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-2" />
            {user ? (
              <>
                <Link to={dashboardPathOf(user)} className="py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {t("nav.dashboard")}
                </Link>
                <button onClick={handleLogout} className="py-2.5 text-left text-sm font-medium text-rose-600">
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary !py-2 text-sm mt-1">{t("nav.login")}</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
