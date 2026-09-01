import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri || typeof uri !== "string") {
    console.error(
      "\n[startup] MONGO_URI is not set.\n" +
        "  Set it as an environment variable on your host (Railway/Render → Variables),\n" +
        "  e.g. MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/rentcheck_bd\n" +
        "  Locally it comes from backend/.env (which is never deployed).\n"
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};
