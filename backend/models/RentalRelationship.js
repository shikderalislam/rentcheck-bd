import mongoose from "mongoose";

const rentalRelationshipSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord", required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date },

    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "EXPIRED"],
      default: "PENDING",
    },

    // Evidence metadata only — actual files live in private storage, referenced by key
    evidence: [
      {
        type: { type: String, enum: ["agreement", "payment_proof", "utility_bill", "confirmation", "other"] },
        fileKey: { type: String }, // private storage key, never a public URL
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewNote: { type: String, default: "" },
  },
  { timestamps: true }
);

rentalRelationshipSchema.index({ tenant: 1, property: 1 }, { unique: false });

export default mongoose.model("RentalRelationship", rentalRelationshipSchema);
