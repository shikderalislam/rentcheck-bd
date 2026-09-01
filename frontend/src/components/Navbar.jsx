import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n, LangToggle } from "../lib/i18n.jsx";
import { dashboardPathOf } from "../lib/roles.js";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">R</span>
          RentCheck <span className="text-brand-600">BD</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-700 dark:text-neutral-200">
          <Link to="/search" className="hover:text-brand-600">{t("nav.findHome")}</Link>
          <Link to="/search?type=area" className="hover:text-brand-600">{t("nav.areas")}</Link>
          <Link to="/search?type=landlord" className="hover:text-brand-600">{t("nav.landlords")}</Link>
          <Link to="/reports" className="hover:text-brand-600">{t("nav.liveReports")}</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LangToggle />
          {user ? (
            <>
              <Link to={dashboardPathOf(user)} className="btn-secondary !py-1.5 !px-3 text-sm">{t("nav.dashboard")}</Link>
              <button onClick={handleLogout} className="hidden sm:inline text-sm text-neutral-500 hover:text-rose-600">{t("nav.logout")}</button>
            </>
          ) : (
            <Link to="/login" className="btn-secondary !py-1.5 !px-3 text-sm">{t("nav.login")}</Link>
          )}
          <Link to="/report-issue" className="btn-primary !py-1.5 !px-3 text-sm whitespace-nowrap">
            {t("nav.shareExperience")}
          </Link>
        </div>
      </div>
    </header>
  );
}
