import mongoose from "mongoose";
import { isProduction } from "./env.js";

// The database is selected with the `dbName` option (default "e-commerce", the existing database),
// so MONGODB_URI can be a standard connection string with or without ?options. No silent fallback:
// in production a missing URI or failed connection is logged clearly instead of switching databases.
export const DEFAULT_DB_NAME = "e-commerce";

mongoose.connection.on("connected", () => console.log("DB Connected"));
mongoose.connection.on("error", (err) => console.error("MongoDB connection error:", err.message));

let pending = null; // the connection attempt in progress, shared by concurrent callers

const connectDB = async () => {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    if (isProduction()) {
      console.error("MONGODB_URI is not set — the API cannot reach the database");
      return;
    }
    uri = "mongodb://127.0.0.1:27017";
    console.warn("MONGODB_URI is not set — using a local MongoDB for development");
  }

  pending ??= mongoose
    // Give up after 5s (not the default 30s), so a database outage fails fast instead of timing out on Vercel
    .connect(uri, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME, serverSelectionTimeoutMS: 5000 })
    .catch((error) => console.error("MongoDB connection failed:", error.message))
    .finally(() => { pending = null; });
  await pending;
};

// Every API request waits for the database before running:
// - no connection (e.g. the first attempt failed, which Mongoose doesn't retry): start a new attempt;
// - a connection still being set up (a fresh Vercel instance): wait for it, instead of letting the
//   query give up after Mongoose's 10-second buffer while the connection is slow to open.
export const ensureDB = async (req, res, next) => {
  const state = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting
  if (state === 0) await connectDB();
  else if (state === 2) await (pending ?? mongoose.connection.asPromise().catch(() => {}));
  next();
};

export default connectDB;
