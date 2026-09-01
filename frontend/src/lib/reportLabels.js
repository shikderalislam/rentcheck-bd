// Shared Bangla labels for the anonymous rental-experience (report) feature.

export const DIVISIONS = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh"];

export const DIVISION_BN = {
  Dhaka: "ঢাকা",
  Chattogram: "চট্টগ্রাম",
  Sylhet: "সিলেট",
  Rajshahi: "রাজশাহী",
  Khulna: "খুলনা",
  Barishal: "বরিশাল",
  Rangpur: "রংপুর",
  Mymensingh: "ময়মনসিংহ",
};

export const CATEGORY_LABELS = {
  landlord_behavior: "বাড়িওয়ালার আচরণ",
  privacy_intrusion: "প্রাইভেসি লঙ্ঘন",
  excessive_rules: "অযৌক্তিক নিয়ম",
  maintenance_ignored: "মেরামত উপেক্ষা",
  sudden_rent_increase: "হঠাৎ ভাড়া বৃদ্ধি",
  extra_charges_demanded: "অতিরিক্ত টাকা দাবি",
  advance_refund_problem: "অগ্রিম ফেরত সমস্যা",
  guest_policy: "গেস্ট নিয়ে সমস্যা",
  parking: "পার্কিং সমস্যা",
  water: "পানি সমস্যা",
  gas: "গ্যাস সমস্যা",
  electricity: "বিদ্যুৎ সমস্যা",
  security: "নিরাপত্তা সমস্যা",
  noise: "শব্দ / Noise",
  unsafe_conditions: "অনিরাপদ বাসস্থান",
  positive_experience: "ভালো অভিজ্ঞতা",
  other: "অন্যান্য",
};

// Categories offered in the submission form (positive_experience is captured via
// the "ভালো কী লেগেছে?" section instead of as a problem category).
export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).filter(([v]) => v !== "positive_experience");

export const DURATION_LABELS = {
  lt_6m: "৬ মাসের কম",
  "6_12m": "৬–১২ মাস",
  "1_2y": "১–২ বছর",
  "2y_plus": "২+ বছর",
};

export const RECOMMENDATION_LABELS = {
  yes: "👍 হ্যাঁ",
  maybe: "🤔 ভাবা যেতে পারে",
  no: "👎 না",
};

export const COMMUNICATION_LABELS = {
  no_response: "একদমই সাড়া দেয়নি",
  hostile: "রূঢ় / হুমকিমূলক",
  delayed: "দেরিতে ও এড়িয়ে যাওয়া",
  dismissive: "গুরুত্ব দেয়নি",
  cooperative: "সহযোগিতাপূর্ণ",
};

// Multi-select problem tags for the form.
export const ISSUE_OPTIONS = [
  ["bad_behavior", "খারাপ আচরণ"],
  ["excessive_monitoring", "অতিরিক্ত নজরদারি"],
  ["privacy", "প্রাইভেসি সমস্যা"],
  ["unreasonable_rules", "অযৌক্তিক নিয়ম"],
  ["maintenance_problem", "মেরামত সমস্যা"],
  ["sudden_rent_hike", "হঠাৎ ভাড়া বৃদ্ধি"],
  ["extra_charges", "অতিরিক্ত টাকা দাবি"],
  ["advance_refund", "অগ্রিম ফেরত সমস্যা"],
  ["guest_problem", "গেস্ট নিয়ে সমস্যা"],
  ["parking", "পার্কিং সমস্যা"],
  ["water", "পানি সমস্যা"],
  ["gas", "গ্যাস সমস্যা"],
  ["electricity", "বিদ্যুৎ সমস্যা"],
  ["security", "নিরাপত্তা সমস্যা"],
  ["noise", "শব্দ সমস্যা"],
  ["other", "অন্যান্য"],
];

export const POSITIVE_OPTIONS = [
  ["good_behavior", "ভালো ব্যবহার"],
  ["privacy_respected", "প্রাইভেসি রক্ষা করেছে"],
  ["fast_maintenance", "দ্রুত মেরামত"],
  ["good_environment", "ভালো পরিবেশ"],
  ["good_security", "ভালো নিরাপত্তা"],
  ["parking", "পার্কিং সুবিধা"],
  ["reasonable_rules", "যৌক্তিক নিয়ম"],
  ["easy_advance_refund", "অগ্রিম সহজে ফেরত"],
  ["family_friendly", "ফ্যামিলি-ফ্রেন্ডলি"],
  ["bachelor_friendly", "ব্যাচেলর-ফ্রেন্ডলি"],
  ["transport", "যাতায়াত সুবিধা"],
];

export const CATEGORY_RATING_FIELDS = [
  ["behavior", "🤝 ব্যবহার ও আচরণ"],
  ["privacy", "🔐 প্রাইভেসি"],
  ["maintenance", "🔧 মেরামত"],
  ["rentFairness", "💰 ভাড়া ও চার্জ"],
  ["advanceRefund", "💵 অগ্রিম ফেরত"],
  ["communication", "📞 যোগাযোগ"],
  ["rules", "📜 নিয়ম-কানুন"],
];

export const SUPPORT_URL = "https://www.supportkori.com/shikder";

export function timeAgoBn(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "কিছুক্ষণ আগে";
  if (hours < 24) return `${hours} ঘণ্টা আগে`;
  return `${Math.floor(hours / 24)} দিন আগে`;
}
