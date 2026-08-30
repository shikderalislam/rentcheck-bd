import mongoose from "mongoose";

// One row per person who flags a review. Replaces the old naive counter on
// Review so we can dedupe reporters, capture a reason, and give moderators
// context instead of just a number.
export const REVIEW_REPORT_REASONS = [
  "false_information",
  "personal_information", // exposes PII / identifies a private individual
  "harassment_or_hate",
  "spam_or_ad",
  "wrong_property_or_landlord",
  "conflict_of_interest", // e.g. competitor / the landlord themselves
  "other",
];

const reviewReportSchema = new mongoose.Schema(
  {
    review: { type: mongoose.Schema.Types.ObjectId, ref: "Review", required: true },

    // Exactly one of these identifies the reporter, for per-reporter dedupe.
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reporterFingerprint: { type: String, default: null, select: false }, // coarse, non-PII

    reason: { type: String, enum: REVIEW_REPORT_REASONS, required: true },
    detail: { type: String, default: "", maxlength: 1000 },

    status: {
      type: String,
      enum: ["OPEN", "ACTIONED", "DISMISSED"],
      default: "OPEN",
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date },
    resolutionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

// One report per logged-in reporter per review.
reviewReportSchema.index(
  { review: 1, reporter: 1 },
  { unique: true, partialFilterExpression: { reporter: { $type: "objectId" } } }
);
// One report per anonymous fingerprint per review.
reviewReportSchema.index(
  { review: 1, reporterFingerprint: 1 },
  { unique: true, partialFilterExpression: { reporterFingerprint: { $type: "string" } } }
);
reviewReportSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model("ReviewReport", reviewReportSchema);
