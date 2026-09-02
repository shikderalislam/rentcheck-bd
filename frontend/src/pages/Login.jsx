import { useCallback, useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { dashboardPathOf } from "../lib/roles.js";
import PasswordInput from "../components/PasswordInput.jsx";
import GoogleSignIn from "../components/GoogleSignIn.jsx";

export default function Login() {
  const { login, googleLogin, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const goDash = useCallback((u) => navigate(dashboardPathOf(u), { replace: true }), [navigate]);

  if (!loading && user) return <Navigate to={dashboardPathOf(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      goDash(await login(form.email, form.password));
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = useCallback(
    async (credential) => {
      setError("");
      try {
        goDash(await googleLogin(credential));
      } catch (err) {
        setError(err.response?.data?.message || "Google sign-in failed");
      }
    },
    [googleLogin, goDash]
  );

  return (
    <div className="container-page py-16 max-w-md animate-fade-up">
      <h1 className="text-2xl font-bold mb-6">Log in</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            className="input mt-1"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <div className="mt-1">
            <PasswordInput
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Logging in..." : "Log in"}
        </button>

        <GoogleSignIn onCredential={onGoogle} onError={(e) => setError(e.message)} />

        <p className="text-sm text-neutral-500 text-center">
          No account? <Link to="/register" className="text-brand-600 font-medium">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
