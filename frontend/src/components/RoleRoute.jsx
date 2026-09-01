import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleGroupOf, dashboardPathOf } from "../lib/roles.js";

// Guards a route to one or more role groups. Unauthenticated -> /login.
// Authenticated but wrong group -> their own dashboard (never a 403 dead end).
export default function RoleRoute({ groups, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container-page py-20 text-neutral-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (groups && !groups.includes(roleGroupOf(user))) {
    return <Navigate to={dashboardPathOf(user)} replace />;
  }
  return children;
}
