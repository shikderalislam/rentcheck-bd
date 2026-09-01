import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import RatingStars from "../components/RatingStars.jsx";
import FaqAccordion from "../components/FaqAccordion.jsx";
import {
  CATEGORY_LABELS,
  DIVISIONS,
  DIVISION_BN,
  timeAgoBn,
} from "../lib/reportLabels.js";

const SORTS = [
  ["recent", "সর্বশেষ"],
  ["most_confirmed", "সর্বাধিক নিশ্চিত"],
  ["top_rated", "সর্বোচ্চ রেটিং"],
];

const FAQ_ITEMS = [
  { q: "এই রিপোর্টগুলো কি যাচাইকৃত?", a: "না। প্রতিটি এন্ট্রি একজন ভাড়াটিয়ার অযাচাইকৃত, ব্যক্তিগত অভিজ্ঞতা। আমরা কোনো আইনি দাবি করি না — এটি শুধু অন্য ভাড়াটিয়াদের সচেতন থাকতে সাহায্য করার একটি তথ্যভাণ্ডার।" },
  { q: "আমার তথ্য কি সংরক্ষণ করা হয়?", a: "না। নাম, ইমেইল, ফোন, কাঁচা আইপি বা ডিভাইস আইডি সংরক্ষণ করা হয় না। শুধু মৌলিক অপব্যবহার প্রতিরোধের জন্য একটি অপরিবর্তনযোগ্য, বেনামি টোকেন ব্যবহার করা হয়।" },
  { q: "‘এই রিপোর্ট নিশ্চিত করুন’ মানে কী?", a: "এর মানে ‘আমিও একই ধরনের অভিজ্ঞতার সম্মুখীন হয়েছি’। একই ব্রাউজার থেকে একটি রিপোর্ট একবারই নিশ্চিত করা যায়। এটি সত্যতার প্রমাণ নয়, বরং কতজন একই কথা বলছেন তার একটি ইঙ্গিত।" },
  { q: "প্রকাশের আগে কী হয়?", a: "সন্দেহজনক বা ঝুঁকিপূর্ণ (নাম/ফোন নম্বরযুক্ত) রিপোর্ট একজন মডারেটরের অনুমোদনের জন্য অপেক্ষায় থাকে। বাকিগুলো সাথে সাথে প্রকাশিত হয়।" },
];

const LS_KEY = "rc_confirmed_reports";
const loadConfirmed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

export default function ReportsFeed() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ division: "", category: "", sort: "recent" });
  const [confirmed, setConfirmed] = useState(loadConfirmed);

  const load = async () => {
    setLoading(true);
    const query = {};
    Object.entries(filters).forEach(([k, v]) => v && (query[k] = v));
    const [s, r] = await Promise.all([
      api.get("/public/reports/stats").catch(() => ({ data: { stats: null } })),
      api.get("/public/reports", { params: query }).catch(() => ({ data: { reports: [] } })),
    ]);
    setStats(s.data.stats);
    setReports(r.data.reports);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const confirm = async (id) => {
    if (confirmed.has(id)) return;
    try {
      const { data } = await api.post(`/public/reports/${id}/confirm`);
      const next = new Set(confirmed).add(id);
      setConfirmed(next);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      setReports((rs) => rs.map((r) => (r.id === id ? { ...r, confirmations: data.confirmations } : r)));
    } catch {
      /* ignore transient errors */
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-950">
      {/* Hero */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container-page py-12">
          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-3">লাইভ রিপোর্ট · বাড়িওয়ালা ও বাসার অভিজ্ঞতা</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight max-w-2xl">
            বাসা দেখতে যাওয়ার আগে, বাসাটা সম্পর্কে জেনে নিন।
          </h1>
          <p className="mt-3 max-w-xl text-neutral-500">
            প্রতিটি এন্ট্রি একজন ভাড়াটিয়ার অভিজ্ঞতা। অনেকগুলো রিপোর্ট একসাথে একটি বাড়ি বা এলাকার বাস্তব চিত্র বুঝতে সাহায্য করে।
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/report-issue" className="btn-primary">✎ অভিজ্ঞতা শেয়ার করুন</Link>
            <Link to="/search" className="btn-secondary">বাসা খুঁজুন →</Link>
          </div>

          {stats && (
            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm">
              <Stat value={stats.totalReports} label="মোট রিপোর্ট" />
              <Stat value={stats.totalConfirmations} label="কমিউনিটি কনফার্মেশন" />
              <Stat value={stats.recentCount} label="গত ৭ দিনে নতুন" />
              {stats.topArea && <Stat value={stats.topArea} label="শীর্ষ এলাকা" isText />}
            </div>
          )}
        </div>
      </section>

      {/* Feed */}
      <section className="container-page py-12">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-2xl font-extrabold">লাইভ রিপোর্ট।</h2>
        </div>
        <p className="text-sm text-neutral-500 mb-6">প্রতিটি এন্ট্রি একটি অযাচাইকৃত, ব্যক্তিগত অভিজ্ঞতা।</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            className="input !w-auto"
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">সব ধরনের সমস্যা</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            className="input !w-auto"
            value={filters.division}
            onChange={(e) => setFilters((f) => ({ ...f, division: e.target.value }))}
          >
            <option value="">সব বিভাগ</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>{DIVISION_BN[d]}</option>
            ))}
          </select>
          <select
            className="input !w-auto"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          >
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {(filters.category || filters.division) && (
            <button
              className="btn-secondary !py-1.5 text-sm"
              onClick={() => setFilters({ division: "", category: "", sort: filters.sort })}
            >
              ফিল্টার মুছুন
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-neutral-400">লোড হচ্ছে...</p>
        ) : reports.length === 0 ? (
          <div className="card p-10 text-center text-neutral-400">
            এখনো কোনো রিপোর্ট নেই। <Link to="/report-issue" className="text-brand-600 font-medium">প্রথম অভিজ্ঞতাটি লিখুন →</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <ReportCard key={r.id} r={r} confirmed={confirmed.has(r.id)} onConfirm={() => confirm(r.id)} />
            ))}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="container-page py-12 max-w-2xl border-t border-neutral-200 dark:border-neutral-800">
        <h2 className="text-2xl font-extrabold mb-6">প্রশ্ন।</h2>
        <FaqAccordion items={FAQ_ITEMS} />
      </section>

      {/* CTA */}
      <section className="bg-neutral-900 text-white">
        <div className="container-page py-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">আপনার অভিজ্ঞতা অন্য একজনকে সাহায্য করতে পারে।</h2>
          <p className="text-neutral-400 mt-3 text-sm">বাসা ভালো হলে বলুন। সমস্যা থাকলেও বলুন। অ্যাকাউন্ট ছাড়াই, বেনামে।</p>
          <Link to="/report-issue" className="inline-flex items-center rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-3 mt-6">
            ✎ অভিজ্ঞতা শেয়ার করুন
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label, isText }) {
  return (
    <div>
      <p className="text-xl font-extrabold">{isText ? value : `${(value ?? 0).toLocaleString("bn-BD")}`}</p>
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  );
}

function ReportCard({ r, confirmed, onConfirm }) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <span className="badge bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{CATEGORY_LABELS[r.category] || r.category}</span>
        {r.overallRating ? <RatingStars value={r.overallRating} size="text-xs" /> : null}
      </div>

      <Link to={`/reports/${r.id}`} className="mt-2 block group">
        <h3 className="font-bold group-hover:text-brand-600">{r.issueTitle}</h3>
      </Link>
      <p className="text-xs text-neutral-400 mt-0.5">
        {r.propertyName ? `${r.propertyName} · ` : ""}
        {r.area ? `${r.area}, ` : ""}{r.city} · {timeAgoBn(r.createdAt)}
      </p>

      <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-3 line-clamp-3">{r.excerpt}</p>

      {r.issues?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.issues.map((i) => (
            <span key={i} className="text-[11px] rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-neutral-500">{i}</span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-neutral-400 mt-3">অযাচাইকৃত অভিজ্ঞতা</p>

      <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
        <button
          onClick={onConfirm}
          disabled={confirmed}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
            confirmed
              ? "bg-emerald-100 text-emerald-700 cursor-default"
              : "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-600/20 dark:text-brand-300"
          }`}
        >
          {confirmed ? "✓ আপনি নিশ্চিত করেছেন" : "▲ এই রিপোর্ট নিশ্চিত করুন"}
        </button>
        <span className="text-xs text-neutral-400">{r.confirmations} জন</span>
        <Link to={`/reports/${r.id}`} className="text-xs text-neutral-500 hover:text-neutral-900 ml-auto">
          বিস্তারিত →
        </Link>
      </div>
    </div>
  );
}
