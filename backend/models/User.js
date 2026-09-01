import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { roleGroup, dashboardPath } from "../utils/roles.js";

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["tenant", "landlord", "property_manager", "moderator", "admin", "super_admin"],
      default: "tenant",
    },
    avatarUrl: { type: String, default: "" },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationSentAt: { type: Date },
    profileVisibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    // Private fields — never returned in public serialization
    phone: { type: String, select: false },
    trustLevel: { type: Number, default: 0 }, // 0 unverified ... 4 highly trusted
    isSuspended: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    // Lightweight sign-in telemetry for the admin dashboard (no IP stored).
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Public-safe projection — used whenever a user object is sent to the client
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    role: this.role,
    roleGroup: roleGroup(this.role),
    dashboard: dashboardPath(this.role),
    isEmailVerified: this.isEmailVerified,
    trustLevel: this.trustLevel,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
