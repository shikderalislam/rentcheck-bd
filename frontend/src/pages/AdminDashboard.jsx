import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useI18n } from "../lib/i18n.jsx";
import DashboardLayout, { StatCard, Sparkline } from "../components/DashboardLayout.jsx";
import { CATEGORY_LABELS, CATEGORY_OPTIONS, DIVISIONS, DIVISION_BN } from "../lib/reportLabels.js";

const REPORT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "DISPUTED"];
const ROLES = ["tenant", "landlord", "property_manager", "moderator", "admin", "super_admin"];
const REASON_LABELS = {
  false_information: "False information",
  personal_information: "Exposes personal info",
  harassment_or_hate: "Harassment / hate",
  spam_or_ad: "Spam / ad",
  wrong_property_or_landlord: "Wrong property/landlord",
  conflict_of_interest: "Conflict of interest",
  other: "Other",
};

export default function AdminDashboard() {
  const { t } = useI18n();
  const [active, setActive] = useState("overview");
  const sections = [
    { key: "overview", label: t("dash.overview"), icon: "▦" },
    { key: "reports", label: t("dash.allReports"), icon: "🗒" },
    { key: "users", label: t("dash.users"), icon: "👥" },
    { key: "reviews", label: "Reviews", icon: "★" },
    { key: "verification", label: t("dash.verification"), icon: "✔" },
    { key: "content", label: t("dash.content"), icon: "✎" },
    { key: "audit", label: t("dash.audit"), icon: "🕓" },
  ];
  return (
    <DashboardLayout title={t("role.SUPER_ADMIN")} sections={sections} active={active} onSelect={setActive}>
      {active === "overview" && <Overview onGo={setActive} />}
      {active === "reports" && <ReportsTab isSuper />}
      {active === "users" && <UsersTab isSuper />}
      {active === "reviews" && <ReviewsTab />}
      {active === "verification" && <VerificationTab />}
      {active === "content" && <ContentTab />}
      {active === "audit" && <AuditTab />}
    </DashboardLayout>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ onGo }) {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [recent, setRecent] = useState([]);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data.stats)).catch(() => {});
    api.get("/admin/reports/timeseries", { params: { days: 30 } }).then((r) => setSeries(r.data.series)).catch(() => {});
    api.get("/admin/reports", { params: { limit: 6 } }).then((r) => setRecent(r.data.reports)).catch(() => {});
    api.get("/public/reports/by-area", { params: { limit: 6 } }).then((r) => setAreas(r.data.areas)).catch(() => {});
  }, []);

  if (!stats) return <p className="text-neutral-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total reports" value={stats.reports} sub={`+${stats.reports7d} in 7d`} />
        <StatCard label="Published" value={stats.reportsApproved} />
        <StatCard label="Pending" value={stats.reportsPending} />
        <StatCard label="Confirmations" value={stats.reportConfirmations} />
        <StatCard label="Users" value={stats.users} sub={`+${stats.newUsers7d} in 7d`} />
        <StatCard label="Landlords" value={stats.landlords} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">Reports — last 30 days</p>
            <span className="text-xs text-neutral-400">{series.reduce((a, b) => a + b.count, 0)} total</span>
          </div>
          <div className="text-brand-500"><Sparkline series={series} height={60} /></div>
        </div>
        <div className="card p-4">
          <p className="font-semibold text-sm mb-2">Needs attention</p>
          <ul className="text-sm space-y-1.5">
            <Li label="Review queue" n={stats.pendingReviews + stats.needsReview} onClick={() => onGo("reviews")} />
            <Li label="Reported content" n={stats.openReviewReports} onClick={() => onGo("reviews")} />
            <Li label="Pending verifications" n={stats.pendingVerifications} onClick={() => onGo("verification")} />
            <Li label="Suspended users" n={stats.suspended} onClick={() => onGo("users")} />
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="font-semibold text-sm mb-3">Recent reports</p>
          {recent.length === 0 ? (
            <p className="text-sm text-neutral-400">None yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r._id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{r.issueTitle}</span>
                  <span className={`badge shrink-0 ${statusCls(r.status)}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
          <button className="text-xs text-brand-600 mt-3" onClick={() => onGo("reports")}>All reports →</button>
        </div>
        <div className="card p-4">
          <p className="font-semibold text-sm mb-3">Top areas by reports</p>
          {areas.length === 0 ? (
            <p className="text-sm text-neutral-400">Not enough data.</p>
          ) : (
            <div className="space-y-2">
              {areas.map((a) => (
                <div key={`${a.area}-${a.city}`} className="flex items-center justify-between text-sm">
                  <span>{a.area}, {a.city}</span>
                  <span className="text-neutral-400">
                    {a.reportCount} · {a.topIssue ? CATEGORY_LABELS[a.topIssue] || a.topIssue : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const Li = ({ label, n, onClick }) => (
  <li className="flex items-center justify-between">
    <button className="hover:text-brand-600" onClick={onClick}>{label}</button>
    <span className={`text-xs rounded-full px-1.5 py-0.5 ${n > 0 ? "bg-rose-100 text-rose-700" : "bg-neutral-100 text-neutral-400"}`}>{n}</span>
  </li>
);

/* ---------------- Reports ---------------- */
function ReportsTab({ isSuper }) {
  const [filters, setFilters] = useState({ status: "", division: "", category: "", q: "" });
  const [data, setData] = useState({ reports: [], pagination: {} });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

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

  const del = async (r) => {
    if (!window.confirm(`Permanently delete this report?\n\n"${r.issueTitle}"`)) return;
    await api.delete(`/admin/reports/${r._id}`, { data: { reason: "admin dashboard delete" } });
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input !w-auto flex-1 min-w-[180px]" placeholder="Search title / area / text…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <select className="input !w-auto" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input !w-auto" value={filters.division} onChange={(e) => setFilters((f) => ({ ...f, division: e.target.value }))}>
          <option value="">All divisions</option>
          {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_BN[d]}</option>)}
        </select>
        <select className="input !w-auto" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : data.reports.length === 0 ? (
        <p className="text-neutral-400">No reports match.</p>
      ) : (
        <div className="space-y-2">
          {data.reports.map((r) => (
            <div key={r._id} className="card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${statusCls(r.status)}`}>{r.status}</span>
                    <span className="text-xs text-neutral-400">{CATEGORY_LABELS[r.category] || r.category}</span>
                    {r.submittedBy && <span className="text-xs text-brand-600" title={r.submittedBy.email}>by {r.submittedBy.displayName}</span>}
                  </div>
                  <p className="font-medium mt-1">{r.issueTitle}</p>
                  <p className="text-xs text-neutral-400">
                    {r.area ? `${r.area}, ` : ""}{r.city}, {r.division} · {r.confirmations} confirmations · {new Date(r.createdAt).toLocaleDateString("en-GB")}
                    {r.lastEditedAt ? " · edited" : ""}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{r.description}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => setEditing(r)}>Edit</button>
                  {isSuper && (
                    <button className="!py-1 !px-3 text-xs rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200" onClick={() => del(r)}>Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager pagination={data.pagination} onPage={setPage} />
      {editing && <ReportEditModal report={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ReportEditModal({ report, onClose, onSaved }) {
  const [form, setForm] = useState({
    issueTitle: report.issueTitle || "",
    category: report.category || "",
    division: report.division || "",
    city: report.city || "",
    area: report.area || "",
    propertyName: report.propertyName || "",
    overallRating: report.overallRating || "",
    description: report.description || "",
    landlordBehavior: report.landlordBehavior || "",
    status: report.status,
    moderationNote: report.moderation?.note || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const payload = { ...form, overallRating: form.overallRating === "" ? undefined : Number(form.overallRating) };
      await api.patch(`/admin/reports/${report._id}`, payload);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="card p-5 w-full max-w-lg mt-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Edit report</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
        {err && <p className="text-sm text-rose-600 mb-2">{err}</p>}
        <div className="space-y-3 text-sm">
          <F label="Title"><input className="input" value={form.issueTitle} onChange={(e) => set("issueTitle", e.target.value)} /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Status">
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <F label="Category">
              <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </F>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <F label="Division">
              <select className="input" value={form.division} onChange={(e) => set("division", e.target.value)}>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </F>
            <F label="City"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></F>
            <F label="Area"><input className="input" value={form.area} onChange={(e) => set("area", e.target.value)} /></F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Property name"><input className="input" value={form.propertyName} onChange={(e) => set("propertyName", e.target.value)} /></F>
            <F label="Overall rating (1-5)"><input type="number" min="1" max="5" className="input" value={form.overallRating} onChange={(e) => set("overallRating", e.target.value)} /></F>
          </div>
          <F label="Description"><textarea className="input min-h-[100px]" value={form.description} onChange={(e) => set("description", e.target.value)} /></F>
          <F label="Landlord behavior"><textarea className="input min-h-[60px]" value={form.landlordBehavior} onChange={(e) => set("landlordBehavior", e.target.value)} /></F>
          <F label="Moderation note (internal)"><input className="input" value={form.moderationNote} onChange={(e) => set("moderationNote", e.target.value)} /></F>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary !py-1.5 !px-4 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary !py-1.5 !px-4 text-sm">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Users ---------------- */
function UsersTab({ isSuper }) {
  const [filters, setFilters] = useState({ q: "", role: "", suspended: "" });
  const [data, setData] = useState({ users: [], pagination: {} });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { page, limit: 20 };
    Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
    const { data } = await api.get("/admin/users", { params }).catch(() => ({ data: { users: [], pagination: {} } }));
    setData(data);
    setLoading(false);
  }, [filters, page]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [filters]);

  const patch = async (id, body) => {
    setBusy(id);
    try {
      await api.patch(`/admin/users/${id}`, body);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || "Update failed");
    }
    setBusy(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input !w-auto flex-1 min-w-[180px]" placeholder="Search name / email…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <select className="input !w-auto" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input !w-auto" value={filters.suspended} onChange={(e) => setFilters((f) => ({ ...f, suspended: e.target.value }))}>
          <option value="">Any state</option>
          <option value="true">Suspended only</option>
        </select>
      </div>

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-2 pr-3">User</th><th className="py-2 pr-3">Role</th><th className="py-2 pr-3">Verified</th>
                <th className="py-2 pr-3">Logins</th><th className="py-2 pr-3">Joined</th><th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{u.displayName}{u.isSuspended && <span className="ml-2 badge bg-rose-100 text-rose-700">suspended</span>}</p>
                    <p className="text-xs text-neutral-400">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                  </td>
                  <td className="py-2 pr-3">
                    {isSuper ? (
                      <select className="input !py-1 !w-auto text-xs" value={u.role} disabled={busy === u.id} onChange={(e) => patch(u.id, { role: e.target.value })}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : u.role}
                  </td>
                  <td className="py-2 pr-3">
                    <button className="text-xs underline decoration-dotted" onClick={() => patch(u.id, { isEmailVerified: !u.isEmailVerified })}>
                      {u.isEmailVerified ? "yes" : "no"}
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-xs text-neutral-500">
                    {u.loginCount}{u.lastLoginAt ? <span className="text-neutral-400"> · {new Date(u.lastLoginAt).toLocaleDateString("en-GB")}</span> : ""}
                  </td>
                  <td className="py-2 pr-3 text-xs text-neutral-400">{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="py-2 pr-3">
                    <button
                      className={`!py-1 !px-2 text-xs rounded-lg ${u.isSuspended ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      disabled={busy === u.id}
                      onClick={() => patch(u.id, { isSuspended: !u.isSuspended })}
                    >
                      {u.isSuspended ? "Reinstate" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager pagination={data.pagination} onPage={setPage} />
    </div>
  );
}

/* ---------------- Reviews ---------------- */
function ReviewsTab() {
  const [queue, setQueue] = useState([]);
  const [reports, setReports] = useState([]);
  const load = useCallback(async () => {
    const [q, rr] = await Promise.all([
      api.get("/admin/reviews/queue").catch(() => ({ data: { reviews: [] } })),
      api.get("/admin/review-reports/queue").catch(() => ({ data: { reports: [] } })),
    ]);
    setQueue(q.data.reviews);
    setReports(rr.data.reports);
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
  const resolve = async (id, action) => {
    await api.put(`/admin/review-reports/${id}/resolve`, { action });
    load();
  };
  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-semibold mb-3">Moderation queue ({queue.length})</h2>
        {queue.length === 0 ? <p className="text-neutral-400">Nothing pending.</p> : (
          <div className="space-y-2">
            {queue.map((r) => (
              <div key={r._id} className="card p-3 flex justify-between items-start gap-3">
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
        )}
      </section>
      <section>
        <h2 className="font-semibold mb-3">Reported content ({reports.length})</h2>
        {reports.length === 0 ? <p className="text-neutral-400">No open reports.</p> : (
          <div className="space-y-2">
            {reports.map((rep) => (
              <div key={rep._id} className="card p-3 flex justify-between items-start gap-3">
                <div>
                  <p className="font-medium"><span className="badge bg-rose-100 text-rose-700 mr-2">{REASON_LABELS[rep.reason] || rep.reason}</span>{rep.review?.property?.name || "review"}</p>
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
        )}
      </section>
    </div>
  );
}

/* ---------------- Verification ---------------- */
function VerificationTab() {
  const [items, setItems] = useState([]);
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
  return items.length === 0 ? (
    <p className="text-neutral-400">Nothing pending.</p>
  ) : (
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

/* ---------------- Content ---------------- */
function ContentTab() {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api.get("/admin/site-settings").then((r) => {
      setSettings(r.data.settings);
      const d = {};
      for (const [k, v] of Object.entries(r.data.settings)) d[k] = JSON.stringify(v.value, null, 2);
      setDraft(d);
    });
  }, []);
  if (!settings) return <p className="text-neutral-400">Loading…</p>;
  const save = async (key) => {
    setMsg("");
    let value;
    try {
      value = JSON.parse(draft[key]);
    } catch {
      setMsg(`${key}: invalid JSON`);
      return;
    }
    try {
      await api.put(`/admin/site-settings/${key}`, { value });
      setMsg(`${key} saved.`);
    } catch (e) {
      setMsg(e.response?.data?.message || "Save failed");
    }
  };
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">Edit the JSON for each block, then Save. Drives the homepage announcement, hero copy and FAQ.</p>
      {msg && <p className="text-sm text-brand-700">{msg}</p>}
      {Object.entries(settings).map(([key, meta]) => (
        <div key={key} className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold">{key}</p>
              <p className="text-xs text-neutral-400">{meta.isDefault ? "using code default" : "edited"}</p>
            </div>
            <button className="btn-primary !py-1.5 !px-4 text-sm" onClick={() => save(key)}>Save</button>
          </div>
          <textarea className="input font-mono text-xs min-h-[160px]" value={draft[key] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Audit ---------------- */
function AuditTab() {
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    api.get("/admin/audit", { params: { limit: 60 } }).then((r) => setEntries(r.data.entries)).catch(() => setEntries([]));
  }, []);
  return entries.length === 0 ? (
    <p className="text-neutral-400">No entries.</p>
  ) : (
    <div className="card divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
      {entries.map((e) => (
        <div key={e._id} className="p-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-neutral-400">{new Date(e.createdAt).toLocaleString("en-GB")}</span>
          <span className="font-medium">{e.action}</span>
          <span className="text-neutral-500">{e.entityType}{e.fromState || e.toState ? ` · ${e.fromState || "—"} → ${e.toState || "—"}` : ""}</span>
          <span className="text-xs text-neutral-400">{e.actor?.displayName ? `by ${e.actor.displayName}` : "by system"}</span>
          {e.reason && <span className="text-xs italic text-neutral-500">“{e.reason}”</span>}
        </div>
      ))}
    </div>
  );
}

/* ---------------- shared ---------------- */
function F({ label, children }) {
  return <label className="block"><span className="text-xs text-neutral-500">{label}</span><div className="mt-1">{children}</div></label>;
}
function Pager({ pagination, onPage }) {
  const pages = pagination?.pages || 1;
  const page = pagination?.page || 1;
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-3 mt-4 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary !py-1 !px-3 disabled:opacity-40">Prev</button>
      <span className="text-neutral-400">Page {page} / {pages} · {pagination.total} total</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-secondary !py-1 !px-3 disabled:opacity-40">Next</button>
    </div>
  );
}
function statusCls(s) {
  return {
    APPROVED: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-800",
    REJECTED: "bg-rose-100 text-rose-700",
    HIDDEN: "bg-neutral-200 text-neutral-600",
    DISPUTED: "bg-purple-100 text-purple-700",
  }[s] || "bg-neutral-100 text-neutral-500";
}
