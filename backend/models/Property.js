import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord", required: true },
    propertyManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    propertyType: {
      type: String,
      enum: ["apartment", "flat", "house", "building", "room", "shared_apartment", "hostel"],
      required: true,
    },

    address: {
      addressLine: { type: String, required: true },
      area: { type: String, required: true, index: true },
      district: { type: String, required: true, index: true },
      city: { type: String, required: true, index: true },
      division: { type: String, required: true },
    },

    // Approximate coordinates only — never expose exact unit-level location
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    approxSizeSqft: { type: Number },
    amenities: [{ type: String }],
    photos: [{ type: String }],

    rent: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    deposit: { type: Number, default: 0 },

    isVerified: { type: Boolean, default: false },
    isPromoted: { type: Boolean, default: false }, // featured listing — never affects rating

    reputation: {
      overall: { type: Number, default: 0 }, // 0-5 display mean
      bayesian: { type: Number, default: 0 }, // 0-5 prior-shrunk, for ranking
      confidence: { type: Number, default: 0 }, // 0-1 Wilson lower bound
      privacy: { type: Number, default: 0 },
      maintenance: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      fairness: { type: Number, default: 0 },
      safety: { type: Number, default: 0 },
      value: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      verifiedReviewCount: { type: Number, default: 0 },
      trend: { type: String, enum: ["improving", "stable", "declining", "insufficient_data"], default: "insufficient_data" },
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

propertySchema.index({ name: "text", "address.area": "text", "address.district": "text", "address.city": "text" });

propertySchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    landlord: this.landlord,
    propertyType: this.propertyType,
    address: this.address,
    location: this.location,
    bedrooms: this.bedrooms,
    bathrooms: this.bathrooms,
    approxSizeSqft: this.approxSizeSqft,
    amenities: this.amenities,
    photos: this.photos,
    rent: this.rent,
    deposit: this.deposit,
    isVerified: this.isVerified,
    isPromoted: this.isPromoted,
    reputation: this.reputation,
  };
};

export default mongoose.model("Property", propertySchema);
