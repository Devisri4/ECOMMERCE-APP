// One-time price adjustment: the INR switch multiplied the old USD prices by 85, which left the catalogue
// well above Indian high-street prices. This divides each price by 3 and rounds to the nearest price ending
// in 99 (minimum ₹299), so the order of prices stays the same. Past orders keep the prices they were placed at.
//
//   Preview only (default, read-only):   node scripts/reprice-products.js
//   Apply (writes to MongoDB):           node scripts/reprice-products.js --apply --backup scripts/backups/<file>.json
//
// --apply requires the backup file produced by a preview run, and only updates products whose current
// price still matches that backup — so it can't run twice or overwrite prices edited since then.
// To undo, the backup lists every product's previous price.
// Already applied on 2026-10-29 (catalogue now ₹699–₹2,499): do not apply it again, or prices drop another 3×.
// The prices from before that run are the "inr" values in scripts/backups/prices-usd-2026-10-27.json.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import { DEFAULT_DB_NAME } from "../config/mongodb.js";

export const PRICE_DIVISOR = 3;
export const MIN_PRICE = 299;
export const repriced = (price) => Math.max(MIN_PRICE, Math.round(price / PRICE_DIVISOR / 100) * 100 - 1);

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const backupArg = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;

  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME });

  if (!apply) {
    const products = await productModel.find({}, { name: 1, price: 1 }).sort({ price: 1 }).lean();
    const rows = products.map((p) => ({ _id: String(p._id), name: p.name, before: p.price, after: repriced(p.price) }));
    const dir = path.join("scripts", "backups");
    fs.mkdirSync(dir, { recursive: true });
    // Timestamped and written with "wx" (fail if it exists), so a second preview never replaces an earlier backup
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const file = path.join(dir, `prices-before-reprice-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), { flag: "wx" });
    console.table(rows.map(({ name, before, after }) => ({ name, before, after })));
    console.log(`Preview only — nothing written to MongoDB. Backup: ${file}`);
    console.log(`To apply: node scripts/reprice-products.js --apply --backup ${file}`);
    return;
  }

  if (!backupArg || !fs.existsSync(backupArg)) throw new Error("--apply needs --backup <file> from a preview run");
  const rows = JSON.parse(fs.readFileSync(backupArg, "utf8"));
  let updated = 0, skipped = 0;
  for (const row of rows) {
    // Only change a price that is still the one in the backup (safe to re-run)
    const res = await productModel.updateOne({ _id: row._id, price: row.before }, { $set: { price: row.after } });
    res.modifiedCount ? updated++ : skipped++;
  }
  console.log(`Updated ${updated} products, skipped ${skipped} (already changed or edited since the preview).`);
};

// Run only when called from the command line (tests import `repriced` without touching the database)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
