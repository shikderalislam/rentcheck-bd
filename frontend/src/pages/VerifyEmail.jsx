import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { dashboardPathOf } from "../lib/roles.js";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState("working"); // working | ok | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState("error");
      setMsg("No verification token in the link.");
      return;
    }
    verifyEmail(token)
      .then((u) => {
        setState("ok");
        setTimeout(() => navigate(dashboardPathOf(u), { replace: true }), 1200);
      })
      .catch((e) => {
        setState("error");
        setMsg(e.response?.data?.message || "This link is invalid or has already been used.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-page py-24 max-w-md text-center animate-fade-up">
      <div className="card p-8">
        {state === "working" && <p className="text-neutral-500">ভেরিফাই হচ্ছে…</p>}
        {state === "ok" && (
          <>
            <div className="text-4xl mb-2">✓</div>
            <p className="font-semibold">ইমেইল ভেরিফাই হয়েছে</p>
            <p className="text-sm text-neutral-500 mt-1">ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে…</p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="text-4xl mb-2">⚠️</div>
            <p className="font-semibold">ভেরিফাই করা যায়নি</p>
            <p className="text-sm text-neutral-500 mt-1">{msg}</p>
            <Link to="/login" className="btn-secondary mt-4 inline-flex">লগইনে যান</Link>
          </>
        )}
      </div>
    </div>
  );
}
