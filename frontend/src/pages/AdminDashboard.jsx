import { useCallback, useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  DIVISIONS,
  DIVISION_BN,
} from "../lib/reportLabels.js";

const REPORT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "DISPUTED"];
const ROLES = ["tenant", "landlord", "property_manager", "moderator", "admin", "super_admin"];
const TABS = ["Overview", "Reports", "Users", "Reviews", "Verification", "Content", "Audit"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";
  const [tab, setTab] = useState("Overview");

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin & Moderation</h1>
        <span className="text-xs text-neutral-400">{user?.displayName} · {user?.role}</span>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${
              tab === t
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <Overview />}
      {tab === "Reports" && <ReportsTab isSuper={isSuper} />}
      {tab === "Users" && <UsersTab isSuper={isSuper} />}
      {tab === "Reviews" && <ReviewsTab />}
      {tab === "Verification" && <VerificationTab />}
      {tab === "Content" && <ContentTab isSuper={isSuper} />}
      {tab === "Audit" && <AuditTab />}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data.stats)).catch(() => setStats(null));
  }, []);
  if (!stats) return <p className="text-neutral-400">Loading…</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {Object.entries(stats).map(([k, v]) => (
        <div key={k} className="card p-4">
          <p className="text-xs text-neutral-500 capitalize">{k.replace(/([A-Z0-9])/g, " $1").trim()}</p>
          <p className="text-2xl font-bold">{v}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Reports ---------------- */
function ReportsTab({ isSuper }) {
  const [filters, setFilters] = useState({ status: "", division: "", category: "", q: "" });
  const [data, setData] = useState({ reports: [], pagination: { pages: 1, page: 1, total: 0 } });
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
        <input
          className="input !w-auto flex-1 min-w-[180px]"
          placeholder="Search title / area / text…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
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
                    {r.submittedBy && (
                      <span className="text-xs text-brand-600" title={r.submittedBy.email}>
                        by {r.submittedBy.displayName}
                      </span>
                    )}
                  </div>
                  <p className="font-medium mt-1">{r.issueTitle}</p>
                  <p className="text-xs text-neutral-400">
                    {r.area ? `${r.area}, ` : ""}{r.city}, {r.division} · {r.confirmations} confirmations ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-GB")}
                    {r.lastEditedAt ? " · edited" : ""}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{r.description}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => setEditing(r)}>Edit</button>
                  {isSuper && (
                    <button className="!py-1 !px-3 text-xs rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200" onClick={() => del(r)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager pagination={data.pagination} onPage={setPage} />
      {editing && (
        <ReportEditModal
          report={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
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
      const payload = { ...form };
      payload.overallRating = form.overallRating === "" ? undefined : Number(form.overallRating);
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
          <Field label="Title"><input className="input" value={form.issueTitle} onChange={(e) => set("issueTitle", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Division">
              <select className="input" value={form.division} onChange={(e) => set("division", e.target.value)}>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="City"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="Area"><input className="input" value={form.area} onChange={(e) => set("area", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Property name"><input className="input" value={form.propertyName} onChange={(e) => set("propertyName", e.target.value)} /></Field>
            <Field label="Overall rating (1-5)">
              <input type="number" min="1" max="5" className="input" value={form.overallRating} onChange={(e) => set("overallRating", e.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Landlord behavior">
            <textarea className="input min-h-[60px]" value={form.landlordBehavior} onChange={(e) => set("landlordBehavior", e.target.value)} />
          </Field>
          <Field label="Moderation note (internal)">
            <input className="input" value={form.moderationNote} onChange={(e) => set("moderationNote", e.target.value)} />
          </Field>
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
        <input
          className="input !w-auto flex-1 min-w-[180px]"
          placeholder="Search name / email…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
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
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Verified</th>
                <th className="py-2 pr-3">Logins</th>
                <th className="py-2 pr-3">Joined</th>
                <th className="py-2 pr-3">Actions</th>
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
                      <select
                        className="input !py-1 !w-auto text-xs"
                        value={u.role}
                        disabled={busy === u.id}
                        onChange={(e) => patch(u.id, { role: e.target.value })}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      className="text-xs underline decoration-dotted"
                      onClick={() => patch(u.id, { isEmailVerified: !u.isEmailVerified })}
                    >
                      {u.isEmailVerified ? "yes" : "no"}
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-xs text-neutral-500">
                    {u.loginCount}
                    {u.lastLoginAt ? <span className="text-neutral-400"> · {new Date(u.lastLoginAt).toLocaleDateString("en-GB")}</span> : ""}
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
      {!isSuper && <p className="text-xs text-neutral-400 mt-3">Role changes require a super admin.</p>}
    </div>
  );
}

/* ---------------- Reviews (account-based) ---------------- */
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
        <h2 className="font-semibold mb-3">Review reports ({reports.length})</h2>
        {reports.length === 0 ? <p className="text-neutral-400">No open reports.</p> : (
          <div className="space-y-2">
            {reports.map((rep) => (
              <div key={rep._id} className="card p-3 flex justify-between items-start gap-3">
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

/* ---------------- Content (dynamic sections) ---------------- */
function ContentTab({ isSuper }) {
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
  if (!isSuper && false) return null;

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
      <p className="text-sm text-neutral-500">
        Edit the JSON for each block, then Save. These drive the homepage announcement bar, hero copy and the FAQ list.
      </p>
      {msg && <p className="text-sm text-brand-700">{msg}</p>}
      {Object.entries(settings).map(([key, meta]) => (
        <div key={key} className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold">{key}</p>
              <p className="text-xs text-neutral-400">
                {meta.isDefault ? "using code default" : `edited${meta.updatedAt ? " " + new Date(meta.updatedAt).toLocaleString("en-GB") : ""}`}
              </p>
            </div>
            <button className="btn-primary !py-1.5 !px-4 text-sm" onClick={() => save(key)}>Save</button>
          </div>
          <textarea
            className="input font-mono text-xs min-h-[160px]"
            value={draft[key] ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          />
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
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs text-neutral-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
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
  return (
    {
      APPROVED: "bg-emerald-100 text-emerald-700",
      PENDING: "bg-amber-100 text-amber-800",
      REJECTED: "bg-rose-100 text-rose-700",
      HIDDEN: "bg-neutral-200 text-neutral-600",
      DISPUTED: "bg-purple-100 text-purple-700",
    }[s] || "bg-neutral-100 text-neutral-500"
  );
}
