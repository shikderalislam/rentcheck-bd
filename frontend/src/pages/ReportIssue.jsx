import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";

const CATEGORIES = [
  ["deposit_not_returned", "জামানত ফেরত দেয়নি"],
  ["unsafe_conditions", "অনিরাপদ বাসস্থান"],
  ["harassment_privacy", "প্রাইভেসি লঙ্ঘন / হয়রানি"],
  ["hidden_charges", "লুকানো চার্জ"],
  ["agreement_violation", "চুক্তি ভঙ্গ"],
  ["maintenance_ignored", "মেরামত করা হয়নি"],
  ["eviction_threat", "উচ্ছেদের হুমকি"],
  ["other", "অন্যান্য"],
];

const DIVISIONS = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh"];

const OUTCOMES = [
  ["paid_or_lost", "আমি টাকা দিয়েছি / হারিয়েছি"],
  ["refused", "আমি প্রত্যাখ্যান করেছি"],
  ["pending", "এখনো মুলতুবি"],
  ["resolved_fairly", "শেষমেশ ন্যায্যভাবে সমাধান হয়েছে"],
];

const COMMUNICATION = [
  ["no_response", "একদমই সাড়া দেয়নি"],
  ["hostile", "রূঢ় / হুমকিমূলক আচরণ"],
  ["delayed", "দেরিতে ও এড়িয়ে যাওয়া উত্তর"],
  ["dismissive", "সমস্যাকে গুরুত্ব দেয়নি"],
  ["cooperative", "সহযোগিতাপূর্ণ ছিল"],
];

export default function ReportIssue() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: "",
    issueTitle: "",
    city: "",
    division: "",
    area: "",
    claimedAmount: "",
    outcome: "",
    communicationQuality: "",
    landlordBehavior: "",
    description: "",
  });
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [published, setPublished] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!confirmed) {
      setError("অনুগ্রহ করে নিশ্চিত করুন যে আপনি কোনো ব্যক্তির নাম উল্লেখ করেননি।");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/public/reports", form);
      setPublished(!!data.published);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "রিপোর্ট জমা দেওয়া যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container-page py-20 max-w-lg text-center">
        <div className="card p-10">
          <div className="text-4xl mb-3">✓</div>
          <h1 className="text-xl font-bold mb-2">রিপোর্ট জমা হয়েছে</h1>
          <p className="text-neutral-500 text-sm mb-6">
            {published
              ? "আপনার রিপোর্ট বেনামীভাবে লাইভ রিপোর্ট লেজারে প্রকাশিত হয়েছে। এখন অন্যরা এটি দেখতে ও ভোট দিতে পারবে।"
              : "আপনার রিপোর্টে সম্ভাব্য শনাক্তকারী তথ্য পাওয়া গেছে, তাই এটি একজন মডারেটর পর্যালোচনার পর প্রকাশিত হবে।"}
          </p>
          <Link to="/reports" className="btn-primary">লাইভ রিপোর্ট দেখুন →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-xl">
      <Link to="/reports" className="text-sm text-neutral-400 hover:text-brand-600">← রিপোর্টে ফিরে যান</Link>
      <h1 className="text-2xl font-bold mt-3">একটি বাড়িওয়ালা-সংক্রান্ত সমস্যা রিপোর্ট করুন</h1>
      <p className="text-neutral-500 text-sm mt-1 mb-6">
        বেনামী। কোনো অ্যাকাউন্ট নেই। কোনো পরিচয় ঘর নেই। প্রকাশের আগে পর্যালোচনা করা হয়।
      </p>

      <div className="card p-4 mb-6 bg-neutral-50 dark:bg-neutral-800/50 text-sm">
        <p className="font-medium mb-1">আমরা যা চাই না বা সংরক্ষণ করি না</p>
        <ul className="text-neutral-500 grid grid-cols-2 gap-y-0.5">
          <li>নাম</li><li>ইমেইল</li><li>ফোন</li><li>কাঁচা আইপি অ্যাড্রেস</li><li>ডিভাইস আইডি</li>
        </ul>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div>
          <label className="text-sm font-medium">সমস্যার ধরন</label>
          <select className="input mt-1" required value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">ধরন নির্বাচন করুন</option>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">সংক্ষিপ্ত শিরোনাম</label>
          <input
            className="input mt-1"
            placeholder="যেমন: চুক্তির মেয়াদ শেষে জামানত ফেরত দেয়নি"
            required
            value={form.issueTitle}
            onChange={(e) => set("issueTitle", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">বিভাগ</label>
            <select className="input mt-1" required value={form.division} onChange={(e) => set("division", e.target.value)}>
              <option value="">বিভাগ নির্বাচন করুন</option>
              {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">শহর</label>
            <input className="input mt-1" required value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">আনুমানিক এলাকা (ঐচ্ছিক)</label>
          <input
            className="input mt-1"
            placeholder="যেমন: মিরপুর ১০ — বাসার সুনির্দিষ্ট ঠিকানা লিখবেন না"
            value={form.area}
            onChange={(e) => set("area", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">দাবিকৃত/হারানো পরিমাণ (৳, থাকলে)</label>
          <input
            type="number"
            className="input mt-1"
            value={form.claimedAmount}
            onChange={(e) => set("claimedAmount", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">কী ঘটেছিল?</label>
          <select className="input mt-1" required value={form.outcome} onChange={(e) => set("outcome", e.target.value)}>
            <option value="">নির্বাচন করুন</option>
            {OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">বাড়িওয়ালার সাথে যোগাযোগ কেমন ছিল? (ঐচ্ছিক)</label>
          <select
            className="input mt-1"
            value={form.communicationQuality}
            onChange={(e) => set("communicationQuality", e.target.value)}
          >
            <option value="">নির্বাচন করুন</option>
            {COMMUNICATION.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">বাড়িওয়ালা কেমন আচরণ করেছিল / কেন খারাপ আচরণ করল? (ঐচ্ছিক)</label>
          <textarea
            className="input min-h-[80px] mt-1"
            placeholder="যেমন: বারবার বলা সত্ত্বেও মেরামত করেনি, উল্টো অগ্রিম বাড়ানোর কথা বলে চাপ দিয়েছিল। কোনো নাম লিখবেন না।"
            maxLength={1000}
            value={form.landlordBehavior}
            onChange={(e) => set("landlordBehavior", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">বিবরণ</label>
          <textarea
            className="input min-h-[120px] mt-1"
            placeholder="কী ঘটেছিল বিস্তারিত লিখুন। কোনো নাম, ফোন নম্বর বা শনাক্তকারী তথ্য উল্লেখ করবেন না।"
            required
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-200">
          বেশিরভাগ রিপোর্ট সাথে সাথে প্রকাশিত হয়। তবে কোনো নাম, ফোন নম্বর বা শনাক্তকারী তথ্য থাকলে সেটি একজন মডারেটরের অনুমোদনের জন্য অপেক্ষায় থাকে।
        </div>

        <label className="flex items-start gap-2 text-sm text-neutral-500">
          <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          আমি কোনো ব্যক্তির নাম বা পরিচয় উল্লেখ করিনি। আমি বুঝি এটি একটি পাবলিক, অযাচাইকৃত অভিজ্ঞতা।
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "জমা হচ্ছে..." : "বেনামী রিপোর্ট জমা দিন →"}
        </button>
        <p className="text-xs text-neutral-400 text-center">
          জমাটি নিরাপদ সার্ভার এন্ডপয়েন্টের মাধ্যমে যায় এবং মডারেটর অনুমোদন না দেওয়া পর্যন্ত ব্যক্তিগত থাকে।
        </p>
      </form>
    </div>
  );
}
