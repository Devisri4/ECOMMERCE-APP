import mongoose from "mongoose";
import { isProduction } from "./env.js";

// The database is selected with the `dbName` option (default "e-commerce", the existing database),
// so MONGODB_URI can be a standard connection string with or without ?options. No silent fallback:
// in production a missing URI or failed connection is logged clearly instead of switching databases.
export const DEFAULT_DB_NAME = "e-commerce";

const connectDB = async () => {
  mongoose.connection.on("connected", () => console.log("DB Connected"));
  mongoose.connection.on("error", (err) => console.error("MongoDB connection error:", err.message));

  let uri = process.env.MONGODB_URI;
  if (!uri) {
    if (isProduction()) {
      console.error("MONGODB_URI is not set — the API cannot reach the database");
      return;
    }
    uri = "mongodb://127.0.0.1:27017";
    console.warn("MONGODB_URI is not set — using a local MongoDB for development");
  }

  try {
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
};

export default connectDB;
