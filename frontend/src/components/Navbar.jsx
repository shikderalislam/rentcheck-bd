import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { SUPPORT_URL } from "../lib/reportLabels.js";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/85 dark:bg-neutral-950/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">R</span>
          RentCheck <span className="text-brand-600">BD</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          <Link to="/search" className="hover:text-brand-600">বাসা খুঁজুন</Link>
          <Link to="/search?type=area" className="hover:text-brand-600">এলাকা</Link>
          <Link to="/search?type=landlord" className="hover:text-brand-600">বাড়িওয়ালা</Link>
          <Link to="/reports" className="hover:text-brand-600">লাইভ রিপোর্ট</Link>
          {user && ["admin", "super_admin", "moderator"].includes(user.role) && (
            <Link to="/admin" className="hover:text-brand-600">Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:border-amber-400 hover:text-amber-700"
            title="Support করুন"
          >
            ☕ Support
          </a>
          {user ? (
            <button onClick={handleLogout} className="btn-secondary !py-1.5 !px-3 text-sm">Logout</button>
          ) : (
            <Link to="/login" className="btn-secondary !py-1.5 !px-3 text-sm">Login</Link>
          )}
          <Link to="/report-issue" className="btn-primary !py-1.5 !px-3 text-sm whitespace-nowrap">
            ✎ অভিজ্ঞতা শেয়ার করুন
          </Link>
        </div>
      </div>
    </header>
  );
}
