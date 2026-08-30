import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">R</span>
          RentCheck <span className="text-brand-600">BD</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          <Link to="/search" className="hover:text-brand-600">Find a property</Link>
          <Link to="/search?type=landlord" className="hover:text-brand-600">Find a landlord</Link>
          <Link to="/reports" className="hover:text-brand-600">Live reports</Link>
          {user && <Link to="/dashboard" className="hover:text-brand-600">Dashboard</Link>}
          {user && ["admin", "super_admin", "moderator"].includes(user.role) && (
            <Link to="/admin" className="hover:text-brand-600">Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden sm:block text-sm text-neutral-600 dark:text-neutral-300">{user.displayName}</span>
              <button onClick={handleLogout} className="btn-secondary !py-1.5 !px-3 text-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary !py-1.5 !px-3 text-sm">Log in</Link>
              <Link to="/register" className="btn-primary !py-1.5 !px-3 text-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
