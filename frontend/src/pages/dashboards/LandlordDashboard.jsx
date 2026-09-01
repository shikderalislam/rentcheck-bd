import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useI18n } from "../../lib/i18n.jsx";
import DashboardLayout, { StatCard } from "../../components/DashboardLayout.jsx";
import RatingStars from "../../components/RatingStars.jsx";
import PropertyForm from "../../components/PropertyForm.jsx";
import { timeAgoBn } from "../../lib/reportLabels.js";

export default function LandlordDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [active, setActive] = useState("overview");
  const sections = [
    { key: "overview", label: t("dash.overview"), icon: "▦" },
    { key: "properties", label: t("dash.myProperties"), icon: "🏢" },
    { key: "add", label: t("dash.addProperty"), icon: "＋" },
    { key: "reviews", label: t("dash.reviewsAboutMe"), icon: "★" },
    { key: "verification", label: t("dash.verification"), icon: "✔" },
  ];
  return (
    <DashboardLayout title={t("role.LANDLORD")} sections={sections} active={active} onSelect={setActive}>
      <Body active={active} user={user} setActive={setActive} />
    </DashboardLayout>
  );
}

function Body({ active, setActive }) {
  const { t } = useI18n();
  const [summary, setSummary] = useState(undefined);
  const reload = useCallback(() => {
    api.get("/landlord/summary").then((r) => setSummary(r.data.hasProfile ? r.data : { hasProfile: false })).catch(() => setSummary({ hasProfile: false }));
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  if (summary === undefined) return <p className="text-neutral-400">{t("dash.loading")}</p>;

  if (active === "add") return <AddProperty onDone={() => { reload(); setActive("properties"); }} />;
  if (active === "properties") return <MyProperties onAdd={() => setActive("add")} />;
  if (active === "reviews") return <Reviews />;

  if (!summary.hasProfile) {
    return (
      <div className="card p-8 max-w-lg">
        <p className="font-semibold mb-1">No landlord profile yet</p>
        <p className="text-sm text-neutral-500 mb-4">
          Add your first property and a landlord profile is created for you automatically. A super admin verifies it later
          so you can post public responses to reviews.
        </p>
        <button className="btn-primary" onClick={() => setActive("add")}>＋ {t("dash.addProperty")}</button>
      </div>
    );
  }

  if (active === "overview") return <Overview data={summary} onAdd={() => setActive("add")} />;
  if (active === "verification") return <Verification landlord={summary.landlord} />;
  return null;
}

function Overview({ data, onAdd }) {
  const { t } = useI18n();
  const s = data.summary;
  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-lg font-bold">{data.landlord.name}</p>
          <p className="text-xs text-neutral-500">
            {data.landlord.isVerified ? "✔ Verified landlord" : "Not verified"} · reputation {data.landlord.reputation?.overall || 0} / 5
          </p>
        </div>
        <button className="btn-primary !py-1.5 !px-4 text-sm" onClick={onAdd}>＋ {t("dash.addProperty")}</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label={t("dash.myProperties")} value={s.properties} />
        <StatCard label="Reviews" value={s.reviews} />
        <StatCard label="Avg rating" value={s.avgRating ?? "—"} />
        <StatCard label="Response rate" value={`${s.responseRate}%`} />
        <StatCard label="Pending responses" value={s.pendingResponses} />
      </div>
      {data.recentReviews.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-3">Recent reviews</h2>
          <div className="space-y-2">
            {data.recentReviews.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <RatingStars value={r.overallRating} size="text-xs" />
                  <span className="text-xs text-neutral-400">{r.property?.name} · {timeAgoBn(r.createdAt)}</span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2" data-no-translate>{r.body}</p>
                {!r.hasResponse && <p className="text-xs text-amber-700 mt-1">No response yet</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MyProperties({ onAdd }) {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api.get("/landlord/properties").then((r) => setRows(r.data.properties)).catch(() => setRows([]));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const del = async (p) => {
    if (!window.confirm(`Remove this listing?\n\n"${p.name}"`)) return;
    await api.delete(`/landlord/properties/${p.id}`);
    load();
  };

  if (rows === null) return <p className="text-neutral-400">{t("dash.loading")}</p>;

  if (editing) {
    return <PropertyForm initial={editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">{t("dash.myProperties")} ({rows.length})</h2>
        <button className="btn-primary !py-1.5 !px-4 text-sm" onClick={onAdd}>＋ {t("dash.addProperty")}</button>
      </div>
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-neutral-400">
          {t("dash.nothing")} <button className="text-brand-600 font-medium" onClick={onAdd}>＋ {t("dash.addProperty")}</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id} className="card p-4 flex flex-col">
              {p.coverPhoto ? (
                <img src={p.coverPhoto} alt="" className="h-32 w-full object-cover rounded-lg mb-2" />
              ) : null}
              <div className="flex items-center gap-2">
                <span className={`badge ${p.listingStatus === "available" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                  {p.listingStatus}
                </span>
                {p.isVerified && <span className="badge bg-brand-100 text-brand-700">✔</span>}
              </div>
              <p className="font-semibold mt-1" data-no-translate>{p.name}</p>
              <p className="text-xs text-neutral-500">{p.address?.area}, {p.address?.city}</p>
              <p className="text-sm mt-1">৳{(p.rentDetails?.monthly || p.rent?.min || 0).toLocaleString()} / month</p>
              <div className="mt-3 flex gap-2 text-xs">
                <button className="btn-secondary !py-1 !px-2" onClick={() => setEditing(p)}>Edit</button>
                <Link to={`/properties/${p.slug}`} className="btn-secondary !py-1 !px-2">View</Link>
                <button className="!py-1 !px-2 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200" onClick={() => del(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddProperty({ onDone }) {
  return <PropertyForm onDone={onDone} onCancel={onDone} />;
}

function Reviews() {
  const { t } = useI18n();
  const [data, setData] = useState({ reviews: [], pagination: {} });
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [respondTo, setRespondTo] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { limit: 30 };
    if (filter) params.responded = filter;
    const { data } = await api.get("/landlord/reviews", { params }).catch(() => ({ data: { reviews: [], pagination: {} } }));
    setData(data);
    setLoading(false);
  }, [filter]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All reviews</option>
          <option value="false">Needs a response</option>
          <option value="true">Responded</option>
        </select>
      </div>
      {loading ? (
        <p className="text-neutral-400">{t("dash.loading")}</p>
      ) : !data.reviews.length ? (
        <div className="card p-8 text-center text-neutral-400">{t("dash.nothing")}</div>
      ) : (
        <div className="space-y-2">
          {data.reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <RatingStars value={r.overallRating} size="text-xs" />
                <span className="text-xs text-neutral-400">
                  {r.isVerified ? "✓ Verified tenant · " : ""}{r.property?.name} · {timeAgoBn(r.createdAt)}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Tenant report — anonymous</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-200 mt-1" data-no-translate>{r.body}</p>
              {r.landlordResponse ? (
                <div className="mt-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3 text-sm">
                  <p className="font-medium mb-1">Your response</p>
                  <p className="text-neutral-600 dark:text-neutral-300">{r.landlordResponse.body}</p>
                </div>
              ) : (
                <button className="btn-secondary !py-1.5 !px-3 text-xs mt-3" onClick={() => setRespondTo(r)}>Respond</button>
              )}
            </div>
          ))}
        </div>
      )}
      {respondTo && <RespondModal review={respondTo} onClose={() => setRespondTo(null)} onSaved={() => { setRespondTo(null); load(); }} />}
    </div>
  );
}

function RespondModal({ review, onClose, onSaved }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (body.trim().length < 3) return;
    setSaving(true);
    setErr("");
    try {
      await api.post(`/reviews/${review.id}/response`, { body: body.trim() });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not post response");
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md mt-16" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-2">Public response</h3>
        <p className="text-xs text-neutral-500 mb-2">Shown publicly under the review, labelled as the landlord's response. No names or phone numbers.</p>
        {err && <p className="text-sm text-rose-600 mb-2">{err}</p>}
        <textarea className="input min-h-[120px]" maxLength={1500} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="btn-secondary !py-1.5 !px-4 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary !py-1.5 !px-4 text-sm">{saving ? "Posting…" : "Post response"}</button>
        </div>
      </div>
    </div>
  );
}

function Verification({ landlord }) {
  return (
    <div className="card p-6 max-w-lg">
      <p className="font-semibold mb-1">Verification status</p>
      <p className="text-2xl font-bold mt-1">{landlord.isVerified ? "✔ Verified" : "Not verified"}</p>
      <p className="text-sm text-neutral-500 mt-3">
        {landlord.isVerified
          ? "Your ownership/management has been confirmed. You can post public responses to reviews."
          : "A super admin reviews landlord claims manually. Until then you can list properties and view reviews, but not post public responses."}
      </p>
    </div>
  );
}
