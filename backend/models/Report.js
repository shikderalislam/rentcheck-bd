import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "APPROVED" },
  },
  { timestamps: true }
);

const reportSchema = new mongoose.Schema(
  {
    // What kind of landlord/rental issue this is — intentionally NOT tied to a
    // specific Property/Landlord record, so anyone can report without needing
    // the property to already exist in our directory.
    category: {
      type: String,
      enum: [
        "deposit_not_returned",
        "unsafe_conditions",
        "harassment_privacy",
        "hidden_charges",
        "agreement_violation",
        "maintenance_ignored",
        "eviction_threat",
        "other",
      ],
      required: true,
    },
    issueTitle: { type: String, required: true, maxlength: 150 }, // e.g. "Deposit not returned after move-out"

    // Approximate location only — never a specific address
    city: { type: String, required: true },
    division: { type: String, required: true },
    area: { type: String, default: "" },

    claimedAmount: { type: Number, default: 0 }, // e.g. withheld deposit / disputed charge, in BDT

    outcome: {
      type: String,
      enum: ["paid_or_lost", "refused", "pending", "resolved_fairly"],
      required: true,
    },

    // How the landlord communicated once the problem started — optional context
    communicationQuality: {
      type: String,
      enum: ["", "no_response", "hostile", "delayed", "dismissive", "cooperative"],
      default: "",
    },
    // Free-text: how the landlord behaved / why the tenant thinks it went wrong.
    landlordBehavior: { type: String, default: "", maxlength: 1000 },

    description: { type: String, required: true, maxlength: 2000 },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    // Community signal — anyone can up/down vote a report once it is public.
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },

    comments: { type: [commentSchema], default: [] }, // anonymous public discussion on this report

    moderation: {
      moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      moderatedAt: { type: Date },
      note: { type: String },
      riskFlags: [{ type: String }],
    },

    // Never store raw IP or any identity signal — only a coarse, rotating
    // fingerprint free of personal data, used solely for basic abuse throttling.
    submissionFingerprint: { type: String, select: false },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ city: 1, division: 1 });

reportSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    category: this.category,
    issueTitle: this.issueTitle,
    city: this.city,
    division: this.division,
    area: this.area,
    claimedAmount: this.claimedAmount,
    outcome: this.outcome,
    communicationQuality: this.communicationQuality || "",
    landlordBehavior: this.landlordBehavior || "",
    description: this.description,
    status: this.status,
    upvotes: this.upvotes,
    downvotes: this.downvotes,
    score: this.upvotes - this.downvotes,
    comments: this.comments
      .filter((c) => c.status === "APPROVED")
      .map((c) => ({ id: c._id, body: c.body, createdAt: c.createdAt })),
    createdAt: this.createdAt,
  };
};

export default mongoose.model("Report", reportSchema);
