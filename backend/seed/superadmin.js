// Creates (or updates) a super_admin account.
//
//   npm run seed:admin
//
// Reads credentials from env, falling back to sane defaults:
//   SUPERADMIN_EMAIL     (default: superadmin@rentcheckbd.com)
//   SUPERADMIN_PASSWORD  (default: ChangeMe_Admin#2026)
//   SUPERADMIN_NAME      (default: Super Admin)
//
// If the account already exists it is promoted to super_admin, un-suspended,
// email-verified, and its password is reset to the given value.
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

const email = (process.env.SUPERADMIN_EMAIL || "superadmin@rentcheckbd.com").toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe_Admin#2026";
const displayName = process.env.SUPERADMIN_NAME || "Super Admin";

if (password.length < 8) {
  console.error("SUPERADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email }).select("+passwordHash");
  if (user) {
    user.role = "super_admin";
    user.isSuspended = false;
    user.isDeleted = false;
    user.isEmailVerified = true;
    user.trustLevel = 4;
    user.passwordHash = password; // re-hashed by the pre-save hook
    if (!user.displayName) user.displayName = displayName;
    await user.save();
    console.log(`Updated existing account -> super_admin: ${email}`);
  } else {
    user = await User.create({
      displayName,
      email,
      passwordHash: password,
      role: "super_admin",
      isEmailVerified: true,
      trustLevel: 4,
    });
    console.log(`Created super_admin: ${email}`);
  }

  console.log("\n  Login at /login with:");
  console.log(`  email    : ${email}`);
  console.log(`  password : ${password}`);
  console.log("\n  Change this password after first login.\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
