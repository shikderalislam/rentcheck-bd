// Small, deletable demo dataset so the app is not blank on first host.
//
//   npm run seed:demo
//
// Creates: 1 demo tenant + 1 demo landlord (both email-verified), a landlord
// profile, ~5 approved Mirpur rental-experience reports, ~8 Mirpur property
// listings (flat / apartment / house / building / bachelor) with real photos,
// and ~7 approved account reviews (with category ratings + a few landlord
// responses) whose ratings roll up into each property's reputation.
//
// Re-running wipes the previous demo rows first. Everything is normal data —
// delete any of it from the admin or landlord dashboard.
import dotenv from "dotenv";
import mongoose from "mongoose";
import slugify from "slugify";
import User from "../models/User.js";
import Landlord from "../models/Landlord.js";
import Property from "../models/Property.js";
import Report from "../models/Report.js";
import ReportConfirmation from "../models/ReportConfirmation.js";
import Review from "../models/Review.js";
import RentalRelationship from "../models/RentalRelationship.js";
import { recalculatePropertyReputation, recalculateLandlordReputation } from "../controllers/reviewController.js";

dotenv.config();

const TENANT_EMAIL = "demo.tenant@rentcheckbd.com";
const LANDLORD_EMAIL = "demo.landlord@rentcheckbd.com";
const PASSWORD = "Demo@12345";

// LoremFlickr returns a real Flickr photo matching the keywords; `lock` keeps
// it stable across reloads.
const pic = (kw, lock) => `https://loremflickr.com/1200/800/${kw}?lock=${lock}`;
const daysAgo = (d) => new Date(Date.now() - d * 864e5);

/* ---------------- reports (anonymous experiences) ---------------- */
const REPORTS = [
  {
    category: "water", issueTitle: "উপরের তলায় সকালে পানি থাকে না", area: "Mirpur 10",
    rentalDuration: "1_2y", overallRating: 2,
    categoryRatings: { maintenance: 2, communication: 2, behavior: 3 },
    issues: ["water", "maintenance_problem"], positives: ["good_security"], recommendation: "no",
    communicationQuality: "delayed", landlordBehavior: "পানির পাম্প দুর্বল, বারবার বলার পরও ঠিক করেনি।",
    description: "মিরপুর ১০-এ পাঁচতলা ভবনের উপরের তলাগুলোতে সকাল ৭টা থেকে ১০টা পর্যন্ত পানি প্রায় থাকেই না। মাসের পর মাস বলার পরও পাম্প বা রিজার্ভ ট্যাংকের ব্যবস্থা নেয়নি।",
    createdAt: daysAgo(5), confirmations: 9,
  },
  {
    category: "sudden_rent_increase", issueTitle: "নোটিশ ছাড়াই ভাড়া বাড়িয়ে দিয়েছে", area: "Mirpur 11",
    rentalDuration: "2y_plus", overallRating: 2,
    categoryRatings: { rentFairness: 1, communication: 2, behavior: 2 },
    issues: ["sudden_rent_hike", "unreasonable_rules"], recommendation: "maybe",
    communicationQuality: "dismissive", landlordBehavior: "বছর না ঘুরতেই মুখে মুখে ভাড়া বাড়ানোর কথা বলে চাপ দেয়।",
    description: "চুক্তিতে বছরে একবার ভাড়া রিভিউয়ের কথা থাকলেও ৮ মাসের মাথায় কোনো লিখিত নোটিশ ছাড়াই ২০০০ টাকা ভাড়া বাড়িয়ে দেওয়া হয়েছে। আপত্তি করলে বাসা ছাড়ার কথা বলে।",
    createdAt: daysAgo(8), confirmations: 14,
  },
  {
    category: "privacy_intrusion", issueTitle: "বাড়িওয়ালা প্রায়ই না বলে ফ্ল্যাটে ঢোকেন", area: "Mirpur 12",
    rentalDuration: "6_12m", overallRating: 1,
    categoryRatings: { privacy: 1, behavior: 2, rules: 2 },
    issues: ["privacy", "excessive_monitoring", "unreasonable_rules"], recommendation: "no",
    communicationQuality: "hostile", landlordBehavior: "নিজের চাবি দিয়ে অনুপস্থিতিতে ফ্ল্যাটে ঢুকে যান।",
    description: "বাড়িওয়ালা আগে না জানিয়ে, কখনও আমরা বাসায় না থাকলেও নিজের চাবি দিয়ে ফ্ল্যাটে ঢোকেন — 'দেখভাল' করার কথা বলে। প্রাইভেসির চরম লঙ্ঘন।",
    createdAt: daysAgo(12), confirmations: 21,
  },
  {
    category: "maintenance_ignored", issueTitle: "লিফট মাসের পর মাস নষ্ট, মেরামত হয় না", area: "Mirpur 10",
    rentalDuration: "1_2y", overallRating: 3,
    categoryRatings: { maintenance: 2, communication: 3, behavior: 3 },
    issues: ["maintenance_problem"], positives: ["good_environment"], recommendation: "maybe",
    communicationQuality: "delayed",
    description: "৮তলা ভবনে লিফট প্রায় দুই মাস ধরে নষ্ট। বয়স্ক ভাড়াটিয়াদের জন্য খুবই কষ্টকর। সার্ভিস চার্জ ঠিকই নেয়, কিন্তু মেকানিক আনতে গড়িমসি করে।",
    createdAt: daysAgo(3), confirmations: 6,
  },
  {
    category: "advance_refund_problem", issueTitle: "বাসা ছাড়ার সময় অগ্রিমের অর্ধেক কেটে রেখেছে", area: "Mirpur 6",
    rentalDuration: "1_2y", overallRating: 2,
    categoryRatings: { depositHandling: 1, agreementFairness: 2, behavior: 2 },
    issues: ["advance_refund", "extra_charges"], recommendation: "no",
    communicationQuality: "delayed", landlordBehavior: "'রঙ করাতে হবে' অজুহাতে অগ্রিম থেকে টাকা কেটে রেখেছে।",
    description: "চুক্তিমতো ২ মাসের অগ্রিম দিয়েছিলাম। বাসা পরিষ্কার অবস্থায় বুঝিয়ে দেওয়ার পরও 'রঙ ও মেরামত' দেখিয়ে প্রায় অর্ধেক টাকা কেটে রেখেছে, কোনো রসিদ বা হিসাব দেয়নি।",
    createdAt: daysAgo(18), confirmations: 11,
  },
];

/* ---------------- property listings ---------------- */
const LISTINGS = [
  {
    name: "Green View — ৩ বেডরুম ফ্যামিলি ফ্ল্যাট", propertyType: "flat",
    description: "মিরপুর ১০-এর কাছে খোলামেলা ৩ বেডরুমের ফ্যামিলি ফ্ল্যাট। লিফট, জেনারেটর ও গ্যাস সংযোগ আছে।",
    address: { area: "Mirpur 10", district: "Dhaka", city: "Dhaka", division: "Dhaka", road: "Road 7", landmark: "মিরপুর ১০ গোল চত্বর থেকে ৫ মিনিট" },
    bedrooms: 3, bathrooms: 2, balconies: 2, floor: 5, totalFloors: 8, sizeSqft: 1250, furnishing: "semi_furnished",
    features: { parking: true, lift: true, generator: true, gas: true, water: true, security: true, cctv: true },
    rentDetails: { monthly: 25000, advanceMonths: 3, serviceCharge: 2000, parkingCharge: 1500 },
    rentalPolicy: { allowedTenants: ["family"], familyOnly: true, guests: true, cooking: true },
    photos: [pic("apartment,livingroom", 11), pic("apartment,bedroom", 12), pic("apartment,kitchen", 13)],
  },
  {
    name: "Sunny Corner — ২ বেডরুম অ্যাপার্টমেন্ট", propertyType: "apartment",
    description: "মিরপুর ১১-এ ছিমছাম ২ বেডরুমের অ্যাপার্টমেন্ট। ছোট পরিবার বা প্রফেশনালদের জন্য উপযুক্ত।",
    address: { area: "Mirpur 11", district: "Dhaka", city: "Dhaka", division: "Dhaka", block: "Block C", landmark: "মিরপুর ১১ বাস স্ট্যান্ডের কাছে" },
    bedrooms: 2, bathrooms: 2, balconies: 1, floor: 3, totalFloors: 6, sizeSqft: 900, furnishing: "unfurnished",
    features: { lift: true, generator: true, gas: true, water: true, security: true },
    rentDetails: { monthly: 18000, advanceMonths: 2, serviceCharge: 1200 },
    rentalPolicy: { allowedTenants: ["family", "professionals"], guests: true, cooking: true },
    photos: [pic("apartment,interior", 21), pic("livingroom", 22)],
  },
  {
    name: "Rahman Residence — ভবনের ফ্যামিলি ইউনিট", propertyType: "building",
    description: "মিরপুর ১২-তে নিরিবিলি এলাকায় পুরো একটি ফ্লোর। বড় পরিবারের জন্য আদর্শ।",
    address: { area: "Mirpur 12", district: "Dhaka", city: "Dhaka", division: "Dhaka", road: "Avenue 3", landmark: "মিরপুর ১২ মসজিদের পাশে" },
    bedrooms: 4, bathrooms: 3, balconies: 3, floor: 2, totalFloors: 5, sizeSqft: 1600, furnishing: "unfurnished",
    features: { parking: true, lift: true, generator: true, gas: true, water: true, security: true, caretaker: true, rooftop: true },
    rentDetails: { monthly: 30000, advanceMonths: 3, serviceCharge: 2500, parkingCharge: 1500 },
    rentalPolicy: { allowedTenants: ["family"], familyOnly: true, guests: true, cooking: true },
    photos: [pic("apartment,building", 31), pic("livingroom,interior", 32), pic("bedroom", 33)],
  },
  {
    name: "Metro Nest — ব্যাচেলর ফ্ল্যাট", propertyType: "bachelor_room",
    description: "মিরপুর ১-এ মেট্রো স্টেশনের কাছে ব্যাচেলরদের জন্য ফ্ল্যাট। ৪ জন পর্যন্ত থাকা যায়।",
    address: { area: "Mirpur 1", district: "Dhaka", city: "Dhaka", division: "Dhaka", block: "Block A", landmark: "মিরপুর ১ মেট্রো স্টেশন থেকে হাঁটা দূরত্ব" },
    bedrooms: 2, bathrooms: 1, balconies: 1, floor: 4, totalFloors: 7, sizeSqft: 650, furnishing: "semi_furnished",
    features: { lift: true, generator: true, gas: true, water: true, wifi: true, security: true },
    rentDetails: { monthly: 12000, advanceMonths: 2, serviceCharge: 800 },
    rentalPolicy: { allowedTenants: ["bachelor", "students", "male"], guests: false, cooking: true, subletting: false },
    photos: [pic("room,interior", 41), pic("apartment,small", 42)],
  },
  {
    name: "Lakeview Heights — ৩ বেডরুম, লেক ফেসিং", propertyType: "apartment",
    description: "মিরপুর ৬-এ লেকের দিকে মুখ করা রোদেলা ৩ বেডরুমের অ্যাপার্টমেন্ট। বড় বারান্দা।",
    address: { area: "Mirpur 6", district: "Dhaka", city: "Dhaka", division: "Dhaka", road: "Block D", landmark: "মিরপুর ৬ লেকপাড়" },
    bedrooms: 3, bathrooms: 2, balconies: 2, floor: 6, totalFloors: 9, sizeSqft: 1350, furnishing: "furnished",
    features: { parking: true, lift: true, generator: true, gas: true, water: true, security: true, cctv: true, communitySpace: true },
    rentDetails: { monthly: 32000, advanceMonths: 3, serviceCharge: 3000, parkingCharge: 2000 },
    rentalPolicy: { allowedTenants: ["family", "professionals"], guests: true, cooking: true },
    photos: [pic("apartment,balcony", 51), pic("livingroom,modern", 52), pic("kitchen,modern", 53)],
  },
  {
    name: "Shefali Villa — নিচতলা ২ বেডরুম বাসা", propertyType: "house",
    description: "মিরপুর ১৩-তে স্বতন্ত্র বাড়ির নিচতলা। ছোট উঠান, আলাদা প্রবেশপথ।",
    address: { area: "Mirpur 13", district: "Dhaka", city: "Dhaka", division: "Dhaka", road: "Road 2", landmark: "মিরপুর ১৩ কাঁচাবাজারের কাছে" },
    bedrooms: 2, bathrooms: 1, balconies: 1, floor: 0, totalFloors: 3, sizeSqft: 850, furnishing: "unfurnished",
    features: { gas: true, water: true, security: true, caretaker: true },
    rentDetails: { monthly: 15000, advanceMonths: 2, serviceCharge: 500 },
    rentalPolicy: { allowedTenants: ["family"], guests: true, cooking: true },
    photos: [pic("house,exterior", 61), pic("house,room", 62)],
  },
  {
    name: "Sky Garden — ১ বেডরুম স্টুডিও", propertyType: "flat",
    description: "মিরপুর ২-এ কম খরচে ১ বেডরুমের স্টুডিও ফ্ল্যাট। একক ব্যক্তি বা নবদম্পতির জন্য।",
    address: { area: "Mirpur 2", district: "Dhaka", city: "Dhaka", division: "Dhaka", block: "Block B", landmark: "মিরপুর ২ ফায়ার সার্ভিসের কাছে" },
    bedrooms: 1, bathrooms: 1, balconies: 1, floor: 7, totalFloors: 10, sizeSqft: 520, furnishing: "furnished",
    features: { lift: true, generator: true, gas: true, water: true, wifi: true, security: true, cctv: true },
    rentDetails: { monthly: 13500, advanceMonths: 2, serviceCharge: 900 },
    rentalPolicy: { allowedTenants: ["professionals", "family"], guests: true, cooking: true },
    photos: [pic("studio,apartment", 71), pic("apartment,cozy", 72)],
  },
  {
    name: "Palli Bandhu — ৪ বেডরুম ডুপ্লেক্স", propertyType: "family_residence",
    description: "মিরপুর ১৪-তে দোতলা ডুপ্লেক্স ইউনিট। বড় পরিবারের জন্য প্রশস্ত, দুটি বারান্দা ও স্টোর রুম।",
    address: { area: "Mirpur 14", district: "Dhaka", city: "Dhaka", division: "Dhaka", road: "Main Road", landmark: "মিরপুর ১৪ বাসস্ট্যান্ড থেকে ৩ মিনিট" },
    bedrooms: 4, bathrooms: 3, balconies: 2, floor: 3, totalFloors: 6, sizeSqft: 1800, furnishing: "semi_furnished",
    features: { parking: true, lift: true, generator: true, gas: true, water: true, security: true, cctv: true, rooftop: true },
    rentDetails: { monthly: 38000, advanceMonths: 3, serviceCharge: 3500, parkingCharge: 2000 },
    rentalPolicy: { allowedTenants: ["family"], familyOnly: true, guests: true, cooking: true },
    photos: [pic("house,modern", 81), pic("livingroom,large", 82), pic("bedroom,spacious", 83)],
  },
];

/* ---------------- account reviews (roll into reputation) ---------------- */
// Indexes reference LISTINGS above.
const REVIEWS = [
  {
    p: 0, rating: 4, verified: true, title: "মোটামুটি ভালো অভিজ্ঞতা",
    body: "দুই বছর ছিলাম। বাড়িওয়ালা ভদ্র, ভাড়া সময়মতো নিলে ঝামেলা করেন না। মাঝেমধ্যে পানির চাপ কম থাকে, তবে জেনারেটর ব্যাকআপ ভালো। পরিবার নিয়ে থাকার জন্য ঠিক আছে।",
    cats: { landlordBehavior: 4, privacy: 4, maintenance: 3, communication: 4, agreementFairness: 4, depositHandling: 4, safety: 4, valueForMoney: 4 },
    pros: ["ভদ্র বাড়িওয়ালা", "ভালো জেনারেটর ব্যাকআপ"], cons: ["সকালে পানির চাপ কম"],
    wouldRentAgain: true, wouldRecommend: true, createdAt: daysAgo(30),
    response: "পানির সমস্যার জন্য নতুন পাম্প বসানো হয়েছে, এখন সমাধান হয়ে গেছে।",
  },
  {
    p: 0, rating: 3, title: "লিফট নিয়ে ভোগান্তি",
    body: "ফ্ল্যাট ভালো, কিন্তু লিফট প্রায়ই নষ্ট থাকে আর মেরামতে দেরি হয়। সার্ভিস চার্জ নিয়মিত দিতে হয়। বাকিটা সহনীয়।",
    cats: { landlordBehavior: 3, maintenance: 2, communication: 3, safety: 4, valueForMoney: 3 },
    cons: ["লিফট মেরামতে দেরি"], wouldRentAgain: false, wouldRecommend: false, createdAt: daysAgo(14),
  },
  {
    p: 1, rating: 4, verified: true, title: "প্রফেশনালদের জন্য সুবিধাজনক",
    body: "বাস স্ট্যান্ডের কাছে হওয়ায় যাতায়াত সহজ। ২ বেডরুম ছোট পরিবারের জন্য যথেষ্ট। বাড়িওয়ালা সমস্যা জানালে দ্রুত সাড়া দেন।",
    cats: { landlordBehavior: 4, privacy: 4, maintenance: 4, communication: 4, agreementFairness: 4, valueForMoney: 4, safety: 4 },
    pros: ["যাতায়াত সুবিধা", "দ্রুত সাড়া"], wouldRentAgain: true, wouldRecommend: true, createdAt: daysAgo(22),
  },
  {
    p: 2, rating: 2, title: "প্রাইভেসি নিয়ে সমস্যা",
    body: "পুরো ফ্লোর পাওয়া যায়, জায়গা প্রচুর। কিন্তু কেয়ারটেকার আর বাড়িওয়ালা না বলে ঢুকে পড়েন। কয়েকবার বলার পরও অভ্যাস বদলায়নি।",
    cats: { landlordBehavior: 2, privacy: 1, maintenance: 3, communication: 2, safety: 3, valueForMoney: 3 },
    cons: ["না বলে ফ্ল্যাটে ঢোকা"], wouldRentAgain: false, wouldRecommend: false, createdAt: daysAgo(19),
    response: "ভবিষ্যতে যেকোনো প্রবেশের আগে অন্তত একদিন আগে জানানো হবে — দুঃখিত।",
  },
  {
    p: 4, rating: 5, verified: true, title: "লেক ফেসিং, দারুণ আলো-বাতাস",
    body: "লেকের দিকে বারান্দা, সারাদিন রোদ পড়ে। ফার্নিশড অবস্থায় পেয়েছি, সিকিউরিটি ভালো। ভাড়া একটু বেশি হলেও এলাকা বিবেচনায় ঠিক আছে।",
    cats: { landlordBehavior: 5, privacy: 5, maintenance: 4, communication: 5, agreementFairness: 4, depositHandling: 5, safety: 5, valueForMoney: 4 },
    pros: ["লেক ভিউ", "ভালো নিরাপত্তা", "ফার্নিশড"], wouldRentAgain: true, wouldRecommend: true, createdAt: daysAgo(9),
  },
  {
    p: 5, rating: 4, title: "স্বাধীন বাসা, শান্ত এলাকা",
    body: "নিচতলা আলাদা প্রবেশপথসহ, নিজের মতো থাকা যায়। কাঁচাবাজার কাছে। গ্যাসের চাপ সন্ধ্যায় কম থাকে মাঝেমধ্যে।",
    cats: { landlordBehavior: 4, privacy: 5, maintenance: 3, communication: 4, safety: 4, valueForMoney: 4 },
    pros: ["আলাদা প্রবেশপথ", "শান্ত এলাকা"], cons: ["সন্ধ্যায় গ্যাসের চাপ কম"],
    wouldRentAgain: true, wouldRecommend: true, createdAt: daysAgo(6),
  },
  {
    p: 7, rating: 4, verified: true, title: "বড় পরিবারের জন্য প্রশস্ত",
    body: "ডুপ্লেক্স হওয়ায় জায়গা অনেক, ছেলেমেয়েদের আলাদা রুম দেওয়া গেছে। রুফটপ ব্যবহার করা যায়। ভাড়া বেশি, কিন্তু সেই অনুযায়ী সুবিধাও আছে।",
    cats: { landlordBehavior: 4, privacy: 4, maintenance: 4, communication: 3, agreementFairness: 4, safety: 4, valueForMoney: 3 },
    pros: ["প্রশস্ত", "রুফটপ অ্যাক্সেস"], cons: ["ভাড়া তুলনামূলক বেশি"],
    wouldRentAgain: true, wouldRecommend: true, createdAt: daysAgo(4),
  },
];

async function uniqueSlug(Model, base) {
  let slug = base || "x";
  let n = 1;
  while (await Model.findOne({ slug })) slug = `${base}-${n++}`;
  return slug;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log("Clearing previous demo data…");

  const oldTenant = await User.findOne({ email: TENANT_EMAIL });
  const oldLandlord = await User.findOne({ email: LANDLORD_EMAIL });
  if (oldTenant) {
    const rs = await Report.find({ submittedBy: oldTenant._id }).select("_id");
    await ReportConfirmation.deleteMany({ report: { $in: rs.map((r) => r._id) } });
    await Report.deleteMany({ submittedBy: oldTenant._id });
    await Review.deleteMany({ author: oldTenant._id });
    await RentalRelationship.deleteMany({ tenant: oldTenant._id });
  }
  if (oldLandlord) {
    await Property.deleteMany({ listedBy: oldLandlord._id });
    await Landlord.deleteMany({ claimedBy: oldLandlord._id });
  }
  await User.deleteMany({ email: { $in: [TENANT_EMAIL, LANDLORD_EMAIL] } });

  console.log("Creating demo users…");
  const tenant = await User.create({
    displayName: "Demo Tenant", email: TENANT_EMAIL, passwordHash: PASSWORD,
    role: "tenant", isEmailVerified: true, trustLevel: 2,
  });
  const landlordUser = await User.create({
    displayName: "Demo Landlord", email: LANDLORD_EMAIL, passwordHash: PASSWORD,
    role: "landlord", isEmailVerified: true, trustLevel: 2,
  });
  const landlord = await Landlord.create({
    name: "Demo Landlord", slug: await uniqueSlug(Landlord, "demo-landlord"),
    claimedBy: landlordUser._id, isClaimable: false, isVerified: true,
    bio: "Demo landlord profile for RentCheck BD sample data.",
  });

  console.log("Creating Mirpur reports…");
  for (const r of REPORTS) {
    const doc = await Report.create({
      ...r, city: "Dhaka", division: "Dhaka", status: "APPROVED",
      submittedBy: tenant._id, moderation: { riskFlags: [] },
    });
    for (let i = 0; i < Math.min(r.confirmations || 0, 3); i++) {
      await ReportConfirmation.create({ report: doc._id, anonTokenHash: `demo-${doc._id}-${i}` });
    }
  }

  console.log("Creating Mirpur listings…");
  const properties = [];
  for (const l of LISTINGS) {
    const slug = await uniqueSlug(Property, slugify(`${l.address.area}-${l.name}`, { lower: true, strict: true }));
    const p = new Property({
      ...l, slug, landlord: landlord._id, listedBy: landlordUser._id, listingStatus: "available", isVerified: true,
      address: { addressLine: l.address.landmark || l.address.area, ...l.address },
      coverPhoto: l.photos[0],
      contact: { name: "Demo Landlord", phone: "01700000000", whatsapp: "01700000000", showPhone: true, showWhatsapp: true, allowMessages: true },
      rent: { min: l.rentDetails.monthly, max: l.rentDetails.monthly },
    });
    await p.save();
    properties.push(p);
  }

  console.log("Creating account reviews…");
  for (const rv of REVIEWS) {
    const property = properties[rv.p];
    if (!property) continue;
    let rel = null;
    if (rv.verified) {
      rel = await RentalRelationship.create({
        tenant: tenant._id, property: property._id, landlord: landlord._id,
        startDate: daysAgo(400), endDate: daysAgo(30), status: "VERIFIED", reviewedBy: landlordUser._id,
      });
    }
    await Review.create({
      author: tenant._id, property: property._id, landlord: landlord._id, rentalRelationship: rel?._id || null,
      reviewType: "property", overallRating: rv.rating, categoryRatings: rv.cats || {},
      wouldRentAgain: rv.wouldRentAgain, wouldRecommend: rv.wouldRecommend,
      title: rv.title, body: rv.body, pros: rv.pros || [], cons: rv.cons || [], tags: ["demo"],
      isVerified: !!rv.verified, status: "APPROVED", createdAt: rv.createdAt || daysAgo(15),
      landlordResponse: rv.response ? { body: rv.response, respondedAt: daysAgo(2) } : undefined,
    });
  }

  console.log("Rolling up reputation…");
  for (const p of properties) await recalculatePropertyReputation(p._id);
  await recalculateLandlordReputation(landlord._id);

  console.log("\nDemo data ready.");
  console.log(`  Tenant  : ${TENANT_EMAIL} / ${PASSWORD}`);
  console.log(`  Landlord: ${LANDLORD_EMAIL} / ${PASSWORD}`);
  console.log(`  ${REPORTS.length} reports · ${LISTINGS.length} listings · ${REVIEWS.length} reviews — all in Mirpur, Dhaka.`);
  console.log("  Delete any of it from the admin or landlord dashboard.\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
