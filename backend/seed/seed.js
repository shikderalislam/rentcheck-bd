// DEVELOPMENT ONLY — do not run against production database.
import dotenv from "dotenv";
import mongoose from "mongoose";
import slugify from "slugify";
import User from "../models/User.js";
import Landlord from "../models/Landlord.js";
import Property from "../models/Property.js";
import RentalRelationship from "../models/RentalRelationship.js";
import Review from "../models/Review.js";
import { recalculatePropertyReputation, recalculateLandlordReputation } from "../controllers/reviewController.js";

dotenv.config();

const AREAS = [
  { area: "Mirpur 10", district: "Dhaka", city: "Dhaka", division: "Dhaka" },
  { area: "Dhanmondi", district: "Dhaka", city: "Dhaka", division: "Dhaka" },
  { area: "Uttara Sector 7", district: "Dhaka", city: "Dhaka", division: "Dhaka" },
  { area: "Banani", district: "Dhaka", city: "Dhaka", division: "Dhaka" },
  { area: "Bashundhara R/A", district: "Dhaka", city: "Dhaka", division: "Dhaka" },
];

const AMENITIES = ["Lift", "Generator", "Parking", "Gas Line", "Security Guard", "CCTV", "Rooftop Access"];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Clearing existing dev data...");

  await Promise.all([
    User.deleteMany({}),
    Landlord.deleteMany({}),
    Property.deleteMany({}),
    RentalRelationship.deleteMany({}),
    Review.deleteMany({}),
  ]);

  console.log("Creating admin + tenant users...");
  const admin = await User.create({
    displayName: "RentCheck Admin",
    email: "admin@rentcheckbd.dev",
    passwordHash: "Admin@12345",
    role: "admin",
    isEmailVerified: true,
  });

  const tenants = [];
  for (let i = 1; i <= 15; i++) {
    tenants.push(
      await User.create({
        displayName: `Tenant User ${i}`,
        email: `tenant${i}@rentcheckbd.dev`,
        passwordHash: "Tenant@12345",
        role: "tenant",
        isEmailVerified: true,
      })
    );
  }

  console.log("Creating landlords...");
  const landlords = [];
  for (let i = 1; i <= 20; i++) {
    const name = `${rand(["Green", "Silver", "Riverside", "City", "Sunrise", "Metro"])} Properties ${i}`;
    landlords.push(
      await Landlord.create({
        name,
        slug: slugify(name, { lower: true, strict: true }),
        isVerified: Math.random() > 0.5,
        bio: "DEVELOPMENT SEED DATA — property management group.",
      })
    );
  }

  console.log("Creating properties...");
  const properties = [];
  for (let i = 1; i <= 50; i++) {
    const loc = rand(AREAS);
    const landlord = rand(landlords);
    const name = `${rand(["Green View", "Sunrise", "Riverside", "City Heights", "Comfort"])} Apartment ${i}`;
    const rentMin = randInt(12, 45) * 1000;
    properties.push(
      await Property.create({
        name,
        slug: slugify(`${loc.city}-${loc.area}-${name}-${i}`, { lower: true, strict: true }),
        landlord: landlord._id,
        propertyType: rand(["apartment", "flat", "house", "room"]),
        address: { addressLine: `Road ${randInt(1, 20)}, ${loc.area}`, ...loc },
        bedrooms: randInt(1, 4),
        bathrooms: randInt(1, 3),
        approxSizeSqft: randInt(600, 2200),
        amenities: [rand(AMENITIES), rand(AMENITIES), rand(AMENITIES)],
        photos: [],
        rent: { min: rentMin, max: rentMin + randInt(2, 8) * 1000 },
        deposit: rentMin * 2,
        isVerified: Math.random() > 0.4,
      })
    );
  }

  console.log("Creating rental relationships + reviews (DEVELOPMENT ONLY)...");
  for (let i = 0; i < 100; i++) {
    const tenant = rand(tenants);
    const property = rand(properties);
    const status = Math.random() > 0.3 ? "VERIFIED" : "PENDING";

    const relationship = await RentalRelationship.create({
      tenant: tenant._id,
      property: property._id,
      landlord: property.landlord,
      startDate: new Date(Date.now() - randInt(60, 900) * 24 * 60 * 60 * 1000),
      status,
    });

    if (i < 110) {
      const overall = randInt(2, 5);
      await Review.create({
        author: tenant._id,
        property: property._id,
        landlord: property.landlord,
        rentalRelationship: relationship._id,
        reviewType: "property",
        overallRating: overall,
        categoryRatings: {
          landlordBehavior: randInt(2, 5),
          privacy: randInt(2, 5),
          maintenance: randInt(2, 5),
          communication: randInt(2, 5),
          agreementFairness: randInt(2, 5),
          depositHandling: randInt(2, 5),
          serviceQuality: randInt(2, 5),
          safety: randInt(2, 5),
          valueForMoney: randInt(2, 5),
        },
        wouldRentAgain: overall >= 3,
        wouldRecommend: overall >= 4,
        title: overall >= 4 ? "Good experience overall" : "Mixed experience",
        body:
          overall >= 4
            ? "DEVELOPMENT SEED REVIEW — Communication was respectful and maintenance requests were handled quickly."
            : "DEVELOPMENT SEED REVIEW — Maintenance requests sometimes took a few days to resolve.",
        pros: overall >= 4 ? ["Responsive landlord", "Clean building"] : ["Good location"],
        cons: overall >= 4 ? [] : ["Slow maintenance", "Occasional noise"],
        tags: ["seed-data"],
        isVerified: status === "VERIFIED",
        status: "APPROVED",
      });
    }
  }

  console.log("Recalculating reputations...");
  for (const p of properties) await recalculatePropertyReputation(p._id);
  for (const l of landlords) await recalculateLandlordReputation(l._id);

  console.log("\nSeed complete.");
  console.log(`Admin login: admin@rentcheckbd.dev / Admin@12345`);
  console.log(`Sample tenant login: tenant1@rentcheckbd.dev / Tenant@12345`);
  console.log("ALL SEED DATA IS FOR DEVELOPMENT ONLY.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
