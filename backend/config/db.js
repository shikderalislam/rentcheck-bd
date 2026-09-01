import mongoose from "mongoose";

// Connects to MongoDB with retry. Does NOT exit the process on a *connection*
// failure — the HTTP server stays up so the platform sees a live port and
// /api/health can report the DB state (and the real error is visible in logs).
// A *missing* MONGO_URI is a config error, so that still fails fast.
export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri || typeof uri !== "string") {
    console.error(
      "\n[startup] MONGO_URI is not set.\n" +
        "  Set it as an environment variable on your host (Railway/Render -> Variables).\n" +
        "  It must include the database name and NO angle brackets, e.g.:\n" +
        "  mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/rentcheck_bd?retryWrites=true&w=majority\n"
    );
    process.exit(1);
  }

  const opts = { serverSelectionTimeoutMS: 10000 };
  let attempt = 0;

  const tryConnect = async () => {
    attempt += 1;
    try {
      const conn = await mongoose.connect(uri, opts);
      console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    } catch (err) {
      console.error(`[db] connection attempt ${attempt} failed: ${err.message}`);
      if (/authentication failed|bad auth/i.test(err.message)) {
        console.error("[db] -> the username or password in MONGO_URI is wrong (check for stray < > brackets).");
      } else if (/ENOTFOUND|querySrv|ETIMEOUT|timed out|ECONNREFUSED/i.test(err.message)) {
        console.error("[db] -> host unreachable. In MongoDB Atlas: Network Access -> allow 0.0.0.0/0.");
      }
      if (attempt < 10) {
        setTimeout(tryConnect, 8000);
      } else {
        console.error("[db] giving up after 10 attempts. The API is up but database calls will fail until this is fixed.");
      }
    }
  };

  await tryConnect();
};
