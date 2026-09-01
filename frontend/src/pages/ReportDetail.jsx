import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import RatingStars from "../components/RatingStars.jsx";
import {
  CATEGORY_LABELS,
  CATEGORY_RATING_FIELDS,
  COMMUNICATION_LABELS,
  DURATION_LABELS,
  RECOMMENDATION_LABELS,
  timeAgoBn,
} from "../lib/reportLabels.js";

const LS_KEY = "rc_confirmed_reports";

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | notfound
  const [confirmed, setConfirmed] = useState(false);
  const [draft, setDraft] = useState("");
  const [commentMsg, setCommentMsg] = useState("");

  useEffect(() => {
    let ok = true;
    api
      .get(`/public/reports/${id}`)
      .then(({ data }) => {
        if (!ok) return;
        setReport(data.report);
        setState("ok");
        try {
          setConfirmed(new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]")).has(id));
        } catch {
          /* ignore */
        }
      })
      .catch(() => ok && setState("notfound"));
    return () => {
      ok = false;
    };
  }, [id]);

  const confirm = async () => {
    if (confirmed) return;
    try {
      const { data } = await api.post(`/public/reports/${id}/confirm`);
      setConfirmed(true);
      setReport((r) => ({ ...r, confirmations: data.confirmations }));
      try {
        const s = new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]"));
        s.add(id);
        localStorage.setItem(LS_KEY, JSON.stringify([...s]));
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  };

  const postComment = async () => {
    if (draft.trim().length < 3) return;
    try {
      const { data } = await api.post(`/public/reports/${id}/comments`, { body: draft.trim() });
      setCommentMsg(data.message);
      if (data.comment) setReport((r) => ({ ...r, comments: [...(r.comments || []), data.comment] }));
      setDraft("");
    } catch (err) {
      setCommentMsg(err.response?.data?.message || "মন্তব্য পাঠানো যায়নি");
    }
  };

  if (state === "loading") return <div className="container-page py-20 text-neutral-400">লোড হচ্ছে...</div>;
  if (state === "notfound")
    return (
      <div className="container-page py-20 text-center">
        <p className="text-neutral-500">রিপোর্টটি পাওয়া যায়নি বা এখনো প্রকাশিত হয়নি।</p>
        <Link to="/reports" className="btn-secondary mt-4 inline-flex">← সব রিপোর্ট</Link>
      </div>
    );

  const r = report;
  const cats = CATEGORY_RATING_FIELDS.filter(([k]) => r.categoryRatings?.[k]);

  return (
    <div className="container-page py-10 max-w-2xl">
      <Link to="/reports" className="text-sm text-neutral-400 hover:text-brand-600">← সব রিপোর্ট</Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <span className="badge bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{CATEGORY_LABELS[r.category] || r.category}</span>
          <h1 className="text-2xl font-extrabold mt-2">{r.issueTitle}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {r.propertyName ? `${r.propertyName} · ` : ""}
            {r.area ? `${r.area}, ` : ""}{r.city}, {r.division} · {timeAgoBn(r.createdAt)}
          </p>
        </div>
        {r.overallRating ? (
          <div className="text-right shrink-0">
            <RatingStars value={r.overallRating} />
            <p className="text-[11px] text-neutral-400 mt-1">সার্বিক রেটিং</p>
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] text-neutral-400">
        Tenant reported · অযাচাইকৃত অভিজ্ঞতা{r.rentalDuration ? ` · থেকেছেন ${DURATION_LABELS[r.rentalDuration]}` : ""}
      </p>

      <p className="mt-5 text-neutral-700 dark:text-neutral-200 whitespace-pre-line">{r.description}</p>

      {r.landlordBehavior && (
        <p className="mt-3 text-sm text-neutral-500 border-l-2 border-neutral-300 dark:border-neutral-700 pl-3">
          বাড়িওয়ালার আচরণ: {r.landlordBehavior}
        </p>
      )}
      {r.communicationQuality && COMMUNICATION_LABELS[r.communicationQuality] && (
        <p className="mt-2 text-xs text-neutral-400">
          যোগাযোগ: <span className="font-medium text-neutral-600 dark:text-neutral-300">{COMMUNICATION_LABELS[r.communicationQuality]}</span>
        </p>
      )}

      {cats.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {cats.map(([k, label]) => (
            <div key={k} className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2">
              <span className="text-sm text-neutral-500">{label}</span>
              <RatingStars value={r.categoryRatings[k]} size="text-xs" showValue={false} />
            </div>
          ))}
        </div>
      )}

      {r.issues?.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-rose-600 mb-1">যেসব সমস্যা হয়েছে</p>
          <div className="flex flex-wrap gap-1.5">
            {r.issues.map((i) => (
              <span key={i} className="text-xs rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 px-2 py-0.5">{i}</span>
            ))}
          </div>
        </div>
      )}

      {r.positives?.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-emerald-700 mb-1">যা ভালো লেগেছে</p>
          <div className="flex flex-wrap gap-1.5">
            {r.positives.map((i) => (
              <span key={i} className="text-xs rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">{i}</span>
            ))}
          </div>
        </div>
      )}

      {r.recommendation && RECOMMENDATION_LABELS[r.recommendation] && (
        <p className="mt-4 text-sm">
          <span className="text-neutral-400">অন্যদের পরামর্শ দেবেন? </span>
          <span className="font-semibold">{RECOMMENDATION_LABELS[r.recommendation]}</span>
        </p>
      )}

      {/* Community confirmation */}
      <div className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
        <button
          onClick={confirm}
          disabled={confirmed}
          className={`inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold ${
            confirmed ? "bg-emerald-100 text-emerald-700 cursor-default" : "bg-brand-600 text-white hover:bg-brand-500"
          }`}
        >
          {confirmed ? "✓ আপনি এই রিপোর্টটি নিশ্চিত করেছেন" : "▲ এই রিপোর্ট নিশ্চিত করুন"}
        </button>
        <p className="text-xs text-neutral-500 mt-2">
          {r.confirmations} জন ভাড়াটিয়া একই ধরনের অভিজ্ঞতার কথা জানিয়েছেন। একই ব্রাউজার থেকে একবারই নিশ্চিত করা যায়।
        </p>
      </div>

      {/* Comments */}
      <div className="mt-8">
        <p className="font-semibold mb-2">মন্তব্য ({r.comments?.length || 0})</p>
        <div className="space-y-2">
          {(r.comments || []).map((c) => (
            <div key={c.id} className="text-sm bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2">
              <p>{c.body}</p>
              <p className="text-[10px] text-neutral-400 mt-1">{timeAgoBn(c.createdAt)}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            className="input flex-1 !py-1.5 text-sm"
            placeholder="মন্তব্য লিখুন (নাম/ফোন উল্লেখ করবেন না)..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button onClick={postComment} className="btn-secondary !py-1.5 !px-3 text-sm">পাঠান</button>
        </div>
        {commentMsg && <p className="text-xs text-neutral-400 mt-1">{commentMsg}</p>}
      </div>

      <p className="mt-8 text-xs text-neutral-400">
        এই রিপোর্টে ব্যক্তিগত তথ্য, হুমকি বা মিথ্যা তথ্য আছে মনে হলে উপরের মন্তব্যে জানান — মডারেটর পর্যালোচনা করবেন।
      </p>
    </div>
  );
}
