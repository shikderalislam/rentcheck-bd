import mongoose from "mongoose";

const landlordSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    logoUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 1000 },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isVerified: { type: Boolean, default: false },
    isClaimable: { type: Boolean, default: true },

    // Private — never exposed publicly
    nidNumber: { type: String, select: false },
    privatePhone: { type: String, select: false },
    privateEmail: { type: String, select: false },

    // Denormalized, recalculated reputation snapshot.
    // `overall` is the display mean; `bayesian` is prior-shrunk and is what
    // ranking/sorting should use; `confidence` is a 0-1 Wilson trust score.
    reputation: {
      overall: { type: Number, default: 0 }, // 0-5 display mean
      bayesian: { type: Number, default: 0 }, // 0-5 prior-shrunk, for ranking
      confidence: { type: Number, default: 0 }, // 0-1 Wilson lower bound
      communication: { type: Number, default: 0 },
      privacy: { type: Number, default: 0 },
      maintenance: { type: Number, default: 0 },
      fairness: { type: Number, default: 0 },
      depositHandling: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      verifiedReviewCount: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 }, // %
      trend: { type: String, enum: ["improving", "stable", "declining", "insufficient_data"], default: "insufficient_data" },
    },

    badges: [{ type: String }], // e.g. "highly_rated", "responsive_landlord"
  },
  { timestamps: true }
);

landlordSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    logoUrl: this.logoUrl,
    bio: this.bio,
    isVerified: this.isVerified,
    isClaimable: this.isClaimable && !this.claimedBy,
    reputation: this.reputation,
    badges: this.badges,
  };
};

export default mongoose.model("Landlord", landlordSchema);
