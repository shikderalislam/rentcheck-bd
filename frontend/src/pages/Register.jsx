import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { dashboardPathOf } from "../lib/roles.js";

export default function Register() {
  const { register, verifyEmail, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: "", email: "", password: "", role: "tenant" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // { user, verification }
  const [verifying, setVerifying] = useState(false);

  if (!authLoading && user && !done) return <Navigate to={dashboardPathOf(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(form);
      // Landlords must verify email before they can list — pause here.
      if (data.user.role === "landlord" && !data.user.isEmailVerified) {
        setDone(data);
      } else {
        navigate(dashboardPathOf(data.user), { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const oneClickVerify = async () => {
    const token = done?.verification?.devToken;
    if (!token) return;
    setVerifying(true);
    try {
      const u = await verifyEmail(token);
      navigate(dashboardPathOf(u), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
      setVerifying(false);
    }
  };

  if (done) {
    const v = done.verification || {};
    return (
      <div className="container-page py-16 max-w-md animate-fade-up">
        <div className="card p-6 text-center">
          <div className="text-3xl mb-2">📧</div>
          <h1 className="text-xl font-bold mb-1">ইমেইল ভেরিফাই করুন</h1>
          <p className="text-sm text-neutral-500 mb-4">
            বাড়িওয়ালা অ্যাকাউন্টে বাসা লিস্ট করার আগে <strong>{done.user.email}</strong> ঠিকানাটি ভেরিফাই করতে হবে।
          </p>
          {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
          {v.devToken ? (
            <button onClick={oneClickVerify} disabled={verifying} className="btn-primary w-full">
              {verifying ? "ভেরিফাই হচ্ছে…" : "✓ এক ক্লিকে ভেরিফাই করুন"}
            </button>
          ) : (
            <p className="text-sm text-neutral-500">আপনার ইমেইলে পাঠানো লিংকে ক্লিক করুন।</p>
          )}
          <button onClick={() => navigate(dashboardPathOf(done.user), { replace: true })} className="mt-3 text-sm text-neutral-400 hover:text-brand-600">
            পরে করব — ড্যাশবোর্ডে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-16 max-w-md animate-fade-up">
      <h1 className="text-2xl font-bold mb-6">Create your account</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div>
          <label className="text-sm font-medium">Full name</label>
          <input className="input mt-1" required value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input className="input mt-1" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input className="input mt-1" type="password" minLength={8} required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium">I am a</label>
          <select className="input mt-1" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="tenant">Tenant — share &amp; research experiences</option>
            <option value="landlord">Landlord — list my properties</option>
          </select>
          {form.role === "landlord" && (
            <p className="text-xs text-neutral-400 mt-1">Landlord accounts verify their email before listing.</p>
          )}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Creating account..." : "Sign up"}</button>
        <p className="text-sm text-neutral-500 text-center">
          Already have an account? <Link to="/login" className="text-brand-600 font-medium">Log in</Link>
        </p>
      </form>
    </div>
  );
}
