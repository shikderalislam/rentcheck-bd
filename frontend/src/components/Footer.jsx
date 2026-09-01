import { Link } from "react-router-dom";
import { SUPPORT_URL } from "../lib/reportLabels.js";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-20">
      <div className="container-page py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2">
          <div className="font-extrabold text-lg mb-2">RentCheck <span className="text-brand-600">BD</span></div>
          <p className="text-neutral-500 max-w-xs">
            বাসা দেখতে যাওয়ার আগে, বাসাটা সম্পর্কে জেনে নিন। আগের ও বর্তমান ভাড়াটিয়াদের অভিজ্ঞতা থেকে সিদ্ধান্ত নিন।
          </p>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:border-amber-400 hover:text-amber-700"
          >
            ☕ Support করুন
          </a>
        </div>
        <div>
          <div className="font-semibold mb-2">প্ল্যাটফর্ম</div>
          <ul className="space-y-1 text-neutral-500">
            <li><Link to="/reports" className="hover:text-brand-600">লাইভ রিপোর্ট</Link></li>
            <li><Link to="/report-issue" className="hover:text-brand-600">অভিজ্ঞতা শেয়ার করুন</Link></li>
            <li><Link to="/search" className="hover:text-brand-600">বাসা খুঁজুন</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Trust &amp; Safety</div>
          <ul className="space-y-1 text-neutral-500">
            <li>Community Guidelines</li>
            <li>Privacy</li>
            <li>Terms of Service</li>
          </ul>
        </div>
      </div>
      <div className="container-page py-6 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-400">
        © {new Date().getFullYear()} RentCheck BD. প্রতিটি রিপোর্ট একজন ব্যবহারকারীর ব্যক্তিগত অভিজ্ঞতা — যাচাই না হওয়া পর্যন্ত এটি প্রমাণিত তথ্য নয়।
      </div>
    </footer>
  );
}
