import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios.js";
import { useI18n } from "../../lib/i18n.jsx";
import DashboardLayout, { StatCard } from "../../components/DashboardLayout.jsx";
import { CATEGORY_LABELS } from "../../lib/reportLabels.js";

const REPORT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "DISPUTED"];
const statusCls = (s) =>
  ({ APPROVED: "bg-emerald-100 text-emerald-700", PENDING: "bg-amber-100 text-amber-800", REJECTED: "bg-rose-100 text-rose-700", HIDDEN: "bg-neutral-200 text-neutral-600", DISPUTED: "bg-purple-100 text-purple-700" }[s] || "bg-neutral-100 text-neutral-500");

export default function ModeratorDashboard() {
  const { t } = useI18n();
  const [active, setActive] = useState("overview");
  const sections = [
    { key: "overview", label: t("dash.overview"), icon: "▦" },
    { key: "queue", label: t("dash.reviewQueue"), icon: "⧗" },
    { key: "reports", label: t("dash.allReports"), icon: "🗒" },
    { key: "reported", label: t("dash.reportReports"), icon: "⚑" },
    { key: "verification", label: t("dash.verification"), icon: "✔" },
  ];
  return (
    <DashboardLayout title={t("role.MODERATOR")} sections={sections} active={active} onSelect={setActive}>
      {active === "overview" && <Overview />}
      {active === "queue" && <ReviewQueue />}
      {active === "reports" && <AllReports />}
      {active === "reported" && <ReportedContent />}
      {active === "verification" && <Verification />}
    </DashboardLayout>
  );
}

function Overview() {
  const { t } = useI18n();
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setS(r.data.stats)).catch(() => setS(null));
  }, []);
  if (!s) return <p className="text-neutral-400">{t("dash.loading")}</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard label="Pending reports" value={s.reportsPending} />
      <StatCard label="Review queue" value={s.pendingReviews + s.needsReview} />
      <StatCard label="Reported content" value={s.openReviewReports} />
      <StatCard label="Pending verifications" value={s.pendingVerifications} />
      <StatCard label="Reports (7d)" value={s.reports7d} />
    </div>
  );
}

function ReviewQueue() {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    const { data } = await api.get("/admin/reviews/queue").catch(() => ({ data: { reviews: [] } }));
    setRows(data.reviews);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const moderate = async (id, decision) => {
    try {
      await api.put(`/admin/reviews/${id}/moderate`, { decision });
    } catch (e) {
      alert(e.response?.data?.message || "Not allowed from this state");
    }
    load();
  };
  if (!rows) return <p className="text-neutral-400">{t("dash.loading")}</p>;
  if (!rows.length) return <div className="card p-8 text-center text-neutral-400">{t("dash.nothing")}</div>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r._id} className="card p-4 flex justify-between items-start gap-3">
          <div>
            <p className="font-medium">{r.property?.name} — {r.author?.displayName} <span className="badge bg-neutral-100 text-neutral-500">{r.status}</span></p>
            <p className="text-sm text-neutral-500 mt-1">{r.body}</p>
            {r.moderation?.openReportCount > 0 && <p className="text-xs text-rose-600 mt-1">{r.moderation.openReportCount} open reports</p>}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 justify-end">
            <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => moderate(r._id, "APPROVED")}>Approve</button>
            <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => moderate(r._id, "REJECTED")}>Reject</button>
            <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => moderate(r._id, "HIDDEN")}>Hide</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AllReports() {
  const { t } = useI18n();
  const [filters, setFilters] = useState({ status: "", q: "" });
  const [data, setData] = useState({ reports: [], pagination: {} });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { page, limit: 20 };
    Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
    const { data } = await api.get("/admin/reports", { params }).catch(() => ({ data: { reports: [], pagination: {} } }));
    setData(data);
    setLoading(false);
  }, [filters, page]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [filters]);

  const setStatus = async (r, status) => {
    await api.patch(`/admin/reports/${r._id}`, { status, moderationNote: "moderator action" });
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input !w-auto flex-1 min-w-[180px]" placeholder="Search…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <select className="input !w-auto" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? (
        <p className="text-neutral-400">{t("dash.loading")}</p>
      ) : !data.reports.length ? (
        <div className="card p-8 text-center text-neutral-400">{t("dash.nothing")}</div>
      ) : (
        <div className="space-y-2">
          {data.reports.map((r) => (
            <div key={r._id} className="card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`badge ${statusCls(r.status)}`}>{r.status}</span>
                  <span className="text-xs text-neutral-400 ml-2">{CATEGORY_LABELS[r.category] || r.category}</span>
                  <p className="font-medium mt-1">{r.issueTitle}</p>
                  <p className="text-xs text-neutral-400">{r.area ? `${r.area}, ` : ""}{r.city}, {r.division}</p>
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{r.description}</p>
                </div>
                <select
                  className="input !py-1 !w-auto text-xs shrink-0"
                  value={r.status}
                  onChange={(e) => setStatus(r, e.target.value)}
                >
                  {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pager pagination={data.pagination} onPage={setPage} />
    </div>
  );
}

function ReportedContent() {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    const { data } = await api.get("/admin/review-reports/queue").catch(() => ({ data: { reports: [] } }));
    setRows(data.reports);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const resolve = async (id, action) => {
    await api.put(`/admin/review-reports/${id}/resolve`, { action });
    load();
  };
  if (!rows) return <p className="text-neutral-400">{t("dash.loading")}</p>;
  if (!rows.length) return <div className="card p-8 text-center text-neutral-400">{t("dash.nothing")}</div>;
  return (
    <div className="space-y-2">
      {rows.map((rep) => (
        <div key={rep._id} className="card p-4 flex justify-between items-start gap-3">
          <div>
            <p className="font-medium"><span className="badge bg-rose-100 text-rose-700 mr-2">{rep.reason}</span>{rep.review?.property?.name || "review"}</p>
            {rep.detail && <p className="text-sm text-neutral-500 mt-1">“{rep.detail}”</p>}
            <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{rep.review?.body}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => resolve(rep._id, "ACTIONED")}>Actioned</button>
            <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => resolve(rep._id, "DISMISSED")}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Verification() {
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const load = useCallback(async () => {
    const { data } = await api.get("/admin/verifications/queue").catch(() => ({ data: { items: [] } }));
    setItems(data.items);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const verify = async (id, decision) => {
    await api.put(`/rentals/${id}/verify`, { decision });
    load();
  };
  if (!items) return <p className="text-neutral-400">{t("dash.loading")}</p>;
  if (!items.length) return <div className="card p-8 text-center text-neutral-400">{t("dash.nothing")}</div>;
  return (
    <div className="space-y-2">
      {items.map((v) => (
        <div key={v._id} className="card p-3 flex justify-between items-center">
          <div>
            <p className="font-medium">{v.tenant?.displayName} → {v.property?.name}</p>
            <p className="text-xs text-neutral-400">{v.evidence?.length || 0} evidence file(s)</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => verify(v._id, "VERIFIED")}>Verify</button>
            <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => verify(v._id, "REJECTED")}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

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
