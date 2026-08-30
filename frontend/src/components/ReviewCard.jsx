import { useState } from "react";
import RatingStars from "./RatingStars.jsx";
import api from "../api/axios.js";

const REPORT_REASONS = [
  ["false_information", "Contains false information"],
  ["personal_information", "Exposes someone's personal information"],
  ["harassment_or_hate", "Harassment or hate speech"],
  ["spam_or_ad", "Spam or advertising"],
  ["wrong_property_or_landlord", "Wrong property or landlord"],
  ["conflict_of_interest", "Conflict of interest (e.g. the landlord or a competitor)"],
  ["other", "Something else"],
];

export default function ReviewCard({ review }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [reportState, setReportState] = useState("idle"); // idle | sending | done | error
  const [reportMsg, setReportMsg] = useState("");

  const submitReport = async () => {
    if (!reason) return;
    setReportState("sending");
    try {
      const { data } = await api.post(`/reviews/${review._id || review.id}/report`, { reason, detail });
      setReportState("done");
      setReportMsg(data.message || "Report received. Thank you.");
    } catch (err) {
      setReportState("error");
      setReportMsg(err.response?.data?.message || "Could not send the report.");
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{review.author?.displayName || "Tenant"}</span>
            {review.isVerified ? (
              <span className="badge bg-brand-100 text-brand-700">✓ Verified Tenant Experience</span>
            ) : (
              <span className="badge bg-neutral-100 text-neutral-500">Unverified Experience</span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">{new Date(review.createdAt).toLocaleDateString("en-GB")}</p>
        </div>
        <RatingStars value={review.overallRating} showValue={false} />
      </div>

      {review.title && <h4 className="mt-3 font-semibold">{review.title}</h4>}
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{review.body}</p>

      {(review.pros?.length > 0 || review.cons?.length > 0) && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {review.pros?.length > 0 && (
            <div>
              <p className="font-medium text-brand-700 mb-1">Positives</p>
              <ul className="list-disc list-inside text-neutral-500 space-y-0.5">
                {review.pros.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {review.cons?.length > 0 && (
            <div>
              <p className="font-medium text-rose-600 mb-1">Common concerns</p>
              <ul className="list-disc list-inside text-neutral-500 space-y-0.5">
                {review.cons.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {review.landlordResponse?.body && (
        <div className="mt-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3 text-sm">
          <p className="font-medium mb-1">Response from the landlord</p>
          <p className="text-neutral-600 dark:text-neutral-300">{review.landlordResponse.body}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
        <span>{review.helpfulVotes > 0 ? `${review.helpfulVotes} found this helpful` : ""}</span>
        {!reportOpen && reportState !== "done" && (
          <button onClick={() => setReportOpen(true)} className="hover:text-rose-600">
            Report this review
          </button>
        )}
        {reportState === "done" && <span className="text-emerald-600">{reportMsg}</span>}
      </div>

      {reportOpen && reportState !== "done" && (
        <div className="mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-2">
          <p className="text-xs text-neutral-500">
            Reporting a review flags it for a moderator. It does not delete it. Please don't add names or phone numbers.
          </p>
          <select
            className="input !py-1.5 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Choose a reason…</option>
            {REPORT_REASONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <textarea
            className="input !py-1.5 text-sm min-h-[60px]"
            placeholder="Optional: briefly explain (no personal details)"
            maxLength={1000}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          {reportState === "error" && <p className="text-xs text-rose-600">{reportMsg}</p>}
          <div className="flex gap-2">
            <button
              onClick={submitReport}
              disabled={!reason || reportState === "sending"}
              className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-50"
            >
              {reportState === "sending" ? "Sending…" : "Send report"}
            </button>
            <button onClick={() => setReportOpen(false)} className="btn-secondary !py-1.5 !px-3 text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
