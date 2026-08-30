import { useEffect, useState } from "react";
import api from "../api/axios.js";

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
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [reviewReports, setReviewReports] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [reportQueue, setReportQueue] = useState([]);
  const [audit, setAudit] = useState([]);

  const load = async () => {
    const [s, q, rr, v, rq, a] = await Promise.all([
      api.get("/admin/stats").catch(() => ({ data: { stats: null } })),
      api.get("/admin/reviews/queue").catch(() => ({ data: { reviews: [] } })),
      api.get("/admin/review-reports/queue").catch(() => ({ data: { reports: [] } })),
      api.get("/admin/verifications/queue").catch(() => ({ data: { items: [] } })),
      api.get("/admin/reports/queue").catch(() => ({ data: { reports: [] } })),
      api.get("/admin/audit", { params: { limit: 40 } }).catch(() => ({ data: { entries: [] } })),
    ]);
    setStats(s.data.stats);
    setQueue(q.data.reviews);
    setReviewReports(rr.data.reports);
    setVerifications(v.data.items);
    setReportQueue(rq.data.reports);
    setAudit(a.data.entries);
  };

  useEffect(() => {
    load();
  }, []);

  const moderate = async (id, decision) => {
    try {
      await api.put(`/admin/reviews/${id}/moderate`, { decision });
    } catch (err) {
      alert(err.response?.data?.message || "That moderation step is not allowed from the current state.");
    }
    load();
  };

  const resolveReport = async (id, action) => {
    await api.put(`/admin/review-reports/${id}/resolve`, { action });
    load();
  };

  const verify = async (id, decision) => {
    await api.put(`/rentals/${id}/verify`, { decision });
    load();
  };

  const moderateAnonReport = async (id, decision) => {
    await api.put(`/admin/reports/${id}/moderate`, { decision });
    load();
  };

  return (
    <div className="container-page py-10 space-y-10">
      <h1 className="text-2xl font-bold">Admin & Moderation</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="card p-4">
              <p className="text-xs text-neutral-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</p>
              <p className="text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="font-semibold text-lg mb-3">Review moderation queue</h2>
        {queue.length === 0 ? (
          <p className="text-neutral-400">Nothing pending. Nice.</p>
        ) : (
          <div className="space-y-3">
            {queue.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium">
                      {r.property?.name} — {r.author?.displayName}{" "}
                      <span className="badge bg-neutral-100 text-neutral-500 ml-1">{r.status}</span>
                    </p>
                    <p className="text-sm text-neutral-500 mt-1">{r.body}</p>
                    <div className="text-xs mt-1 space-x-3">
                      {r.moderation?.flags?.length > 0 && (
                        <span className="text-amber-600">
                          Flags: {r.moderation.flags.join(", ")} (risk {r.moderation.riskScore})
                        </span>
                      )}
                      {r.moderation?.openReportCount > 0 && (
                        <span className="text-rose-600">{r.moderation.openReportCount} open reports</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                    <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => moderate(r._id, "APPROVED")}>Approve</button>
                    <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => moderate(r._id, "REJECTED")}>Reject</button>
                    <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => moderate(r._id, "HIDDEN")}>Hide</button>
                    {r.status !== "UNDER_REVIEW" && (
                      <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => moderate(r._id, "UNDER_REVIEW")}>Take</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">Review reports</h2>
        {reviewReports.length === 0 ? (
          <p className="text-neutral-400">No open reports.</p>
        ) : (
          <div className="space-y-3">
            {reviewReports.map((rep) => (
              <div key={rep._id} className="card p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium">
                      <span className="badge bg-rose-100 text-rose-700 mr-2">{REASON_LABELS[rep.reason] || rep.reason}</span>
                      {rep.review?.property?.name || "review"}{" "}
                      <span className="text-xs text-neutral-400">
                        by {rep.reporter?.displayName || "anonymous"}
                      </span>
                    </p>
                    {rep.detail && <p className="text-sm text-neutral-500 mt-1">“{rep.detail}”</p>}
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">Review: {rep.review?.body}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Review status: {rep.review?.status} · {rep.review?.moderation?.openReportCount || 0} open on this review
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => resolveReport(rep._id, "ACTIONED")}>Actioned</button>
                    <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => resolveReport(rep._id, "DISMISSED")}>Dismiss</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">Anonymous issue reports (pending)</h2>
        {reportQueue.length === 0 ? (
          <p className="text-neutral-400">Nothing pending.</p>
        ) : (
          <div className="space-y-3">
            {reportQueue.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{r.issueTitle}</p>
                    <p className="text-xs text-neutral-400">{r.city}, {r.division} · {r.category}</p>
                    <p className="text-sm text-neutral-500 mt-1">{r.description}</p>
                    {r.moderation?.riskFlags?.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">Flags: {r.moderation.riskFlags.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => moderateAnonReport(r._id, "APPROVED")}>Approve</button>
                    <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => moderateAnonReport(r._id, "REJECTED")}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">Rental verification queue</h2>
        {verifications.length === 0 ? (
          <p className="text-neutral-400">Nothing pending.</p>
        ) : (
          <div className="space-y-3">
            {verifications.map((v) => (
              <div key={v._id} className="card p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{v.tenant?.displayName} → {v.property?.name}</p>
                  <p className="text-xs text-neutral-400">{v.evidence?.length || 0} evidence file(s) submitted</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => verify(v._id, "VERIFIED")}>Verify</button>
                  <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => verify(v._id, "REJECTED")}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">Audit log</h2>
        {audit.length === 0 ? (
          <p className="text-neutral-400">No entries yet.</p>
        ) : (
          <div className="card divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
            {audit.map((e) => (
              <div key={e._id} className="p-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-neutral-400">
                  {new Date(e.createdAt).toLocaleString("en-GB")}
                </span>
                <span className="font-medium">{e.action}</span>
                <span className="text-neutral-500">
                  {e.entityType}
                  {e.fromState || e.toState ? ` · ${e.fromState || "—"} → ${e.toState || "—"}` : ""}
                </span>
                <span className="text-xs text-neutral-400">
                  {e.actor?.displayName ? `by ${e.actor.displayName} (${e.actor.role})` : "by system"}
                </span>
                {e.reason && <span className="text-xs text-neutral-500 italic">“{e.reason}”</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
