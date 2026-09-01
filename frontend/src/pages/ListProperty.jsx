import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleGroupOf } from "../lib/roles.js";
import PropertyForm from "../components/PropertyForm.jsx";

export default function ListProperty() {
  const { user } = useAuth();
  const isLandlord = user && ["LANDLORD", "SUPER_ADMIN"].includes(roleGroupOf(user));
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="container-page py-20 max-w-lg text-center animate-fade-up">
        <div className="card p-10">
          <div className="text-4xl mb-3">✓</div>
          <h1 className="text-xl font-bold mb-2">আপনার বাসা লিস্ট হয়েছে</h1>
          <p className="text-neutral-500 text-sm mb-6">
            {isLandlord
              ? "এটি আপনার ড্যাশবোর্ডে দেখতে ও এডিট করতে পারবেন।"
              : "লিস্টিংটি লাইভ, তবে যাচাই না হওয়া পর্যন্ত “Unverified” হিসেবে দেখাবে। একজন বাড়িওয়ালা প্রোফাইল ক্লেইম করলে বা আমাদের টিম যাচাই করলে ব্যাজ যুক্ত হবে।"}
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/search" className="btn-primary">সব বাসা দেখুন →</Link>
            {isLandlord && <Link to="/landlord" className="btn-secondary">ড্যাশবোর্ড</Link>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">🏠 আপনার বাসা লিস্ট করুন</h1>
      <p className="text-neutral-500 text-sm mt-1 mb-2">
        ভাড়া, এলাকা, সুবিধা ও যোগাযোগের তথ্য দিন — ভাড়াটিয়ারা সরাসরি আপনার সাথে যোগাযোগ করতে পারবে। সম্পূর্ণ ফ্রি।
      </p>
      {!isLandlord && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-3 text-sm text-amber-800 dark:text-amber-200 mb-6">
          অ্যাকাউন্ট ছাড়াই লিস্ট করতে পারবেন — লিস্টিংটি “Unverified” হিসেবে দেখাবে।{" "}
          <Link to="/register" className="font-semibold underline">একটি বাড়িওয়ালা অ্যাকাউন্ট খুলুন</Link>{" "}
          যাচাই করা লিস্টিং ও ড্যাশবোর্ড ব্যবস্থাপনার জন্য।
        </div>
      )}

      <PropertyForm
        submitUrl={isLandlord ? "/landlord/properties" : "/public/property-listings"}
        publicMode={!isLandlord}
        onDone={() => setDone(true)}
        onCancel={() => window.history.back()}
      />
    </div>
  );
}
