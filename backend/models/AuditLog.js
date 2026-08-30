import mongoose from "mongoose";

// Append-only trail of every trust-sensitive action: moderation decisions,
// verification outcomes, landlord claims, suspensions, reputation recalcs.
// Never store PII, raw evidence, or document contents here — only references,
// state changes, and short reasons.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null = system / anonymous
    actorRole: { type: String, default: "" },

    action: { type: String, required: true }, // e.g. "review.moderate", "landlord.claim.approve"
    entityType: {
      type: String,
      required: true,
      enum: ["Review", "RentalRelationship", "Landlord", "Property", "User", "Report", "ReviewReport"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },

    fromState: { type: String, default: "" },
    toState: { type: String, default: "" },
    reason: { type: String, default: "", maxlength: 1000 },

    // Small, non-sensitive context only (counts, flag names, decision inputs).
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
