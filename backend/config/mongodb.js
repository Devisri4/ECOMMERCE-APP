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
    .connect(uri, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME })
    .catch((error) => console.error("MongoDB connection failed:", error.message))
    .finally(() => { pending = null; });
  await pending;
};

// Mongoose doesn't retry a first connection that failed (e.g. the database briefly refused the server),
// so on Vercel a warm instance would keep failing every request. This retries on the next API request
// whenever there is no connection and none is in progress.
export const ensureDB = async (req, res, next) => {
  if (mongoose.connection.readyState === 0) await connectDB();
  next();
};

export default connectDB;
