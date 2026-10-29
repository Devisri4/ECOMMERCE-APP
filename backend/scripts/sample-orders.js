// Realistic sample orders for the portfolio demo, so the admin dashboard and charts show a working store.
// They use the live catalogue (current prices), fictional Indian customers and @example.com emails, are
// spread over the last 60 days, and never hold stock. They all belong to SAMPLE_USER_ID, which is not a
// real account, so no shopper ever sees them, and they can all be removed in one step.
//
//   Preview only (default, read-only):  node scripts/sample-orders.js
//   Add them (writes to MongoDB):       node scripts/sample-orders.js --apply
//   Remove them all again:              node scripts/sample-orders.js --remove
import "dotenv/config";
import path from "path";
import { pathToFileURL } from "url";
import mongoose from "mongoose";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { DEFAULT_DB_NAME } from "../config/mongodb.js";
import { deliveryCharge, ORDER_CURRENCY, SAMPLE_USER_ID } from "../controllers/orderController.js";

export { SAMPLE_USER_ID };
export const SAMPLE_COUNT = 25;
const DAY = 24 * 60 * 60 * 1000;

const FIRST = ["Aarav", "Ananya", "Rohan", "Priya", "Karthik", "Sneha", "Vikram", "Meera", "Arjun", "Divya", "Rahul", "Kavya", "Nikhil", "Pooja", "Siddharth", "Lakshmi", "Aditya", "Neha", "Varun", "Shreya"];
const LAST = ["Sharma", "Reddy", "Iyer", "Nair", "Patel", "Gupta", "Rao", "Menon", "Singh", "Kulkarni", "Das", "Joshi", "Verma", "Pillai", "Chopra"];
const PLACES = [
  { city: "Hyderabad", state: "Telangana", zip: "500034" }, { city: "Bengaluru", state: "Karnataka", zip: "560038" },
  { city: "Chennai", state: "Tamil Nadu", zip: "600017" }, { city: "Mumbai", state: "Maharashtra", zip: "400050" },
  { city: "Pune", state: "Maharashtra", zip: "411001" }, { city: "Kochi", state: "Kerala", zip: "682016" },
  { city: "Ahmedabad", state: "Gujarat", zip: "380009" }, { city: "Jaipur", state: "Rajasthan", zip: "302001" },
  { city: "Kolkata", state: "West Bengal", zip: "700019" }, { city: "New Delhi", state: "Delhi", zip: "110017" },
  { city: "Visakhapatnam", state: "Andhra Pradesh", zip: "530003" }, { city: "Lucknow", state: "Uttar Pradesh", zip: "226010" },
];
const STREETS = ["MG Road", "Park Street", "Anna Salai", "Linking Road", "FC Road", "Residency Road", "Jubilee Hills Road No. 5", "Lake View Colony", "Gandhi Nagar Main Road", "Station Road"];

// Small seeded random generator (mulberry32), so the same sample set comes out every time
const seeded = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Status follows age: a week or more → delivered, newer orders still moving through fulfilment
const statusFor = (ageDays, rand) => {
  if (rand() < 0.08) return "Cancelled";
  if (ageDays >= 7) return "Delivered";
  if (ageDays >= 4) return rand() < 0.5 ? "Out for delivery" : "Shipped";
  if (ageDays >= 2) return "Packing";
  return "Order Placed";
};

// Pure: builds the sample orders from the catalogue (exported for tests)
export const buildSampleOrders = (products, now = Date.now(), seed = 2026) => {
  const rand = seeded(seed);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const usable = products.filter((p) => Array.isArray(p.sizes) && p.sizes.length && p.price > 0);
  if (usable.length === 0) return [];

  return Array.from({ length: SAMPLE_COUNT }, () => {
    // Skewed towards recent days, like a store that is picking up
    const ageDays = Math.floor(Math.pow(rand(), 1.6) * 60);
    const day = new Date(now - ageDays * DAY);
    day.setHours(9 + Math.floor(rand() * 13), Math.floor(rand() * 60), 0, 0);
    const date = Math.min(day.getTime(), now);

    const lines = 1 + Math.floor(rand() * 3);
    const items = [];
    for (let i = 0; i < lines; i++) {
      const { stock, rating, reviewCount, __v, ...product } = pick(usable); // eslint-disable-line no-unused-vars
      items.push({ ...product, size: pick(product.sizes), quantity: rand() < 0.8 ? 1 : 2, stockReserved: false });
    }
    const amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0) + deliveryCharge;

    const first = pick(FIRST), last = pick(LAST), place = pick(PLACES);
    const status = statusFor(ageDays, rand);
    const paymentMethod = rand() < 0.6 ? "Stripe" : "COD";
    return {
      userId: SAMPLE_USER_ID,
      items,
      amount,
      address: {
        firstName: first, lastName: last,
        email: `${first}.${last}@example.com`.toLowerCase(),
        street: `${10 + Math.floor(rand() * 290)}, ${pick(STREETS)}`,
        city: place.city, state: place.state, zipcode: place.zip, country: "India",
        phone: `9${String(Math.floor(rand() * 1e9)).padStart(9, "0")}`,
      },
      status,
      paymentMethod,
      // Card orders are paid at checkout; cash on delivery counts as paid once delivered
      payment: paymentMethod === "Stripe" ? status !== "Cancelled" : status === "Delivered",
      date,
      currency: ORDER_CURRENCY,
      holdsStock: false,
    };
  });
};

const main = async () => {
  const args = process.argv.slice(2);
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME });

  if (args.includes("--remove")) {
    const { deletedCount } = await orderModel.deleteMany({ userId: SAMPLE_USER_ID });
    console.log(`Removed ${deletedCount} sample orders.`);
    return;
  }

  const existing = await orderModel.countDocuments({ userId: SAMPLE_USER_ID });
  const orders = buildSampleOrders(await productModel.find({}).lean());
  const total = orders.reduce((sum, o) => sum + o.amount, 0);
  const byStatus = orders.reduce((acc, o) => ({ ...acc, [o.status]: (acc[o.status] || 0) + 1 }), {});
  console.log(`${orders.length} sample orders, ₹${total.toLocaleString("en-IN")} in total, over the last 60 days.`);
  console.table(byStatus);

  if (!args.includes("--apply")) {
    console.log("Preview only — nothing written. To add them: node scripts/sample-orders.js --apply");
    return;
  }
  if (existing > 0) throw new Error(`${existing} sample orders already exist. Run with --remove first to replace them.`);
  await orderModel.insertMany(orders);
  console.log(`Added ${orders.length} sample orders.`);
};

// Run only from the command line (tests import buildSampleOrders without touching the database)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
