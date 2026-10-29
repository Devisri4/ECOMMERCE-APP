// One-time rename: the tutorial catalogue reused 10 names for 52 products (and some names clashed with their
// category, e.g. "Men … T-shirt" filed under Kids). Each product gets a unique name that keeps its garment type,
// starts with the right group for its category, and adds a neutral style word (no colours or details that
// might not match the photo). Past orders keep the names they were bought under.
//
//   Preview only (default, read-only):   node scripts/rename-products.js
//   Apply (writes to MongoDB):           node scripts/rename-products.js --apply --backup scripts/backups/<file>.json
//
// --apply needs the backup from a preview and only renames products still carrying the previewed name.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import { DEFAULT_DB_NAME } from "../config/mongodb.js";

const STYLES = ["Classic", "Everyday", "Essential", "Relaxed", "Signature", "Weekend", "Studio", "Easy", "Heritage", "Soft-Touch", "Urban", "Breeze"];

// Garment type, from the old name (order matters: "Denim Jacket" before "Jacket", "T-shirt" before "Shirt")
const garmentOf = (name) => {
  const n = name.toLowerCase();
  if (n.includes("denim jacket")) return "Denim Jacket";
  if (n.includes("jacket")) return "Zip-Front Jacket";
  if (n.includes("palazzo")) return "Palazzo Pants";
  if (n.includes("trouser")) return "Trousers";
  if (n.includes("t-shirt")) return "Cotton T-shirt";
  if (n.includes("shirt")) return "Cotton Shirt";
  if (n.includes("top")) return "Cotton Top";
  return "Essential";
};

// Group word that matches the category filter: Men, Women, or Boys / Girls / Kids
const groupOf = (product) => {
  if (product.category === "Men") return "Men";
  if (product.category === "Women") return "Women";
  const n = product.name.toLowerCase();
  return n.includes("girl") ? "Girls" : n.includes("boy") ? "Boys" : "Kids";
};

// Pure: { _id, before, after } for every product whose name changes (exported for tests)
export const planRenames = (products) => {
  const used = new Map(); // "Men|Cotton T-shirt" → next style index
  return [...products]
    .sort((a, b) => (a.date || 0) - (b.date || 0) || String(a._id).localeCompare(String(b._id)))
    .map((p) => {
      const key = `${groupOf(p)}|${garmentOf(p.name)}`;
      const i = used.get(key) || 0;
      used.set(key, i + 1);
      const style = STYLES[i % STYLES.length] + (i >= STYLES.length ? ` ${Math.floor(i / STYLES.length) + 1}` : "");
      return { _id: String(p._id), before: p.name, after: `${groupOf(p)} ${style} ${garmentOf(p.name)}` };
    })
    .filter((r) => r.before !== r.after);
};

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const backupArg = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;

  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME });

  if (!apply) {
    const products = await productModel.find({}, { name: 1, category: 1, date: 1 }).lean();
    const rows = planRenames(products);
    console.table(rows.map(({ before, after }) => ({ before, after })));
    const dir = path.join("scripts", "backups");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const file = path.join(dir, `product-names-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), { flag: "wx" });
    console.log(`Preview only — nothing renamed. Backup: ${file}`);
    console.log(`To apply: node scripts/rename-products.js --apply --backup ${file}`);
    return;
  }

  if (!backupArg || !fs.existsSync(backupArg)) throw new Error("--apply needs --backup <file> from a preview run");
  const rows = JSON.parse(fs.readFileSync(backupArg, "utf8"));
  let renamed = 0, skipped = 0;
  for (const row of rows) {
    const res = await productModel.updateOne({ _id: row._id, name: row.before }, { $set: { name: row.after } });
    res.modifiedCount ? renamed++ : skipped++;
  }
  console.log(`Renamed ${renamed} products, skipped ${skipped} (renamed or edited since the preview).`);
};

// Run only from the command line (tests import planRenames without touching the database)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
