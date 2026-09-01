import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";
import RatingStars from "../components/RatingStars.jsx";
import { CATEGORY_LABELS, timeAgoBn } from "../lib/reportLabels.js";
import { useSiteSettings } from "../lib/useSiteSettings.js";

const bn = (n) => (n ?? 0).toLocaleString("bn-BD");

export default function Home() {
  const navigate = useNavigate();
  const site = useSiteSettings();
  const hero = site.homeHero || {};
  const popularAreas = hero.popularAreas?.length ? hero.popularAreas : ["মিরপুর ১০", "উত্তরা", "ধানমন্ডি"];
  const [q, setQ] = useState("");
  const [stats, setStats] = useState(null);
  const [reportStats, setReportStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [areaRows, setAreaRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/public/stats").catch(() => ({ data: { stats: null } })),
      api.get("/public/reports/stats").catch(() => ({ data: { stats: null } })),
      api.get("/public/reports", { params: { limit: 6, sort: "recent" } }).catch(() => ({ data: { reports: [] } })),
      api.get("/public/reports/by-area", { params: { limit: 6 } }).catch(() => ({ data: { areas: [] } })),
    ]).then(([s, rs, rp, ar]) => {
      setStats(s.data.stats);
      setReportStats(rs.data.stats);
      setReports(rp.data.reports || []);
      setAreaRows(ar.data.areas || []);
      setLoading(false);
    });
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/search?query=${encodeURIComponent(q)}`);
  };

  return (
    <div>
      {/* 02 Hero + 03 Search + popular areas */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container-page py-16 sm:py-20 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] whitespace-pre-line">
            {hero.title || "বাসা দেখতে যাওয়ার আগে,\nবাসাটা সম্পর্কে জেনে নিন।"}
          </h1>
          <p className="mt-4 text-neutral-600 dark:text-neutral-300 text-lg">
            {hero.subtitle ||
              "ভাড়া কত, অগ্রিম কত, বাড়িওয়ালা কেমন, পানি-গ্যাস কেমন, পরিবেশ কেমন — আগের ও বর্তমান ভাড়াটিয়াদের অভিজ্ঞতা থেকে জানুন।"}
          </p>

          <form onSubmit={onSearch} className="mt-7 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={hero.searchPlaceholder || "এলাকা, বাড়ি বা বাড়িওয়ালার নাম লিখুন..."}
              className="input flex-1"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">খুঁজুন</button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">জনপ্রিয় অনুসন্ধান:</span>
            {popularAreas.map((s) => (
              <button
                key={s}
                onClick={() => navigate(`/search?query=${encodeURIComponent(s)}`)}
                className="rounded-full border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-neutral-600 dark:text-neutral-300 hover:border-brand-400 hover:text-brand-700"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/search" className="btn-primary">🏠 বাসা খুঁজুন</Link>
            <Link to="/report-issue" className="btn-secondary">✎ অভিজ্ঞতা শেয়ার করুন</Link>
          </div>
        </div>
      </section>

      {/* নতুন বাসা খুঁজছেন? */}
      <section className="container-page py-12">
        <div className="rounded-2xl border-2 border-brand-200 dark:border-brand-800 bg-brand-50/60 dark:bg-brand-900/20 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">🏠 নতুন বাসা খুঁজছেন?</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-xl">
              ভাড়া, এলাকা, সুবিধা, বাড়িওয়ালা এবং আগের ভাড়াটিয়াদের অভিজ্ঞতা দেখে আপনার জন্য উপযুক্ত বাসা খুঁজে নিন।
            </p>
          </div>
          <Link to="/search" className="btn-primary whitespace-nowrap shrink-0">বাসা খুঁজুন →</Link>
        </div>
      </section>

      {/* 04 পরিসংখ্যান */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="container-page py-10">
          <h2 className="text-lg font-semibold mb-6">পরিসংখ্যান</h2>
          {stats && (stats.totalReports > 0 || stats.totalLandlords > 0) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
              <StatBox value={bn(stats.totalReports)} label="মোট রিপোর্ট" />
              <StatBox value={bn(stats.totalProperties)} label="মোট বাড়ি" />
              <StatBox value={bn(stats.totalLandlords)} label="মোট বাড়িওয়ালা" />
              <StatBox value={bn(stats.totalAreas)} label="মোট এলাকা" />
              <StatBox value={bn(stats.totalConfirmations)} label="কমিউনিটি কনফার্মেশন" />
              <StatBox value={reportStats?.topArea || "—"} label="শীর্ষ এলাকা" isText />
            </div>
          ) : (
            <p className="text-sm text-neutral-400">
              এখনো যথেষ্ট তথ্য জমা হয়নি। <Link to="/report-issue" className="text-brand-600 font-medium">প্রথম অভিজ্ঞতাটি লিখুন →</Link>
            </p>
          )}
        </div>
      </section>

      {/* 05 লাইভ রিপোর্ট */}
      <section className="container-page py-14">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-2xl font-extrabold">লাইভ রিপোর্ট।</h2>
          </div>
          <Link to="/reports" className="text-sm text-brand-600 font-medium">সব রিপোর্ট →</Link>
        </div>
        <p className="text-sm text-neutral-500 mb-6">
          প্রতিটি এন্ট্রি একজন ভাড়াটিয়ার অভিজ্ঞতা। অনেকগুলো রিপোর্ট একসাথে একটি বাড়ি বা এলাকার বাস্তব চিত্র বোঝায়।
        </p>

        {loading ? (
          <p className="text-neutral-400 text-sm">লোড হচ্ছে...</p>
        ) : reports.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400 text-sm">
            এখনো কোনো রিপোর্ট নেই। <Link to="/report-issue" className="text-brand-600 font-medium">প্রথম অভিজ্ঞতাটি লিখুন →</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <Link key={r.id} to={`/reports/${r.id}`} className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 hover:border-brand-300 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-neutral-400">{CATEGORY_LABELS[r.category] || r.category}</span>
                  {r.overallRating ? <RatingStars value={r.overallRating} size="text-xs" showValue={false} /> : null}
                </div>
                <p className="font-medium mt-1 line-clamp-2">{r.issueTitle}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {r.area ? `${r.area}, ` : ""}{r.city} · {timeAgoBn(r.createdAt)}
                </p>
                <p className="text-sm text-neutral-500 mt-2 line-clamp-3 flex-1">{r.excerpt}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">▲ {bn(r.confirmations)} জন নিশ্চিত করেছেন · অযাচাইকৃত</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 06 কোন এলাকায় কী ধরনের সমস্যা? */}
      <section className="border-y border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="container-page py-14">
          <h2 className="text-2xl font-extrabold mb-1">কোন এলাকায় কী ধরনের সমস্যা?</h2>
          <p className="text-sm text-neutral-500 mb-6">
            কোন এলাকার ভাড়াটিয়ারা কী ধরনের সমস্যার কথা বেশি জানিয়েছেন, তা এক নজরে দেখুন।
          </p>
          {areaRows.length === 0 ? (
            <p className="text-sm text-neutral-400">পর্যাপ্ত তথ্য পাওয়া যায়নি।</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {areaRows.map((a) => (
                <div key={`${a.area}-${a.city}`} className="card p-4">
                  <p className="font-bold">{a.area}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{a.city}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span><span className="font-semibold">{bn(a.reportCount)}</span> <span className="text-neutral-400">রিপোর্ট</span></span>
                    {a.avgRating ? (
                      <span className="flex items-center gap-1">
                        <RatingStars value={a.avgRating} size="text-xs" />
                      </span>
                    ) : null}
                  </div>
                  {a.topIssue && (
                    <p className="text-xs text-neutral-500 mt-2">
                      সবচেয়ে বেশি রিপোর্ট: <span className="font-medium">{CATEGORY_LABELS[a.topIssue] || a.topIssue}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 07 আপনার অভিজ্ঞতা শেয়ার করুন */}
      <section className="container-page py-16">
        <div className="rounded-2xl border-l-4 border-brand-600 bg-neutral-50 dark:bg-neutral-900 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">আপনার অভিজ্ঞতা অন্য একজনকে সঠিক সিদ্ধান্ত নিতে সাহায্য করতে পারে।</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">অ্যাকাউন্ট ছাড়াই, বেনামে — বাড়িওয়ালা, বাসা বা এলাকার অভিজ্ঞতা লিখুন।</p>
          </div>
          <Link to="/report-issue" className="btn-primary whitespace-nowrap shrink-0">✎ অভিজ্ঞতা শেয়ার করুন</Link>
        </div>
      </section>
    </div>
  );
}

function StatBox({ value, label, isText }) {
  return (
    <div>
      <p className={`font-extrabold ${isText ? "text-lg" : "text-3xl"}`}>{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</p>
    </div>
  );
}
