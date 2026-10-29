// Stock: per-size validation, all-or-nothing reservation and giving units back.
// The product model's database calls are replaced by an in-memory stand-in that applies the same
// conditional update ({ stock.size: { $gte: n } } + $inc) MongoDB would.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const { default: productModel } = await import("../models/productModel.js");
const { reserveStock, releaseStock, OrderValidationError } = await import("../controllers/orderController.js");
const { validateProductFields } = await import("../controllers/productController.js");
const { unitsLeft } = await import("../utils/stock.js");

let db;
beforeEach(() => {
  db = {
    tee: { _id: "tee", name: "Tee", stock: { S: 2, M: 0 } },
    jeans: { _id: "jeans", name: "Jeans", stock: { L: 5 } }, // XL not tracked
  };
});

productModel.updateOne = async (filter, update) => {
  const product = db[filter._id];
  const [path, cond] = Object.entries(filter).find(([k]) => k.startsWith("stock."));
  const size = path.slice("stock.".length);
  const has = product && Object.hasOwn(product.stock, size);
  const ok = cond.$exists ? has : has && product.stock[size] >= cond.$gte;
  if (ok) product.stock[size] += update.$inc[path];
  return { modifiedCount: ok ? 1 : 0 };
};
productModel.findById = (id) => ({ select: () => ({ lean: async () => (db[id] ? structuredClone(db[id]) : null) }) });

test("reserves tracked sizes and marks them; untracked sizes pass through", async () => {
  const items = await reserveStock([
    { _id: "tee", size: "S", quantity: 2 },
    { _id: "jeans", size: "XL", quantity: 3 },
  ]);
  assert.equal(db.tee.stock.S, 0);
  assert.deepEqual(items.map((i) => i.stockReserved), [true, false]);
});

test("all or nothing: a sold-out item rolls back the items already reserved", async () => {
  await assert.rejects(
    reserveStock([
      { _id: "jeans", size: "L", quantity: 2 },
      { _id: "tee", size: "M", quantity: 1 },
    ]),
    (e) => e instanceof OrderValidationError && /Tee in size M is sold out/.test(e.message)
  );
  assert.equal(db.jeans.stock.L, 5, "jeans units were given back");
});

test("asking for more than is left says how many remain", async () => {
  await assert.rejects(reserveStock([{ _id: "tee", size: "S", quantity: 3 }]), /Only 2 left of Tee in size S/);
  assert.equal(db.tee.stock.S, 2);
});

test("the last unit can only be sold once", async () => {
  db.tee.stock.S = 1;
  const results = await Promise.allSettled([1, 2].map(() => reserveStock([{ _id: "tee", size: "S", quantity: 1 }])));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(db.tee.stock.S, 0);
});

test("releasing gives back only reserved items, and nothing for sizes no longer tracked", async () => {
  await releaseStock([
    { _id: "tee", size: "S", quantity: 1, stockReserved: true },
    { _id: "jeans", size: "L", quantity: 4, stockReserved: false },
    { _id: "jeans", size: "XL", quantity: 1, stockReserved: true },
  ]);
  assert.equal(db.tee.stock.S, 3);
  assert.equal(db.jeans.stock.L, 5);
  assert.equal(Object.hasOwn(db.jeans.stock, "XL"), false);
});

test("unitsLeft treats a size without an entry as untracked", () => {
  assert.equal(unitsLeft({ stock: { S: 0 } }, "S"), 0);
  assert.equal(unitsLeft({ stock: { S: 0 } }, "M"), Infinity);
  assert.equal(unitsLeft({}, "S"), Infinity);
});

test("product stock validation keeps selected sizes and whole numbers only", () => {
  const base = { name: "Tee", description: "Cotton", price: "999", category: "Men", subCategory: "Topwear", sizes: '["S","M"]' };
  assert.equal(validateProductFields(base).fields.stock, undefined, "no stock sent: current levels are kept");
  assert.deepEqual(validateProductFields({ ...base, stock: '{"S":"4","M":"","XL":"9"}' }).fields.stock, { S: 4 });
  assert.match(validateProductFields({ ...base, stock: '{"S":-1}' }).error, /whole number/);
  assert.match(validateProductFields({ ...base, stock: '{"S":2.5}' }).error, /whole number/);
  assert.match(validateProductFields({ ...base, stock: "[1,2]" }).error, /Invalid stock/);
});
