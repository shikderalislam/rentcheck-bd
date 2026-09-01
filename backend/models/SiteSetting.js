import mongoose from "mongoose";

// Key/value store for content that admins edit from the dashboard instead of
// via code deploys — announcement bar, homepage hero copy, FAQ list, etc.
// `value` is free-form JSON validated per-key in the controller.
const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("SiteSetting", siteSettingSchema);

// Keys the public site is allowed to read, with their built-in fallbacks.
export const PUBLIC_SETTING_DEFAULTS = {
  announcement: {
    enabled: true,
    text: "🏠 বাসা দেখতে যাওয়ার আগে, বাসাটা সম্পর্কে জেনে নিন।",
  },
  homeHero: {
    title: "বাসা দেখতে যাওয়ার আগে,\nবাসাটা সম্পর্কে জেনে নিন।",
    subtitle:
      "ভাড়া কত, অগ্রিম কত, বাড়িওয়ালা কেমন, পানি-গ্যাস কেমন, পরিবেশ কেমন — আগের ও বর্তমান ভাড়াটিয়াদের অভিজ্ঞতা থেকে জানুন।",
    searchPlaceholder: "এলাকা, বাড়ি বা বাড়িওয়ালার নাম লিখুন...",
    popularAreas: ["মিরপুর ১০", "উত্তরা", "ধানমন্ডি", "বনানী", "মোহাম্মদপুর", "চট্টগ্রাম"],
  },
  faq: [
    {
      q: "এই রিপোর্টগুলো কি যাচাইকৃত?",
      a: "না। প্রতিটি এন্ট্রি একজন ভাড়াটিয়ার অযাচাইকৃত, ব্যক্তিগত অভিজ্ঞতা। এটি শুধু অন্য ভাড়াটিয়াদের সচেতন থাকতে সাহায্য করার একটি তথ্যভাণ্ডার।",
    },
    {
      q: "আমার তথ্য কি সংরক্ষণ করা হয়?",
      a: "বেনামী রিপোর্টে নাম, ইমেইল, ফোন বা কাঁচা আইপি সংরক্ষণ করা হয় না। শুধু মৌলিক অপব্যবহার প্রতিরোধের জন্য একটি অপরিবর্তনযোগ্য টোকেন ব্যবহার করা হয়।",
    },
    {
      q: "‘এই রিপোর্ট নিশ্চিত করুন’ মানে কী?",
      a: "এর মানে ‘আমিও একই ধরনের অভিজ্ঞতার সম্মুখীন হয়েছি’। একই ব্রাউজার থেকে একবারই নিশ্চিত করা যায়।",
    },
  ],
};
