import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-16 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Log in</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div>
          <label className="text-sm font-medium">Email</label>
          <input className="input mt-1" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input className="input mt-1" type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Logging in..." : "Log in"}</button>
        <p className="text-sm text-neutral-500 text-center">
          No account? <Link to="/register" className="text-brand-600 font-medium">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
