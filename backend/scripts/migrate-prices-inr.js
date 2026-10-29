// One-time conversion of catalogue prices from USD to INR (×85, rounded to the nearest price ending in 99).
//
//   Preview only (default, read-only):   node scripts/migrate-prices-inr.js
//   Apply (writes to MongoDB):           node scripts/migrate-prices-inr.js --apply --backup scripts/backups/<file>.json
//
// --apply requires the backup file produced by a preview run, and only updates products whose current
// price still matches that backup — so it can't double-convert or overwrite prices edited since then.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import { DEFAULT_DB_NAME } from "../config/mongodb.js";

export const USD_TO_INR = 85;
export const toInr = (usd) => Math.max(99, Math.round((usd * USD_TO_INR) / 100) * 100 - 1);

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const backupArg = args[args.indexOf("--backup") + 1];

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME });

  if (!apply) {
    const products = await productModel.find({}, { name: 1, price: 1 }).lean();
    const rows = products.map((p) => ({ _id: String(p._id), name: p.name, usd: p.price, inr: toInr(p.price) }));
    const dir = path.join("scripts", "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `prices-usd-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), { flag: "wx" }); // never overwrite an earlier backup
    console.table(rows.map(({ name, usd, inr }) => ({ name, usd, inr })));
    console.log(`Preview only — nothing written to MongoDB. Backup: ${file}`);
    return;
  }

  if (!backupArg || !fs.existsSync(backupArg)) throw new Error("--apply needs --backup <file> from a preview run");
  const rows = JSON.parse(fs.readFileSync(backupArg, "utf8"));
  let updated = 0, skipped = 0;
  for (const row of rows) {
    // Only convert if the price is still the USD value from the backup (safe to re-run)
    const res = await productModel.updateOne({ _id: row._id, price: row.usd }, { $set: { price: row.inr } });
    res.modifiedCount ? updated++ : skipped++;
  }
  console.log(`Updated ${updated} products, skipped ${skipped} (already converted or edited since the backup).`);
};

// Already applied on 2026-10-27; runs only from the command line (importing it does nothing)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
