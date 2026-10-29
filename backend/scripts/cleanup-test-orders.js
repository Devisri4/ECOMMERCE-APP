// One-time clean-up of test orders made while the store was being built: orders still in US dollars
// (from before the INR switch) and orders whose delivery address fails today's checkout checks
// (e.g. "wsfWsd, rgfdv"). Demo-shopper orders use a valid sample address, so they are kept.
//
//   Preview only (default, read-only):   node scripts/cleanup-test-orders.js
//   Apply (writes to MongoDB):           node scripts/cleanup-test-orders.js --apply --backup scripts/backups/<file>.json
//
// The preview saves every matching order in full to a new backup file (never overwriting one).
// --apply deletes only orders listed in that backup that haven't changed since (same status, payment
// and amount), and gives back any stock they were still holding. To undo, re-insert from the backup.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import mongoose from "mongoose";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { DEFAULT_DB_NAME } from "../config/mongodb.js";
import { validateAddress } from "../controllers/orderController.js";

// The store only delivers in India. Typed-in test addresses ("rgfdv", "efsd") pass the letter-only checkout
// rules, so for this clean-up the state must also be a real Indian state or union territory.
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
].map((s) => s.toLowerCase());

// Why an order counts as test data, or null to keep it
export const testOrderReason = (order) => {
  if ((order.currency || "USD") !== "INR") return "in US dollars (before the INR switch)";
  try {
    validateAddress(order.address);
  } catch (err) {
    return `address fails checks: ${err.message}`;
  }
  const { state = "", country = "" } = order.address || {};
  if (country.trim().toLowerCase() !== "india") return "country isn't India";
  if (!INDIAN_STATES.includes(state.trim().toLowerCase())) return "state isn't an Indian state";
  return null;
};

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const backupArg = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;

  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME });

  if (!apply) {
    const orders = await orderModel.find({}).sort({ date: 1 }).lean();
    const matches = orders.map((o) => ({ order: o, reason: testOrderReason(o) })).filter((m) => m.reason);
    console.log(`${orders.length} orders in total, ${matches.length} look like test data, ${orders.length - matches.length} kept.`);
    console.table(matches.map(({ order: o, reason }) => ({
      order: "#" + String(o._id).slice(-8).toUpperCase(),
      date: new Date(o.date).toISOString().slice(0, 10),
      amount: `${o.amount} ${o.currency || "USD"}`,
      status: o.status,
      reason,
    })));
    if (matches.length === 0) return;

    const dir = path.join("scripts", "backups");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const file = path.join(dir, `test-orders-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(matches.map((m) => m.order), null, 2), { flag: "wx" });
    console.log(`Preview only — nothing deleted. Full copies saved to: ${file}`);
    console.log(`To delete them: node scripts/cleanup-test-orders.js --apply --backup ${file}`);
    return;
  }

  if (!backupArg || !fs.existsSync(backupArg)) throw new Error("--apply needs --backup <file> from a preview run");
  const saved = JSON.parse(fs.readFileSync(backupArg, "utf8"));
  let deleted = 0, skipped = 0;
  for (const o of saved) {
    // Only if it is still exactly the order that was previewed
    const removed = await orderModel.findOneAndDelete({ _id: o._id, status: o.status, payment: o.payment, amount: o.amount });
    if (!removed) { skipped++; continue; }
    deleted++;
    // Cancelled orders already gave their units back; delivered ones left the warehouse
    if (removed.status !== "Cancelled" && removed.status !== "Delivered") {
      for (const item of (removed.items || []).filter((i) => i.stockReserved)) {
        const stockPath = `stock.${item.size}`;
        await productModel.updateOne({ _id: item._id, [stockPath]: { $exists: true } }, { $inc: { [stockPath]: item.quantity } });
      }
    }
  }
  console.log(`Deleted ${deleted} test orders, skipped ${skipped} (changed or already removed since the preview).`);
};

// Run only from the command line (tests import testOrderReason without touching the database)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
