import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import {
  CATEGORY_OPTIONS,
  CATEGORY_RATING_FIELDS,
  COMMUNICATION_LABELS,
  DIVISIONS,
  DIVISION_BN,
  DURATION_LABELS,
  ISSUE_OPTIONS,
  POSITIVE_OPTIONS,
  RECOMMENDATION_LABELS,
} from "../lib/reportLabels.js";

function Stars({ value, onChange, size = "text-2xl" }) {
  return (
    <div className={`inline-flex gap-1 ${size}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s === value ? 0 : s)}
          className={s <= value ? "text-amber-500" : "text-neutral-300 dark:text-neutral-600 hover:text-amber-400"}
          aria-label={`${s} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300"
          : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-brand-400"
      }`}
    >
      {children}
    </button>
  );
}

const EMPTY = {
  category: "",
  issueTitle: "",
  propertyName: "",
  division: "",
  city: "",
  area: "",
  rentalDuration: "",
  overallRating: 0,
  categoryRatings: {},
  issues: [],
  positives: [],
  recommendation: "",
  communicationQuality: "",
  landlordBehavior: "",
  description: "",
};

export default function ReportIssue() {
  const [form, setForm] = useState(EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [published, setPublished] = useState(false);
  const [reportId, setReportId] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCat = (k, v) => setForm((f) => ({ ...f, categoryRatings: { ...f.categoryRatings, [k]: v || undefined } }));
  const toggle = (key, val) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.category || !form.issueTitle || !form.division || !form.city || !form.area) {
      setError("সমস্যার ধরন, শিরোনাম, বিভাগ, শহর ও এলাকা পূরণ করুন।");
      return;
    }
    if (!form.rentalDuration) {
      setError("আপনি কতদিন ছিলেন তা নির্বাচন করুন।");
      return;
    }
    if (!form.overallRating) {
      setError("সার্বিক রেটিং দিন।");
      return;
    }
    if (form.description.trim().length < 20) {
      setError("আপনার অভিজ্ঞতা অন্তত ২০ অক্ষরে লিখুন।");
      return;
    }
    if (!agreed) {
      setError("প্রকাশের আগে সম্মতির ঘরে টিক দিন।");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/public/reports", form);
      setPublished(!!data.published);
      setReportId(data.reportId);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "জমা দেওয়া যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container-page py-20 max-w-lg text-center">
        <div className="card p-10">
          <div className="text-4xl mb-3">✓</div>
          <h1 className="text-xl font-bold mb-2">আপনার অভিজ্ঞতা সফলভাবে জমা হয়েছে।</h1>
          <p className="text-neutral-500 text-sm mb-6">
            {published
              ? "এটি বেনামীভাবে প্রকাশিত হয়েছে। এখন অন্য ভাড়াটিয়ারা এটি দেখতে ও নিশ্চিত করতে পারবে।"
              : "সম্ভাব্য শনাক্তকারী তথ্য থাকায় প্রকাশের আগে আমাদের টিম এটি পর্যালোচনা করবে।"}
          </p>
          <div className="flex gap-3 justify-center">
            {published && reportId && (
              <Link to={`/reports/${reportId}`} className="btn-primary">রিপোর্ট দেখুন →</Link>
            )}
            <Link to="/reports" className="btn-secondary">সব রিপোর্ট</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-xl">
      <Link to="/reports" className="text-sm text-neutral-400 hover:text-brand-600">← রিপোর্টে ফিরে যান</Link>
      <h1 className="text-2xl font-bold mt-3">🏠 বাড়িওয়ালা সম্পর্কে আপনার অভিজ্ঞতা</h1>
      <p className="text-neutral-500 text-sm mt-1 mb-6">
        আপনার অভিজ্ঞতা অন্য একজন ভাড়াটিয়াকে সঠিক সিদ্ধান্ত নিতে সাহায্য করতে পারে। বেনামী — কোনো অ্যাকাউন্ট লাগবে না।
      </p>

      <form onSubmit={submit} className="card p-6 space-y-6">
        {error && <p className="text-sm text-rose-600">{error}</p>}

        {/* Property / location */}
        <fieldset className="space-y-3">
          <legend className="font-semibold">বাসা নির্বাচন</legend>
          <div>
            <label className="text-sm font-medium">বাড়ি / বিল্ডিং নাম (ঐচ্ছিক)</label>
            <input
              className="input mt-1"
              placeholder="যেমন: গ্রিন ভিউ অ্যাপার্টমেন্ট — ফ্ল্যাট নম্বর লিখবেন না"
              value={form.propertyName}
              onChange={(e) => set("propertyName", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">বিভাগ</label>
              <select className="input mt-1" value={form.division} onChange={(e) => set("division", e.target.value)}>
                <option value="">নির্বাচন করুন</option>
                {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_BN[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">শহর</label>
              <input className="input mt-1" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">এলাকা</label>
            <input
              className="input mt-1"
              placeholder="যেমন: মিরপুর ১০"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">সমস্যার ধরন</label>
            <select className="input mt-1" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">নির্বাচন করুন</option>
              {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">সংক্ষিপ্ত শিরোনাম</label>
            <input
              className="input mt-1"
              placeholder="যেমন: বাড়িওয়ালা ভালো, কিন্তু maintenance এ দেরি"
              value={form.issueTitle}
              onChange={(e) => set("issueTitle", e.target.value)}
            />
          </div>
        </fieldset>

        {/* Duration */}
        <fieldset className="space-y-2">
          <legend className="font-semibold">আপনি কতদিন এই বাসায় ছিলেন?</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DURATION_LABELS).map(([v, l]) => (
              <Chip key={v} active={form.rentalDuration === v} onClick={() => set("rentalDuration", v)}>{l}</Chip>
            ))}
          </div>
        </fieldset>

        {/* Overall rating */}
        <fieldset className="space-y-2">
          <legend className="font-semibold">সার্বিক বাড়িওয়ালার রেটিং</legend>
          <Stars value={form.overallRating} onChange={(v) => set("overallRating", v)} />
        </fieldset>

        {/* Category ratings */}
        <fieldset className="space-y-2">
          <legend className="font-semibold">বিস্তারিত রেটিং <span className="text-xs font-normal text-neutral-400">(ঐচ্ছিক)</span></legend>
          <div className="space-y-1.5">
            {CATEGORY_RATING_FIELDS.map(([k, label]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{label}</span>
                <Stars value={form.categoryRatings[k] || 0} onChange={(v) => setCat(k, v)} size="text-lg" />
              </div>
            ))}
          </div>
        </fieldset>

        {/* Issues */}
        <fieldset className="space-y-2">
          <legend className="font-semibold">কী সমস্যা হয়েছিল? <span className="text-xs font-normal text-neutral-400">(ঐচ্ছিক)</span></legend>
          <div className="flex flex-wrap gap-2">
            {ISSUE_OPTIONS.map(([v, l]) => (
              <Chip key={v} active={form.issues.includes(v)} onClick={() => toggle("issues", v)}>{l}</Chip>
            ))}
          </div>
        </fieldset>

        {/* Positives */}
        <fieldset className="space-y-2">
          <legend className="font-semibold">ভালো কী লেগেছে? <span className="text-xs font-normal text-neutral-400">(ঐচ্ছিক)</span></legend>
          <div className="flex flex-wrap gap-2">
            {POSITIVE_OPTIONS.map(([v, l]) => (
              <Chip key={v} active={form.positives.includes(v)} onClick={() => toggle("positives", v)}>{l}</Chip>
            ))}
          </div>
        </fieldset>

        {/* Communication + behavior */}
        <fieldset className="space-y-3">
          <legend className="font-semibold">যোগাযোগ ও আচরণ <span className="text-xs font-normal text-neutral-400">(ঐচ্ছিক)</span></legend>
          <select
            className="input"
            value={form.communicationQuality}
            onChange={(e) => set("communicationQuality", e.target.value)}
          >
            <option value="">যোগাযোগ কেমন ছিল?</option>
            {Object.entries(COMMUNICATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <textarea
            className="input min-h-[70px]"
            placeholder="বাড়িওয়ালা কেমন আচরণ করেছিল? কোনো নাম লিখবেন না।"
            maxLength={1000}
            value={form.landlordBehavior}
            onChange={(e) => set("landlordBehavior", e.target.value)}
          />
        </fieldset>

        {/* Description */}
        <fieldset className="space-y-2">
          <legend className="font-semibold">সংক্ষেপে আপনার অভিজ্ঞতা লিখুন</legend>
          <textarea
            className="input min-h-[120px]"
            placeholder="কী হয়েছিল? বাড়িওয়ালা বা ম্যানেজমেন্ট কীভাবে বিষয়টি handle করেছিল? অন্য একজন ভাড়াটিয়ার এই বাসাটি নেওয়ার আগে কী জানা উচিত? কোনো নাম, ফোন নম্বর বা শনাক্তকারী তথ্য উল্লেখ করবেন না।"
            maxLength={2000}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </fieldset>

        {/* Recommendation */}
        <fieldset className="space-y-2">
          <legend className="font-semibold">অন্যদের এই বাসাটি নেওয়ার পরামর্শ দেবেন? <span className="text-xs font-normal text-neutral-400">(ঐচ্ছিক)</span></legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(RECOMMENDATION_LABELS).map(([v, l]) => (
              <Chip key={v} active={form.recommendation === v} onClick={() => set("recommendation", form.recommendation === v ? "" : v)}>{l}</Chip>
            ))}
          </div>
        </fieldset>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-200">
          ব্যক্তিগত আক্রমণ, হুমকি, অশালীন ভাষা বা অন্যের ব্যক্তিগত তথ্য প্রকাশ করবেন না। বেশিরভাগ রিপোর্ট সাথে সাথে প্রকাশিত হয়; নাম/ফোন থাকলে মডারেটর পর্যালোচনা করবেন।
        </div>

        <label className="flex items-start gap-2 text-sm text-neutral-500">
          <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          আমি নিশ্চিত করছি যে এটি আমার নিজের অভিজ্ঞতার ভিত্তিতে লেখা এবং ইচ্ছাকৃতভাবে মিথ্যা তথ্য প্রদান করছি না।
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "জমা হচ্ছে..." : "অভিজ্ঞতা প্রকাশ করুন"}
        </button>
      </form>
    </div>
  );
}
