// Small, deletable demo dataset so the app is not blank on first host.
//
//   npm run seed:demo
//
// Creates: 1 demo tenant + 1 demo landlord (both email-verified), a landlord
// profile, 4 approved Mirpur rental-experience reports, and 4 Mirpur property
// listings (flat / apartment / building / bachelor). Re-running wipes the
// previous demo rows first. Everything is normal data — delete any of it from
// the admin or landlord dashboard.
import dotenv from "dotenv";
import mongoose from "mongoose";
import slugify from "slugify";
import User from "../models/User.js";
import Landlord from "../models/Landlord.js";
import Property from "../models/Property.js";
import Report from "../models/Report.js";
import ReportConfirmation from "../models/ReportConfirmation.js";

dotenv.config();

const TENANT_EMAIL = "demo.tenant@rentcheckbd.com";
const LANDLORD_EMAIL = "demo.landlord@rentcheckbd.com";
const PASSWORD = "Demo@12345";

const img = (seed) => `https://picsum.photos/seed/${seed}/900/560`;
const daysAgo = (d) => new Date(Date.now() - d * 864e5);

const REPORTS = [
  {
    category: "water",
    issueTitle: "উপরের তলায় সকালে পানি থাকে না",
    area: "Mirpur 10",
    propertyName: "",
    rentalDuration: "1_2y",
    overallRating: 2,
    categoryRatings: { maintenance: 2, communication: 2, behavior: 3 },
    issues: ["water", "maintenance_problem"],
    positives: ["good_security"],
    recommendation: "no",
    communicationQuality: "delayed",
    landlordBehavior: "পানির পাম্প দুর্বল, বারবার বলার পরও ঠিক করেনি।",
    description:
      "মিরপুর ১০-এ পাঁচতলা ভবনের উপরের তলাগুলোতে সকাল ৭টা থেকে ১০টা পর্যন্ত পানি প্রায় থাকেই না। মাসের পর মাস বলার পরও পাম্প বা রিজার্ভ ট্যাংকের ব্যবস্থা নেয়নি।",
    createdAt: daysAgo(5),
    confirmations: 9,
  },
  {
    category: "sudden_rent_increase",
    issueTitle: "নোটিশ ছাড়াই ভাড়া বাড়িয়ে দিয়েছে",
    area: "Mirpur 11",
    rentalDuration: "2y_plus",
    overallRating: 2,
    categoryRatings: { rentFairness: 1, communication: 2, behavior: 2 },
    issues: ["sudden_rent_hike", "unreasonable_rules"],
    recommendation: "maybe",
    communicationQuality: "dismissive",
    landlordBehavior: "বছর না ঘুরতেই মুখে মুখে ভাড়া বাড়ানোর কথা বলে চাপ দেয়।",
    description:
      "চুক্তিতে বছরে একবার ভাড়া রিভিউয়ের কথা থাকলেও ৮ মাসের মাথায় কোনো লিখিত নোটিশ ছাড়াই ২০০০ টাকা ভাড়া বাড়িয়ে দেওয়া হয়েছে। আপত্তি করলে বাসা ছাড়ার কথা বলে।",
    createdAt: daysAgo(8),
    confirmations: 14,
  },
  {
    category: "privacy_intrusion",
    issueTitle: "বাড়িওয়ালা প্রায়ই না বলে ফ্ল্যাটে ঢোকেন",
    area: "Mirpur 12",
    rentalDuration: "6_12m",
    overallRating: 1,
    categoryRatings: { privacy: 1, behavior: 2, rules: 2 },
    issues: ["privacy", "excessive_monitoring", "unreasonable_rules"],
    recommendation: "no",
    communicationQuality: "hostile",
    landlordBehavior: "নিজের চাবি দিয়ে অনুপস্থিতিতে ফ্ল্যাটে ঢুকে যান।",
    description:
      "বাড়িওয়ালা আগে না জানিয়ে, কখনও আমরা বাসায় না থাকলেও নিজের চাবি দিয়ে ফ্ল্যাটে ঢোকেন — 'দেখভাল' করার কথা বলে। প্রাইভেসির চরম লঙ্ঘন।",
    createdAt: daysAgo(12),
    confirmations: 21,
  },
  {
    category: "maintenance_ignored",
    issueTitle: "লিফট মাসের পর মাস নষ্ট, মেরামত হয় না",
    area: "Mirpur 10",
    rentalDuration: "1_2y",
    overallRating: 3,
    categoryRatings: { maintenance: 2, communication: 3, behavior: 3 },
    issues: ["maintenance_problem"],
    positives: ["good_environment"],
    recommendation: "maybe",
    communicationQuality: "delayed",
    description:
      "৮তলা ভবনে লিফট প্রায় দুই মাস ধরে নষ্ট। বয়স্ক ভাড়াটিয়াদের জন্য খুবই কষ্টকর। সার্ভিস চার্জ ঠিকই নেয়, কিন্তু মেকানিক আনতে গড়িমসি করে।",
    createdAt: daysAgo(3),
    confirmations: 6,
  },
];

const LISTINGS = [
  {
    name: "Green View — ৩ বেডরুম ফ্যামিলি ফ্ল্যাট",
    propertyType: "flat",
    description: "মিরপুর ১০-এর কাছে, খোলামেলা ৩ বেডরুমের ফ্যামিলি ফ্ল্যাট। লিফট, জেনারেটর ও গ্যাস সংযোগ আছে।",
    address: { area: "Mirpur 10", district: "Dhaka", city: "Dhaka", division: "Dhaka", road: "Road 7", landmark: "মিরপুর ১০ গোল চত্বর থেকে ৫ মিনিট" },
    bedrooms: 3, bathrooms: 2, balconies: 2, floor: 5, totalFloors: 8, sizeSqft: 1250, furnishing: "semi_furnished",
    features: { parking: true, lift: true, generator: true, gas: true, water: true, security: true, cctv: true },
    rentDetails: { monthly: 25000, advanceMonths: 3, serviceCharge: 2000, parkingCharge: 1500 },
    rentalPolicy: { allowedTenants: ["family"], familyOnly: true, guests: true, cooking: true },
    photos: [img("mirpur10a"), img("mirpur10b"), img("mirpur10c")],
  },
  {
    name: "Sunny Corner — ২ বেডরুম অ্যাপার্টমেন্ট",
    propertyType: "apartment",
    description: "মিরপুর ১১-এ ছিমছাম ২ বেডরুমের অ্যাপার্টমেন্ট। ছোট পরিবার বা প্রফেশনালদের জন্য উপযুক্ত।",
    address: { area: "Mirpur 11", district: "Dhaka", city: "Dhaka", division: "Dhaka", block: "Block C", landmark: "মিরপুর ১১ বাস স্ট্যান্ডের কাছে" },
    bedrooms: 2, bathrooms: 2, balconies: 1, floor: 3, totalFloors: 6, sizeSqft: 900, furnishing: "unfurnished",
    features: { lift: true, generator: true, gas: true, water: true, security: true },
    rentDetails: { monthly: 18000, advanceMonths: 2, serviceCharge: 1200 },
    rentalPolicy: { allowedTenants: ["family", "professionals"], guests: true, cooking: true },
    photos: [img("mirpur11a"), img("mirpur11b")],
  },
  {
    name: "Rahman Residence — ভবনের ফ্যামিলি ইউনিট",
    propertyType: "building",
    description: "মিরপুর ১২-তে নিরিবিলি এলাকায় পুরো একটি ফ্লোর। বড় পরিবারের জন্য আদর্শ।",
    address: { area: "Mirpur 12", district: "Dhaka", city: "Dhaka", division: "Dhaka", road: "Avenue 3", landmark: "মিরপুর ১২ মসজিদের পাশে" },
    bedrooms: 4, bathrooms: 3, balconies: 3, floor: 2, totalFloors: 5, sizeSqft: 1600, furnishing: "unfurnished",
    features: { parking: true, lift: true, generator: true, gas: true, water: true, security: true, caretaker: true, rooftop: true },
    rentDetails: { monthly: 30000, advanceMonths: 3, serviceCharge: 2500, parkingCharge: 1500 },
    rentalPolicy: { allowedTenants: ["family"], familyOnly: true, guests: true, cooking: true },
    photos: [img("mirpur12a"), img("mirpur12b"), img("mirpur12c")],
  },
  {
    name: "Metro Nest — ব্যাচেলর ফ্ল্যাট",
    propertyType: "bachelor_room",
    description: "মিরপুর ১-এ মেট্রো স্টেশনের কাছে ব্যাচেলরদের জন্য ফ্ল্যাট। ৪ জন পর্যন্ত থাকা যায়।",
    address: { area: "Mirpur 1", district: "Dhaka", city: "Dhaka", division: "Dhaka", block: "Block A", landmark: "মিরপুর ১ মেট্রো স্টেশন থেকে হাঁটা দূরত্ব" },
    bedrooms: 2, bathrooms: 1, balconies: 1, floor: 4, totalFloors: 7, sizeSqft: 650, furnishing: "semi_furnished",
    features: { lift: true, generator: true, gas: true, water: true, wifi: true, security: true },
    rentDetails: { monthly: 12000, advanceMonths: 2, serviceCharge: 800 },
    rentalPolicy: { allowedTenants: ["bachelor", "students", "male"], guests: false, cooking: true, subletting: false },
    photos: [img("mirpur1a"), img("mirpur1b")],
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
  console.log("Connected. Clearing previous demo data…");

  const oldTenant = await User.findOne({ email: TENANT_EMAIL });
  const oldLandlord = await User.findOne({ email: LANDLORD_EMAIL });
  if (oldTenant) {
    const rs = await Report.find({ submittedBy: oldTenant._id }).select("_id");
    await ReportConfirmation.deleteMany({ report: { $in: rs.map((r) => r._id) } });
    await Report.deleteMany({ submittedBy: oldTenant._id });
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
      ...r,
      city: "Dhaka",
      division: "Dhaka",
      status: "APPROVED",
      submittedBy: tenant._id,
      moderation: { riskFlags: [] },
    });
    // seed a couple of real confirmation rows so the counter isn't fake-only
    const n = Math.min(r.confirmations || 0, 3);
    for (let i = 0; i < n; i++) {
      await ReportConfirmation.create({ report: doc._id, anonTokenHash: `demo-${doc._id}-${i}` });
    }
  }

  console.log("Creating Mirpur listings…");
  for (const l of LISTINGS) {
    const slug = await uniqueSlug(Property, slugify(`${l.address.area}-${l.name}`, { lower: true, strict: true }));
    const p = new Property({
      ...l,
      slug,
      landlord: landlord._id,
      listedBy: landlordUser._id,
      listingStatus: "available",
      address: { addressLine: l.address.landmark || l.address.area, ...l.address },
      coverPhoto: l.photos[0],
      contact: { name: "Demo Landlord", phone: "01700000000", whatsapp: "01700000000", showPhone: true, showWhatsapp: true, allowMessages: true },
      rent: { min: l.rentDetails.monthly, max: l.rentDetails.monthly },
    });
    await p.save();
  }

  console.log("\nDemo data ready.");
  console.log(`  Tenant  : ${TENANT_EMAIL} / ${PASSWORD}`);
  console.log(`  Landlord: ${LANDLORD_EMAIL} / ${PASSWORD}`);
  console.log(`  ${REPORTS.length} reports, ${LISTINGS.length} listings in Mirpur, Dhaka.`);
  console.log("  Delete any of it from the admin or landlord dashboard.\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
