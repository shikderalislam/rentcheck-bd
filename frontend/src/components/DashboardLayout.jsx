import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n, LangToggle } from "../lib/i18n.jsx";
import { roleGroupOf } from "../lib/roles.js";

/**
 * Shared dashboard shell: fixed sidebar + sticky header, responsive.
 * @param {{key:string,label:string,icon?:string,badge?:number}[]} sections
 */
export default function DashboardLayout({ title, sections, active, onSelect, children }) {
  const { user, logout, resendVerification, verifyEmail } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  const roleKey = roleGroupOf(user);

  const doLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMsg("");
    try {
      const v = await resendVerification();
      if (v?.devToken) {
        await verifyEmail(v.devToken);
      } else {
        setVerifyMsg("Verification link sent to your email.");
      }
    } catch {
      setVerifyMsg("Could not verify right now.");
    }
    setVerifying(false);
  };

  const NavList = () => (
    <nav className="flex-1 overflow-y-auto py-3">
      {sections.map((s) => (
        <button
          key={s.key}
          onClick={() => {
            onSelect(s.key);
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition ${
            active === s.key
              ? "bg-brand-600 text-white"
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <span className="w-5 text-center">{s.icon || "•"}</span>
          <span className="flex-1 text-left">{s.label}</span>
          {s.badge ? (
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${active === s.key ? "bg-white/20" : "bg-rose-100 text-rose-700"}`}>
              {s.badge}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-2 px-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-extrabold">R</span>
        <span className="font-extrabold tracking-tight">RentCheck <span className="text-brand-600">BD</span></span>
      </div>
      <NavList />
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 shrink-0">
        <Link to="/" className="block text-xs text-neutral-400 hover:text-brand-600 px-1 py-1">← {t("dash.backToSite")}</Link>
        <button onClick={doLogout} className="mt-1 w-full text-left text-sm px-1 py-1.5 text-rose-600 hover:text-rose-700">
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <SidebarInner />
      </aside>

      {/* mobile slide-over */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
            <SidebarInner />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="lg:pl-60">
        {/* header */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur">
          <button className="lg:hidden text-xl" onClick={() => setMobileOpen(true)} aria-label="Menu">☰</button>
          <h1 className="font-bold text-lg truncate">{title}</h1>
          <div className="flex-1" />
          <LangToggle />
          <Link to={sections.find((s) => s.key === "notifications") ? "#" : "#"} className="text-xl text-neutral-400 hover:text-neutral-700" title="Notifications">🔔</Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5"
            >
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{user?.displayName}</span>
              <span className="text-xs text-neutral-400 hidden sm:block">{t(`role.${roleKey}`)}</span>
              <span className="sm:hidden">👤</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 card p-1 text-sm z-40" onMouseLeave={() => setMenuOpen(false)}>
                <p className="px-3 py-2 text-xs text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">{user?.email}</p>
                <Link to="/" className="block px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded">{t("dash.backToSite")}</Link>
                <button onClick={doLogout} className="w-full text-left px-3 py-2 text-rose-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded">
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </div>
        </header>

        {user && !user.isEmailVerified && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-900/40 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-3 text-sm text-amber-800 dark:text-amber-200 animate-fade-in">
            <span>📧 আপনার ইমেইল ({user.email}) এখনো ভেরিফাই হয়নি।</span>
            {verifyMsg ? (
              <span className="font-medium">{verifyMsg}</span>
            ) : (
              <button onClick={handleVerify} disabled={verifying} className="font-semibold underline decoration-dotted hover:text-amber-900">
                {verifying ? "…" : "এখনই ভেরিফাই করুন"}
              </button>
            )}
          </div>
        )}

        <main className="p-4 sm:p-6 max-w-7xl">{children}</main>
      </div>
    </div>
  );
}

/* Small shared building blocks for dashboard pages */
export function StatCard({ label, value, sub }) {
  return (
    <div className="card p-4 animate-fade-up">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value ?? 0}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function Sparkline({ series = [], height = 48 }) {
  if (!series.length) return null;
  const max = Math.max(1, ...series.map((d) => d.count));
  const w = 100;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const pts = series.map((d, i) => `${i * step},${height - (d.count / max) * (height - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" />
    </svg>
  );
}
