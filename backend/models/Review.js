import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord", required: true },
    rentalRelationship: { type: mongoose.Schema.Types.ObjectId, ref: "RentalRelationship", default: null },

    reviewType: { type: String, enum: ["property", "landlord"], required: true },

    overallRating: { type: Number, min: 1, max: 5, required: true },
    categoryRatings: {
      landlordBehavior: { type: Number, min: 1, max: 5 },
      privacy: { type: Number, min: 1, max: 5 },
      maintenance: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      agreementFairness: { type: Number, min: 1, max: 5 },
      depositHandling: { type: Number, min: 1, max: 5 },
      serviceQuality: { type: Number, min: 1, max: 5 },
      safety: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 },
    },

    wouldRentAgain: { type: Boolean },
    wouldRecommend: { type: Boolean },

    title: { type: String, maxlength: 120 },
    body: { type: String, required: true, maxlength: 3000 },
    pros: [{ type: String, maxlength: 200 }],
    cons: [{ type: String, maxlength: 200 }],
    tags: [{ type: String }],
    photos: [{ type: String }],

    isVerified: { type: Boolean, default: false }, // mirrors rentalRelationship.status === VERIFIED

    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_REVIEW", "APPROVED", "REJECTED", "HIDDEN", "DISPUTED", "REMOVED"],
      default: "SUBMITTED",
    },

    moderation: {
      riskScore: { type: Number, default: 0 },
      flags: [{ type: String }], // e.g. "possible_pii", "possible_spam"
      moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      moderatedAt: { type: Date },
      note: { type: String },
      openReportCount: { type: Number, default: 0 }, // distinct unresolved reporters
    },

    landlordResponse: {
      body: { type: String, maxlength: 1500 },
      respondedAt: { type: Date },
    },

    helpfulVotes: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviewSchema.index({ property: 1, status: 1 });
reviewSchema.index({ landlord: 1, status: 1 });

export default mongoose.model("Review", reviewSchema);
