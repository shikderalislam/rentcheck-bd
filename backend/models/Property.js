import mongoose from "mongoose";

export const PROPERTY_TYPES = [
  "apartment",
  "flat",
  "house",
  "room",
  "sublet",
  "hostel_mess",
  "bachelor_room",
  "family_residence",
  "building",
  "shared_apartment",
  "hostel",
  "other",
];
export const LISTING_STATUSES = ["draft", "available", "rented", "coming_soon"];
export const FURNISHING = ["", "unfurnished", "semi_furnished", "furnished"];
export const ALLOWED_TENANTS = ["family", "bachelor", "female", "male", "students", "professionals"];

const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord", required: true },
    propertyManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // The landlord user who created this listing (for ownership checks).
    listedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    propertyType: { type: String, enum: PROPERTY_TYPES, required: true },
    listingStatus: { type: String, enum: LISTING_STATUSES, default: "draft", index: true },
    purpose: { type: String, enum: ["rent", "sale"], default: "rent" },
    description: { type: String, default: "", maxlength: 3000 },

    address: {
      addressLine: { type: String, required: true },
      area: { type: String, required: true, index: true },
      district: { type: String, required: true, index: true },
      city: { type: String, required: true, index: true },
      division: { type: String, required: true },
      road: { type: String, default: "" },
      block: { type: String, default: "" },
      landmark: { type: String, default: "" }, // approximate — e.g. "Near Mirpur 10 bus stand"
    },
    // Approximate coordinates only — never expose exact unit-level location
    location: { lat: { type: Number }, lng: { type: Number }, mapUrl: { type: String, default: "" } },

    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    balconies: { type: Number, default: 0 },
    floor: { type: Number },
    totalFloors: { type: Number },
    sizeSqft: { type: Number },
    approxSizeSqft: { type: Number }, // legacy alias, kept in sync on save
    furnishing: { type: String, enum: FURNISHING, default: "" },

    features: {
      parking: { type: Boolean, default: false },
      lift: { type: Boolean, default: false },
      generator: { type: Boolean, default: false },
      gas: { type: Boolean, default: false },
      water: { type: Boolean, default: false },
      electricityBackup: { type: Boolean, default: false },
      security: { type: Boolean, default: false },
      cctv: { type: Boolean, default: false },
      caretaker: { type: Boolean, default: false },
      wifi: { type: Boolean, default: false },
      rooftop: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      communitySpace: { type: Boolean, default: false },
      washingFacility: { type: Boolean, default: false },
    },

    amenities: [{ type: String }], // free-form extras
    coverPhoto: { type: String, default: "" },
    photos: [{ type: String }],

    rent: { min: { type: Number, required: true }, max: { type: Number, required: true } }, // kept for search
    deposit: { type: Number, default: 0 },
    rentDetails: {
      monthly: { type: Number },
      advanceMonths: { type: Number },
      serviceCharge: { type: Number },
      electricity: { type: Number },
      gas: { type: Number },
      water: { type: Number },
      internet: { type: Number },
      parkingCharge: { type: Number },
      otherCharges: { type: Number },
      otherChargesNote: { type: String, default: "" },
    },
    availableFrom: { type: Date },

    rentalPolicy: {
      allowedTenants: [{ type: String, enum: ALLOWED_TENANTS }],
      pets: { type: Boolean, default: false },
      smoking: { type: Boolean, default: false },
      subletting: { type: Boolean, default: false },
      guests: { type: Boolean, default: true },
      cooking: { type: Boolean, default: true },
      officeUse: { type: Boolean, default: false },
      familyOnly: { type: Boolean, default: false },
      notes: { type: String, default: "", maxlength: 1000 },
    },

    // Contact — free for both sides. Landlord controls what is shown.
    contact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
      showPhone: { type: Boolean, default: true },
      showWhatsapp: { type: Boolean, default: true },
      allowMessages: { type: Boolean, default: true },
    },

    isVerified: { type: Boolean, default: false },
    isPromoted: { type: Boolean, default: false }, // featured listing — never affects rating

    reputation: {
      overall: { type: Number, default: 0 },
      bayesian: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
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
propertySchema.index({ listingStatus: 1, isDeleted: 1, createdAt: -1 });

// Keep the search-facing rent range and legacy size in sync with the listing values.
propertySchema.pre("save", function (next) {
  const m = this.rentDetails?.monthly;
  if (typeof m === "number" && m > 0) this.rent = { min: m, max: m };
  if (typeof this.sizeSqft === "number") this.approxSizeSqft = this.sizeSqft;
  next();
});

propertySchema.methods.toPublicJSON = function () {
  const o = this.toObject();
  delete o.listedBy;
  delete o.__v;
  delete o.isDeleted;
  return { id: this._id, ...o, _id: undefined };
};

export default mongoose.model("Property", propertySchema);
