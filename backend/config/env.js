// Central configuration helpers. Only variable NAMES are ever logged — never their values.
// Values are read lazily (functions) so they reflect the environment after dotenv has loaded.

export const isProduction = () => process.env.NODE_ENV === "production";

const trimSlash = (url) => (url || "").trim().replace(/\/+$/, "");

// Required for the API to work at all / for a core feature
const REQUIRED = [
  "MONGODB_URI",
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "CLOUDINARY_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_SECRET_KEY",
  "FRONTEND_URL",
];
// Optional: the related feature is switched off when missing
const OPTIONAL = ["STRIPE_SECRET_KEY", "BACKEND_URL", "ADMIN_URL"];

export const checkConfig = () => {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  const missingOptional = OPTIONAL.filter((name) => !process.env[name]);

  if (missing.length) console.error(`[config] Missing environment variables: ${missing.join(", ")}`);
  if (missingOptional.length) console.warn(`[config] Not set (related features disabled): ${missingOptional.join(", ")}`);
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn("[config] JWT_SECRET is shorter than 32 characters — use a long random value");
  }

  // Without a database or a signing secret nothing can work safely: stop instead of half-running
  if (isProduction()) {
    const fatal = ["MONGODB_URI", "JWT_SECRET"].filter((name) => !process.env[name]);
    if (fatal.length) throw new Error(`Missing required configuration: ${fatal.join(", ")}`);
  }
  return { missing, missingOptional };
};

// Public URLs. In development they fall back to the local dev servers; in production they must be set.
export const frontendUrl = () => trimSlash(process.env.FRONTEND_URL) || (isProduction() ? "" : "http://localhost:5173");
export const adminUrl = () => trimSlash(process.env.ADMIN_URL) || (isProduction() ? "" : "http://localhost:5174");
export const backendUrl = () =>
  trimSlash(process.env.BACKEND_URL) || (isProduction() ? "" : `http://localhost:${process.env.PORT || 4000}`);

// Browser origins allowed to call the API: storefront + admin (+ optional extras, e.g. preview domains)
export const allowedOrigins = () => {
  const extra = (process.env.CORS_ORIGINS || "").split(",").map(trimSlash).filter(Boolean);
  const dev = isProduction() ? [] : ["http://localhost:5173", "http://localhost:5174"];
  return [...new Set([frontendUrl(), adminUrl(), ...extra, ...dev].filter(Boolean))];
};

export const isCloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_SECRET_KEY);
