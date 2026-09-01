import mongoose from "mongoose";

// Persistent translation memory. Every string the site translates is cached
// here so we call the provider at most once per (string, target language) —
// over time the glossary fills and provider calls drop to near zero.
const translationSchema = new mongoose.Schema(
  {
    srcHash: { type: String, required: true },
    lang: { type: String, required: true, enum: ["en", "bn"] }, // target language
    src: { type: String, required: true }, // original text (trimmed)
    text: { type: String, required: true }, // translated text
    provider: { type: String, default: "" },
  },
  { timestamps: true }
);

translationSchema.index({ srcHash: 1, lang: 1 }, { unique: true });

export default mongoose.model("Translation", translationSchema);
