import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useI18n } from "../../lib/i18n.jsx";
import DashboardLayout, { StatCard } from "../../components/DashboardLayout.jsx";
import RatingStars from "../../components/RatingStars.jsx";
import { CATEGORY_LABELS, timeAgoBn } from "../../lib/reportLabels.js";

const statusCls = (s) =>
  ({
    APPROVED: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-800",
    REJECTED: "bg-rose-100 text-rose-700",
    HIDDEN: "bg-neutral-200 text-neutral-600",
    DISPUTED: "bg-purple-100 text-purple-700",
  }[s] || "bg-neutral-100 text-neutral-500");

export default function UserDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [active, setActive] = useState("overview");

  const sections = [
    { key: "overview", label: t("dash.overview"), icon: "▦" },
    { key: "reports", label: t("dash.myReports"), icon: "🗒" },
    { key: "confirmations", label: t("dash.myConfirmations"), icon: "▲" },
    { key: "settings", label: t("dash.settings"), icon: "⚙" },
  ];

  return (
    <DashboardLayout title={t("nav.dashboard")} sections={sections} active={active} onSelect={setActive}>
      {active === "overview" && <Overview user={user} onGo={setActive} />}
      {active === "reports" && <MyReports />}
      {active === "confirmations" && <MyConfirmations />}
      {active === "settings" && <Settings user={user} />}
    </DashboardLayout>
  );
}

function Overview({ user, onGo }) {
  const { t } = useI18n();
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get("/me/summary").then((r) => setS(r.data.summary)).catch(() => setS(null));
  }, []);
  return (
    <div>
      <p className="text-neutral-500 mb-6">{t("dash.welcome")}, <span className="font-medium text-neutral-800 dark:text-neutral-100">{user?.displayName}</span></p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label={t("dash.myReports")} value={s?.reportsTotal} />
        <StatCard label={t("status.APPROVED")} value={s?.reportsApproved} />
        <StatCard label={t("status.PENDING")} value={s?.reportsPending} />
        <StatCard label={t("dash.myConfirmations")} value={s?.confirmations} />
        <StatCard label="Reviews" value={s?.reviews} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/report-issue" className="btn-primary">{t("nav.shareExperience")}</Link>
        <button className="btn-secondary" onClick={() => onGo("reports")}>{t("dash.myReports")}</button>
      </div>
    </div>
  );
}

function MyReports() {
  const { t } = useI18n();
  const [data, setData] = useState({ reports: [], pagination: {} });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get("/me/reports", { params: { page, limit: 20 } }).catch(() => ({ data: { reports: [], pagination: {} } }));
    setData(data);
    setLoading(false);
  }, [page]);
  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async (r) => {
    if (!window.confirm(`Withdraw this report?\n\n"${r.issueTitle}"`)) return;
    await api.delete(`/me/reports/${r.id}`);
    load();
  };

  if (loading) return <p className="text-neutral-400">{t("dash.loading")}</p>;
  if (!data.reports.length)
    return (
      <div className="card p-8 text-center text-neutral-400">
        {t("dash.nothing")} <Link to="/report-issue" className="text-brand-600 font-medium">{t("nav.shareExperience")}</Link>
      </div>
    );

  return (
    <div className="space-y-2">
      {data.reports.map((r) => (
        <div key={r.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${statusCls(r.status)}`}>{t(`status.${r.status}`)}</span>
                <span className="text-xs text-neutral-400">{CATEGORY_LABELS[r.category] || r.category}</span>
                {r.overallRating ? <RatingStars value={r.overallRating} size="text-xs" showValue={false} /> : null}
              </div>
              <p className="font-medium mt-1" data-no-translate>{r.issueTitle}</p>
              <p className="text-xs text-neutral-400">
                {r.area ? `${r.area}, ` : ""}{r.city} · {r.confirmations} confirmations · {timeAgoBn(r.createdAt)}
              </p>
              <p className="text-sm text-neutral-500 mt-1 line-clamp-2" data-no-translate>{r.description}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {["PENDING", "APPROVED", "DISPUTED"].includes(r.status) && (
                <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => setEditing(r)}>Edit</button>
              )}
              <button
                className="!py-1 !px-3 text-xs rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"
                onClick={() => withdraw(r)}
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      ))}
      <Pager pagination={data.pagination} onPage={setPage} />
      {editing && <EditModal report={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditModal({ report, onClose, onSaved }) {
  const [form, setForm] = useState({
    issueTitle: report.issueTitle || "",
    area: report.area || "",
    city: report.city || "",
    overallRating: report.overallRating || "",
    description: report.description || "",
    landlordBehavior: report.landlordBehavior || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const payload = { ...form, overallRating: form.overallRating === "" ? undefined : Number(form.overallRating) };
      const { data } = await api.patch(`/me/reports/${report.id}`, payload);
      if (data.reentryToModeration) alert("Saved. Because this report was live, it will go back through moderation before re-publishing.");
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="card p-5 w-full max-w-md mt-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Edit report</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
        {err && <p className="text-sm text-rose-600 mb-2">{err}</p>}
        {report.status === "APPROVED" && (
          <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded p-2 mb-3">
            This report is live. Editing sends it back to moderation.
          </p>
        )}
        <div className="space-y-3 text-sm">
          <L label="Title"><input className="input" value={form.issueTitle} onChange={(e) => set("issueTitle", e.target.value)} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Area"><input className="input" value={form.area} onChange={(e) => set("area", e.target.value)} /></L>
            <L label="City"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></L>
          </div>
          <L label="Overall rating (1-5)">
            <input type="number" min="1" max="5" className="input" value={form.overallRating} onChange={(e) => set("overallRating", e.target.value)} />
          </L>
          <L label="Experience"><textarea className="input min-h-[100px]" value={form.description} onChange={(e) => set("description", e.target.value)} /></L>
          <L label="Landlord behavior"><textarea className="input min-h-[60px]" value={form.landlordBehavior} onChange={(e) => set("landlordBehavior", e.target.value)} /></L>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary !py-1.5 !px-4 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary !py-1.5 !px-4 text-sm">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function MyConfirmations() {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get("/me/confirmations").then((r) => setRows(r.data.confirmations)).catch(() => setRows([]));
  }, []);
  if (!rows) return <p className="text-neutral-400">{t("dash.loading")}</p>;
  if (!rows.length) return <div className="card p-8 text-center text-neutral-400">{t("dash.nothing")}</div>;
  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <Link key={c.id} to={`/reports/${c.report.id}`} className="card p-4 block hover:border-brand-300">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{c.report.issueTitle}</p>
              <p className="text-xs text-neutral-400">
                {c.report.area ? `${c.report.area}, ` : ""}{c.report.city} · confirmed {timeAgoBn(c.confirmedAt)}
              </p>
            </div>
            <span className={`badge ${statusCls(c.report.status)}`}>{t(`status.${c.report.status}`)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Settings({ user }) {
  return (
    <div className="card p-5 max-w-md space-y-2 text-sm">
      <Row k="Name" v={user?.displayName} />
      <Row k="Email" v={user?.email} />
      <Row k="Role" v={user?.role} />
      <Row k="Email verified" v={user?.isEmailVerified ? "yes" : "no"} />
      <p className="text-xs text-neutral-400 pt-2">Profile editing and privacy controls are coming soon.</p>
    </div>
  );
}

const Row = ({ k, v }) => (
  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 py-1.5 last:border-0">
    <span className="text-neutral-400">{k}</span>
    <span className="font-medium">{v || "—"}</span>
  </div>
);
const L = ({ label, children }) => (
  <label className="block"><span className="text-xs text-neutral-500">{label}</span><div className="mt-1">{children}</div></label>
);
function Pager({ pagination, onPage }) {
  const pages = pagination?.pages || 1;
  const page = pagination?.page || 1;
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-3 mt-4 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary !py-1 !px-3 disabled:opacity-40">Prev</button>
      <span className="text-neutral-400">Page {page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-secondary !py-1 !px-3 disabled:opacity-40">Next</button>
    </div>
  );
}
