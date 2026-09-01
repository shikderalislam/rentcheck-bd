import mongoose from "mongoose";

// One row per (report, confirmer). A confirmer is either a logged-in user or an
// anonymous browser identified by a hashed, rotating token cookie — never a raw
// IP. The partial unique indexes make a second confirmation from the same
// person impossible at the database level.
const reportConfirmationSchema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    anonTokenHash: { type: String, default: null, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reportConfirmationSchema.index(
  { report: 1, user: 1 },
  { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
);
reportConfirmationSchema.index(
  { report: 1, anonTokenHash: 1 },
  { unique: true, partialFilterExpression: { anonTokenHash: { $type: "string" } } }
);

export default mongoose.model("ReportConfirmation", reportConfirmationSchema);
