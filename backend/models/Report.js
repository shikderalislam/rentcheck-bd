import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "APPROVED" },
  },
  { timestamps: true }
);

// An anonymous, account-free rental experience about a landlord / house / area.
// Intentionally NOT tied to a specific Property/Landlord record so anyone can
// post without the property already existing in our directory.
//
// This platform is about rental experience & landlord/property reputation only.
// It stores NO monetary claims, payment amounts or "amount claimed" data.
const reportSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        "landlord_behavior",
        "privacy_intrusion",
        "excessive_rules",
        "maintenance_ignored",
        "sudden_rent_increase",
        "extra_charges_demanded",
        "advance_refund_problem",
        "guest_policy",
        "parking",
        "water",
        "gas",
        "electricity",
        "security",
        "noise",
        "unsafe_conditions",
        "positive_experience",
        "other",
      ],
      required: true,
    },
    issueTitle: { type: String, required: true, maxlength: 150 },

    // Approximate location only — never a specific address / unit number.
    city: { type: String, required: true },
    division: { type: String, required: true },
    area: { type: String, default: "" },
    propertyName: { type: String, default: "", maxlength: 160 }, // house / building name, optional

    // How long the tenant lived there (optional).
    rentalDuration: {
      type: String,
      enum: ["", "lt_6m", "6_12m", "1_2y", "2y_plus"],
      default: "",
    },

    // 1-5 overall landlord rating (optional at this stage).
    overallRating: { type: Number, min: 1, max: 5 },

    // Optional 1-5 category ratings.
    categoryRatings: {
      behavior: { type: Number, min: 1, max: 5 },
      privacy: { type: Number, min: 1, max: 5 },
      maintenance: { type: Number, min: 1, max: 5 },
      rentFairness: { type: Number, min: 1, max: 5 },
      advanceRefund: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      rules: { type: Number, min: 1, max: 5 },
    },

    // Structured multi-select tags (optional).
    issues: [{ type: String }],
    positives: [{ type: String }],

    // "Would you recommend renting here?" (optional).
    recommendation: { type: String, enum: ["", "yes", "maybe", "no"], default: "" },

    communicationQuality: {
      type: String,
      enum: ["", "no_response", "hostile", "delayed", "dismissive", "cooperative"],
      default: "",
    },
    landlordBehavior: { type: String, default: "", maxlength: 1000 },

    description: { type: String, required: true, maxlength: 2000 },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "DISPUTED"],
      default: "PENDING",
    },

    // "I had a similar experience" — one per person, enforced via the
    // ReportConfirmation collection. This denormalized counter is what the UI reads.
    confirmations: { type: Number, default: 0 },

    comments: { type: [commentSchema], default: [] },

    moderation: {
      moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      moderatedAt: { type: Date },
      note: { type: String },
      riskFlags: [{ type: String }],
    },

    // Set only when a logged-in user submits. Private — never in toPublicJSON,
    // visible only to admins in the dashboard.
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, select: false },

    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedAt: { type: Date },

    // Coarse, one-way, rotating fingerprint for basic abuse throttling only.
    // Never a raw IP, never PII, never exposed.
    submissionFingerprint: { type: String, select: false },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ status: 1, confirmations: -1 });
reportSchema.index({ status: 1, overallRating: -1 });
reportSchema.index({ division: 1, status: 1 });
reportSchema.index({ area: 1, status: 1 });

reportSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    category: this.category,
    issueTitle: this.issueTitle,
    city: this.city,
    division: this.division,
    area: this.area,
    propertyName: this.propertyName,
    rentalDuration: this.rentalDuration,
    overallRating: this.overallRating ?? null,
    categoryRatings: this.categoryRatings || {},
    issues: this.issues || [],
    positives: this.positives || [],
    recommendation: this.recommendation || "",
    communicationQuality: this.communicationQuality || "",
    landlordBehavior: this.landlordBehavior || "",
    description: this.description,
    status: this.status,
    confirmations: this.confirmations,
    commentCount: this.comments.filter((c) => c.status === "APPROVED").length,
    comments: this.comments
      .filter((c) => c.status === "APPROVED")
      .map((c) => ({ id: c._id, body: c.body, createdAt: c.createdAt })),
    createdAt: this.createdAt,
  };
};

// A trimmed projection for feed cards — no full description, no comments.
reportSchema.methods.toCardJSON = function () {
  const text = this.description || "";
  return {
    id: this._id,
    category: this.category,
    issueTitle: this.issueTitle,
    area: this.area,
    city: this.city,
    division: this.division,
    propertyName: this.propertyName,
    overallRating: this.overallRating ?? null,
    issues: (this.issues || []).slice(0, 3),
    excerpt: text.length > 180 ? text.slice(0, 180).trimEnd() + "…" : text,
    confirmations: this.confirmations,
    commentCount: this.comments.filter((c) => c.status === "APPROVED").length,
    status: this.status,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("Report", reportSchema);
