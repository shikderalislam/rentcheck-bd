import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import LedgerRow from "../components/LedgerRow.jsx";
import FaqAccordion from "../components/FaqAccordion.jsx";

const CATEGORY_LABELS = {
  deposit_not_returned: "জামানত ফেরত দেয়নি",
  unsafe_conditions: "অনিরাপদ বাসস্থান",
  harassment_privacy: "প্রাইভেসি লঙ্ঘন / হয়রানি",
  hidden_charges: "লুকানো চার্জ",
  agreement_violation: "চুক্তি ভঙ্গ",
  maintenance_ignored: "মেরামত করা হয়নি",
  eviction_threat: "উচ্ছেদের হুমকি",
  other: "অন্যান্য",
};

const OUTCOME_BADGE = {
  paid_or_lost: { label: "পরিশোধিত / হারানো", cls: "bg-rose-100 text-rose-700" },
  refused: { label: "প্রত্যাখ্যাত", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "দাবি মুলতুবি", cls: "bg-amber-100 text-amber-800" },
  resolved_fairly: { label: "ন্যায্যভাবে সমাধান", cls: "bg-emerald-100 text-emerald-700" },
};

const COMMUNICATION_LABELS = {
  no_response: "একদমই সাড়া দেয়নি",
  hostile: "রূঢ় / হুমকিমূলক",
  delayed: "দেরিতে ও এড়িয়ে যাওয়া",
  dismissive: "গুরুত্ব দেয়নি",
  cooperative: "সহযোগিতাপূর্ণ",
};

const DIVISIONS = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh"];

const FAQ_ITEMS = [
  { q: "এই রিপোর্টগুলো কি যাচাইকৃত?", a: "না। প্রতিটি এন্ট্রি একটি অযাচাইকৃত, সম্মিলিতভাবে সংগৃহীত অভিজ্ঞতা। আমরা কোনো আইনি দাবি করি না — এটি শুধু ভাড়াটিয়াদের সচেতন থাকার জন্য একটি তথ্যভাণ্ডার।" },
  { q: "আমার তথ্য কি সংরক্ষণ করা হয়?", a: "না। নাম, ইমেইল, ফোন, কাঁচা আইপি অ্যাড্রেস বা ডিভাইস আইডি — কোনোটিই সংরক্ষণ করা হয় না। শুধুমাত্র মৌলিক অপব্যবহার প্রতিরোধের জন্য একটি অপরিবর্তনযোগ্য, বেনামি ফিঙ্গারপ্রিন্ট ব্যবহার করা হয়।" },
  { q: "কেউ কি কোনো ব্যক্তির নাম উল্লেখ করতে পারবে?", a: "না। জমা দেওয়ার আগে আমরা স্পষ্টভাবে অনুরোধ করি নাম, ফোন নম্বর বা কোনো শনাক্তকারী তথ্য উল্লেখ না করতে, এবং সন্দেহজনক এন্ট্রি মডারেশনে আটকে যায়।" },
  { q: "প্রকাশের আগে কী হয়?", a: "প্রতিটি রিপোর্ট এবং মন্তব্য একজন মডারেটর পর্যালোচনা করেন। সন্দেহজনক বা ঝুঁকিপূর্ণ কনটেন্ট প্রত্যাখ্যান করা হয়।" },
];

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "কিছুক্ষণ আগে";
  if (hours < 24) return `${hours} ঘণ্টা আগে`;
  return `${Math.floor(hours / 24)} দিন আগে`;
}

export default function ReportsFeed() {
  const [stats, setStats] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", division: "", sort: "recent" });
  const [openComments, setOpenComments] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  const load = async () => {
    setLoading(true);
    const query = {};
    Object.entries(filters).forEach(([k, v]) => v && (query[k] = v));
    const [s, l, r] = await Promise.all([
      api.get("/public/reports/stats").catch(() => ({ data: { stats: null } })),
      api.get("/public/reports/ledger").catch(() => ({ data: null })),
      api.get("/public/reports", { params: query }).catch(() => ({ data: { reports: [] } })),
    ]);
    setStats(s.data.stats);
    setLedger(l.data);
    setReports(r.data.reports);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const vote = async (id, direction) => {
    // optimistic bump so the count moves immediately
    setReports((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              upvotes: r.upvotes + (direction === "up" ? 1 : 0),
              downvotes: r.downvotes + (direction === "down" ? 1 : 0),
            }
          : r
      )
    );
    try {
      const { data } = await api.post(`/public/reports/${id}/vote`, { direction });
      setReports((rs) =>
        rs.map((r) => (r.id === id ? { ...r, upvotes: data.upvotes, downvotes: data.downvotes } : r))
      );
    } catch {
      load();
    }
  };

  const postComment = async (id) => {
    const body = (commentDrafts[id] || "").trim();
    if (body.length < 3) return;
    const { data } = await api.post(`/public/reports/${id}/comments`, { body });
    if (data.comment) {
      setReports((rs) => rs.map((r) => (r.id === id ? { ...r, comments: [...(r.comments || []), data.comment] } : r)));
    }
    setCommentDrafts((d) => ({ ...d, [id]: "" }));
    alert(data.message);
  };

  return (
    <div className="bg-white dark:bg-neutral-950">
      {/* Hero — bold, high-contrast, highlighter-style headline */}
      <section className="bg-neutral-50 dark:bg-neutral-900 border-b-4 border-neutral-900 dark:border-amber-400">
        <div className="container-page py-14">
          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-3">অভিজ্ঞতা লেজার · বাড়িওয়ালা সংক্রান্ত সমস্যা</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            কেউ চাইল <mark className="bg-amber-300 px-1">বাড়তি সুবিধা।</mark><br />
            কী ঘটেছিল, <mark className="bg-amber-300 px-1">মনে আছে।</mark><br />
            এবার লিখে দিন <mark className="bg-amber-300 px-1">খাতায়।</mark>
          </h1>
          <p className="mt-4 max-w-xl text-neutral-500">
            বাংলাদেশের ভাড়াটিয়াদের জন্য একটি বেনামী, সম্মিলিত অভিজ্ঞতা লেজার — যাতে বাড়িওয়ালা সংক্রান্ত সমস্যা প্রকাশ্যে জানানো যায় এবং অন্যরা মন্তব্য করতে পারে।
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/report-issue" className="inline-flex items-center rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 font-bold px-5 py-2.5">
              রিপোর্ট লিখুন →
            </Link>
            <a href="#ledger" className="btn-secondary">লেজার দেখুন</a>
          </div>

          {stats && (
            <div className="mt-10 grid sm:grid-cols-3 gap-4">
              <div className="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">পরিসংখ্যান</p>
                <p className="text-lg font-bold mt-1">মোট দাবিকৃত পরিমাণ</p>
                <mark className="bg-amber-300 px-1 text-xl font-extrabold inline-block mt-1">৳{stats.totalAmount.toLocaleString()}</mark>
                <p className="text-xs text-neutral-400 mt-1">গত ৯ দিনে {stats.recentCount} টি নতুন</p>
              </div>
              <div className="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">মোট রিপোর্ট</p>
                <p className="text-3xl font-extrabold mt-1">{stats.totalCount}</p>
                <p className="text-xs text-neutral-400 mt-1">{stats.rejectedPct}% দাবি প্রত্যাখ্যাত হয়েছে</p>
              </div>
              <div className="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">শীর্ষ বিভাগ</p>
                <div className="mt-1 space-y-1">
                  {stats.topDivisions.slice(0, 3).map((d) => (
                    <div key={d.division} className="flex justify-between text-sm">
                      <span>{d.division}</span>
                      <span className="font-bold">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Live report feed */}
      <section className="container-page py-14">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-2xl font-extrabold">লাইভ রিপোর্ট।</h2>
        </div>
        <p className="text-sm text-neutral-500 mb-6">প্রতিটি এন্ট্রি একটি অযাচাইকৃত, সম্মিলিতভাবে সংগৃহীত অভিজ্ঞতা।</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <select className="input !w-auto" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
            <option value="">সব ধরনের সমস্যা</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input !w-auto" value={filters.division} onChange={(e) => setFilters((f) => ({ ...f, division: e.target.value }))}>
            <option value="">সব বিভাগ</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input !w-auto" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}>
            <option value="recent">সর্বশেষ</option>
            <option value="amount_high">সর্বোচ্চ পরিমাণ</option>
            <option value="most_upvoted">সবচেয়ে বেশি আপভোট</option>
          </select>
          {(filters.category || filters.division) && (
            <button className="btn-secondary !py-1.5 text-sm" onClick={() => setFilters({ category: "", division: "", sort: "recent" })}>
              ফিল্টার মুছুন
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-neutral-400">লোড হচ্ছে...</p>
        ) : reports.length === 0 ? (
          <div className="card p-10 text-center text-neutral-400">এখনো কোনো অনুমোদিত রিপোর্ট নেই।</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {reports.map((r, i) => {
              const badge = OUTCOME_BADGE[r.outcome] || {};
              const isOpen = openComments === r.id;
              return (
                <div key={r.id} className="border-2 border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="badge bg-neutral-900 text-white font-mono">#{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex flex-col items-end gap-1">
                      {r.claimedAmount > 0 && <span className="font-extrabold text-lg">৳{r.claimedAmount.toLocaleString()}</span>}
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 mt-3">{CATEGORY_LABELS[r.category]}</p>
                  <h3 className="font-bold mt-0.5">{r.issueTitle}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {r.area ? `${r.area}, ` : ""}{r.city}, {r.division} · {timeAgo(r.createdAt)}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-3">{r.description}</p>

                  {r.landlordBehavior && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 border-l-2 border-neutral-300 dark:border-neutral-700 pl-3">
                      বাড়িওয়ালার আচরণ: {r.landlordBehavior}
                    </p>
                  )}
                  {r.communicationQuality && COMMUNICATION_LABELS[r.communicationQuality] && (
                    <p className="text-xs text-neutral-400 mt-2">
                      যোগাযোগ: <span className="font-medium text-neutral-600 dark:text-neutral-300">{COMMUNICATION_LABELS[r.communicationQuality]}</span>
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => vote(r.id, "up")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold px-3 py-1.5 text-xs"
                    >
                      ▲ লাইক <span className="tabular-nums">{r.upvotes}</span>
                    </button>
                    <button
                      onClick={() => vote(r.id, "down")}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold px-3 py-1.5 text-xs"
                    >
                      ▼ ডিসলাইক <span className="tabular-nums">{r.downvotes}</span>
                    </button>
                    <button onClick={() => setOpenComments(isOpen ? null : r.id)} className="text-xs text-neutral-500 hover:text-neutral-900 ml-auto">
                      💬 মন্তব্য ({r.comments?.length || 0})
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-2">
                      {(r.comments || []).length === 0 && <p className="text-xs text-neutral-400">এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্য করুন।</p>}
                      {(r.comments || []).map((c) => (
                        <div key={c.id} className="text-sm bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2">
                          <p>{c.body}</p>
                          <p className="text-[10px] text-neutral-400 mt-1">{timeAgo(c.createdAt)}</p>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <input
                          className="input flex-1 !py-1.5 text-sm"
                          placeholder="আপনার মন্তব্য লিখুন (নাম/ফোন উল্লেখ করবেন না)..."
                          value={commentDrafts[r.id] || ""}
                          onChange={(e) => setCommentDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                        />
                        <button onClick={() => postComment(r.id)} className="btn-secondary !py-1.5 !px-3 text-sm">পাঠান</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Transparency Ledger — aggregated leaderboard with bar charts */}
      <section id="ledger" className="border-y-4 border-neutral-900 dark:border-amber-400 bg-neutral-50 dark:bg-neutral-900">
        <div className="container-page py-14">
          <h2 className="text-2xl font-extrabold mb-1">স্বচ্ছতা লেজার।</h2>
          <p className="text-sm text-neutral-500 mb-8">সময়ের সাথে সাথে কোন সমস্যা এবং কোন বিভাগে সবচেয়ে বেশি রিপোর্ট হয়েছে তার সারাংশ।</p>

          {ledger && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">সমস্যার ধরন অনুযায়ী</h3>
                  <span className="text-xs text-neutral-400">{ledger.totals.totalCount} মোট</span>
                </div>
                {ledger.byCategory.map((c, i) => (
                  <LedgerRow
                    key={c.category}
                    rank={i + 1}
                    label={CATEGORY_LABELS[c.category] || c.category}
                    count={c.count}
                    barPct={c.barPct}
                    active={filters.category === c.category}
                    onClick={() => setFilters((f) => ({ ...f, category: f.category === c.category ? "" : c.category }))}
                  />
                ))}
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">বিভাগ অনুযায়ী</h3>
                  <span className="text-xs text-neutral-400">{ledger.totals.activeDivisions} সক্রিয়</span>
                </div>
                {ledger.byDivision.map((d, i) => (
                  <LedgerRow
                    key={d.division}
                    rank={i + 1}
                    label={d.division}
                    count={d.count}
                    barPct={d.barPct}
                    active={filters.division === d.division}
                    onClick={() => setFilters((f) => ({ ...f, division: f.division === d.division ? "" : d.division }))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-14 max-w-2xl">
        <h2 className="text-2xl font-extrabold mb-6">প্রশ্ন।</h2>
        <FaqAccordion items={FAQ_ITEMS} />
      </section>

      {/* Dark CTA band */}
      <section className="bg-neutral-900 text-white">
        <div className="container-page py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            নীরবতা প্যাটার্নকে রক্ষা করে। <br className="hidden sm:block" />
            পাবলিক ডেটা তা ভেঙে দেয়।
          </h2>
          <p className="text-neutral-400 mt-3 text-sm">আপনার অভিজ্ঞতা কারো জন্য সতর্কতা হতে পারে।</p>
          <Link to="/report-issue" className="inline-flex items-center rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 font-bold px-6 py-3 mt-6">
            রিপোর্ট লিখুন →
          </Link>
        </div>
      </section>
    </div>
  );
}
