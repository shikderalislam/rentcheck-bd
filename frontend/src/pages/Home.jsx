import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";
import RatingStars from "../components/RatingStars.jsx";
import RentCalculator from "../components/RentCalculator.jsx";
import AreaCard from "../components/AreaCard.jsx";
import { stockPhotoUrl } from "../utils/stockPhoto.js";

const POPULAR_SEARCHES = ["মিরপুর ১০", "উত্তরা", "ধানমন্ডি", "বনানী", "মোহাম্মদপুর", "চট্টগ্রাম"];

const REPORT_CATEGORY_LABELS = {
  deposit_not_returned: "জামানত ফেরত দেয়নি",
  unsafe_conditions: "অনিরাপদ বাসস্থান",
  harassment_privacy: "প্রাইভেসি লঙ্ঘন / হয়রানি",
  hidden_charges: "লুকানো চার্জ",
  agreement_violation: "চুক্তি ভঙ্গ",
  maintenance_ignored: "মেরামত করা হয়নি",
  eviction_threat: "উচ্ছেদের হুমকি",
  other: "অন্যান্য",
};

const HOW_IT_WORKS = [
  { title: "আপনার অভিজ্ঞতা লিখুন", desc: "কোনো অ্যাকাউন্ট লাগবে না। নাম দেখানো দরকার নেই।" },
  { title: "আমরা তথ্য সুরক্ষিত রাখি", desc: "কোনো কাঁচা আইপি সংরক্ষণ হয় না। পুরোপুরি বেনামি।" },
  { title: "তথ্য সবার জন্য উন্মুক্ত", desc: "যেন নতুন ভাড়াটিয়ারা সঠিক সিদ্ধান্ত নিতে পারে।" },
  { title: "একসাথে গড়ি বৃহৎ ভাড়া বাজার", desc: "ভালো বাড়িওয়ালা, ভালো ভাড়াটিয়া, ভালো বাসা।" },
];

export default function Home() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [areas, setAreas] = useState([]);
  const [reportStats, setReportStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/public/stats").catch(() => ({ data: { stats: null } })),
      api.get("/public/recent-experiences", { params: { limit: 5 } }).catch(() => ({ data: { reviews: [] } })),
      api.get("/public/top-areas", { params: { limit: 6 } }).catch(() => ({ data: { areas: [] } })),
      api.get("/public/reports/stats").catch(() => ({ data: { stats: null } })),
      api.get("/public/reports", { params: { limit: 6, sort: "recent" } }).catch(() => ({ data: { reports: [] } })),
    ]).then(([s, r, a, rs, rp]) => {
      setStats(s.data.stats);
      setRecent(r.data.reviews);
      setAreas(a.data.areas);
      setReportStats(rs.data.stats);
      setReports(rp.data.reports || []);
      setLoading(false);
    });
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/search?query=${encodeURIComponent(q)}`);
  };

  return (
    <div>
      <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
        <div className="container-page py-2 flex items-center justify-center text-center gap-2">
          <span>বাসা নেওয়ার আগে জানুন। সচেতন ভাড়াটিয়া, ভালো শহর, ভালো বাংলাদেশ।</span>
        </div>
      </div>

      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white dark:from-neutral-900 dark:to-neutral-950">
        <div className="container-page py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                বাসা দেখতে যাওয়ার আগে, <br />
                বাসাটা সম্পর্কে জেনে নিন।
              </h1>
              <p className="mt-4 text-neutral-600 dark:text-neutral-300">
                ভাড়া কত, অগ্রিম কত, বাড়িওয়ালা কেমন, পানি-গ্যাস কেমন, পরিবেশ কেমন — আগের ও বর্তমান ভাড়াটিয়াদের অভিজ্ঞতা থেকে জানুন।
              </p>

              <form onSubmit={onSearch} className="mt-6 flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="এলাকা, বাড়ি বা বাড়িওয়ালার নাম লিখুন..."
                  className="input flex-1"
                />
                <button type="submit" className="btn-primary whitespace-nowrap">খুঁজুন</button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-neutral-400">জনপ্রিয় অনুসন্ধান:</span>
                {POPULAR_SEARCHES.map((s) => (
                  <button
                    key={s}
                    onClick={() => navigate(`/search?query=${encodeURIComponent(s)}`)}
                    className="rounded-full border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-neutral-600 dark:text-neutral-300 hover:border-brand-400 hover:text-brand-700"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/search" className="btn-primary">বাসা খুঁজুন →</Link>
                <Link to="/dashboard" className="btn-secondary">✎ অভিজ্ঞতা শেয়ার করুন</Link>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <img
                src={stockPhotoUrl("dhaka-skyline-hero", 800, 640)}
                alt="Dhaka apartment buildings"
                className="h-80 w-full rounded-3xl object-cover"
              />
              <div className="absolute top-4 right-4 card p-4 max-w-[220px]">
                <p className="text-sm font-medium">একজন ভাড়াটিয়ার অভিজ্ঞতা হতে পারে আরেকজনের বড় সহায়তা 💚</p>
                <ul className="mt-3 space-y-1.5 text-xs text-neutral-500">
                  <li>💰 ভাড়া কত?</li>
                  <li>🏠 বাড়িওয়ালা কেমন?</li>
                  <li>📄 অগ্রিম কত নেয়?</li>
                  <li>🚰 পানি-গ্যাস কেমন?</li>
                  <li>🌳 এলাকার পরিবেশ কেমন?</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live report teaser — anonymous landlord issue reports */}
      <section className="bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40">
        <div className="container-page py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-rose-800 dark:text-rose-200">সাম্প্রতিক রিপোর্ট — বাড়িওয়ালা সংক্রান্ত সমস্যা</p>
            <p className="text-sm text-rose-700/70 dark:text-rose-300/70 mt-0.5">বেনামী। কোনো অ্যাকাউন্ট লাগবে না। প্রকাশের আগে মডারেশন করা হয়।</p>
          </div>
          {reportStats && (
            <div className="flex flex-wrap gap-6 text-sm text-rose-800 dark:text-rose-200">
              <span><strong>৳{reportStats.totalAmount.toLocaleString()}</strong> মোট দাবিকৃত</span>
              <span><strong>{reportStats.totalCount}</strong> রিপোর্ট</span>
              <span><strong>{reportStats.rejectedPct}%</strong> প্রত্যাখ্যাত</span>
            </div>
          )}
          <div className="flex gap-2">
            <Link to="/reports" className="btn-secondary !py-1.5 !px-3 text-sm">লাইভ রিপোর্ট দেখুন</Link>
            <Link to="/report-issue" className="btn-primary !py-1.5 !px-3 text-sm !bg-rose-600 hover:!bg-rose-700">রিপোর্ট করুন →</Link>
          </div>
        </div>
      </section>

      {/* Anonymous landlord-issue reports — live feed teaser on the homepage */}
      <section className="container-page py-14">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="font-semibold text-lg">সাম্প্রতিক বেনামী রিপোর্ট</h2>
          </div>
          <Link to="/reports" className="text-sm text-brand-600 font-medium">সব রিপোর্ট →</Link>
        </div>
        <p className="text-sm text-neutral-500 mb-6">
          বাড়িওয়ালা সংক্রান্ত সমস্যা নিয়ে ভাড়াটিয়াদের অযাচাইকৃত, সম্মিলিত অভিজ্ঞতা। যেকেউ অ্যাকাউন্ট ছাড়াই লিখতে ও ভোট দিতে পারে।
        </p>

        {loading ? (
          <p className="text-neutral-400 text-sm">লোড হচ্ছে...</p>
        ) : reports.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400 text-sm">
            এখনো কোনো রিপোর্ট নেই। <Link to="/report-issue" className="text-brand-600 font-medium">প্রথম রিপোর্টটি লিখুন →</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <Link
                key={r.id}
                to="/reports"
                className="card p-4 hover:border-rose-300 flex flex-col"
              >
                <p className="text-xs text-neutral-400">{REPORT_CATEGORY_LABELS[r.category] || r.category}</p>
                <p className="font-medium mt-0.5 line-clamp-2">{r.issueTitle}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {r.area ? `${r.area}, ` : ""}{r.city}, {r.division}
                </p>
                <p className="text-sm text-neutral-500 mt-2 line-clamp-3 flex-1">{r.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-neutral-400">
                  {r.claimedAmount > 0 && <span className="font-semibold text-neutral-600 dark:text-neutral-300">৳{r.claimedAmount.toLocaleString()}</span>}
                  <span className="text-emerald-600">▲ {r.upvotes}</span>
                  <span className="text-rose-600">▼ {r.downvotes}</span>
                  <span className="ml-auto">💬 {r.comments?.length || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="container-page py-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-semibold text-brand-700">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> লাইভ Rental Ledger
          </div>
          {stats ? (
            <div className="flex flex-wrap gap-8">
              <Stat value={stats.totalReviews} label="মোট অভিজ্ঞতা" />
              <Stat value={stats.totalProperties} label="প্রপার্টি" />
              <Stat value={stats.totalLandlords} label="বাড়িওয়ালা" />
              <Stat value={stats.totalAreas} label="এলাকা" />
            </div>
          ) : (
            <p className="text-sm text-neutral-400">লাইভ তথ্য লোড হচ্ছে...</p>
          )}
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> লাইভ আপডেট
          </span>
        </div>
      </section>

      <section className="container-page py-14 grid lg:grid-cols-2 gap-10">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">সাম্প্রতিক অভিজ্ঞতা</h2>
            <Link to="/search" className="text-sm text-brand-600 font-medium">সব দেখুন →</Link>
          </div>
          {loading ? (
            <p className="text-neutral-400 text-sm">লোড হচ্ছে...</p>
          ) : recent.length === 0 ? (
            <div className="card p-8 text-center text-neutral-400 text-sm">এখনো কোনো অভিজ্ঞতা নেই। প্রথম হোন!</div>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <Link
                  key={r._id}
                  to={r.property ? `/properties/${r.property.slug}` : "#"}
                  className="card p-4 flex items-start justify-between gap-4 hover:border-brand-300"
                >
                  <div>
                    <p className="font-medium">{r.property?.name || "প্রপার্টি"}</p>
                    <p className="text-xs text-neutral-400">{r.property?.address?.area}, {r.property?.address?.city}</p>
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{r.body}</p>
                  </div>
                  <RatingStars value={r.overallRating} showValue={false} size="text-xs" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">শীর্ষ এলাকা (অভিজ্ঞতা অনুযায়ী)</h2>
            <Link to="/search" className="text-sm text-brand-600 font-medium">সব এলাকা দেখুন →</Link>
          </div>
          {loading ? (
            <p className="text-neutral-400 text-sm">লোড হচ্ছে...</p>
          ) : areas.length === 0 ? (
            <div className="card p-8 text-center text-neutral-400 text-sm">এখনো কোনো এলাকার তথ্য নেই।</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {areas.map((a) => (
                <AreaCard key={a.area} area={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="grid lg:grid-cols-2 gap-8">
          <RentCalculator />
          <div className="card p-6 flex flex-col justify-center">
            <h3 className="font-semibold text-lg">একটা এলাকা কেমন? তথ্য দিয়ে বুঝুন।</h3>
            <p className="text-sm text-neutral-500 mt-1 mb-4">যাতায়াত, বাজার, হাসপাতাল, শিক্ষাপ্রতিষ্ঠান, নিরাপত্তা — সবকিছু এক জায়গায়।</p>
            <div className="grid grid-cols-3 gap-3 text-center text-xs text-neutral-500">
              {["যাতায়াত", "বাজার", "হাসপাতাল", "শিক্ষাপ্রতিষ্ঠান", "নিরাপত্তা", "বিনোদন"].map((t) => (
                <div key={t} className="rounded-xl border border-neutral-200 dark:border-neutral-700 py-3">{t}</div>
              ))}
            </div>
            <Link to="/search" className="btn-primary mt-4 w-full">এলাকা ম্যাপে দেখুন →</Link>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <h2 className="font-semibold text-lg mb-6">কিভাবে কাজ করে?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.title}>
              <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold mb-3">{i + 1}</div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-neutral-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="card p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-brand-600 text-white !border-none">
          <div>
            <h3 className="text-xl font-bold">আপনার অভিজ্ঞতা, কারো জন্য হতে পারে বড় সহায়তা।</h3>
            <p className="text-brand-100 mt-1 text-sm">আজই আপনার এলাকার বাড়ি/ফ্ল্যাট, বাড়িওয়ালা বা এলাকার অভিজ্ঞতা শেয়ার করুন।</p>
          </div>
          <Link to="/dashboard" className="btn-secondary !text-brand-700 whitespace-nowrap">অভিজ্ঞতা শেয়ার করুন →</Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-xl font-extrabold">{(value ?? 0).toLocaleString()}+</p>
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  );
}
