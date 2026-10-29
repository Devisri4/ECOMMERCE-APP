// Address/phone validation, product validation, INR order settings and the order currency default.
// Pure functions only — no database or network.
import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const { validateAddress, OrderValidationError, ORDER_CURRENCY, deliveryCharge } = await import("../controllers/orderController.js");
const { validateProductFields } = await import("../controllers/productController.js");
const { default: orderModel } = await import("../models/orderModel.js");

const good = {
  firstName: "Devi", lastName: "Sri", email: "devi@gmail.com", street: "12 Main Street",
  city: "Hyderabad", state: "Telangana", zipcode: "501506", country: "India", phone: "9876543210",
};

test("valid Indian address passes and is trimmed", () => {
  const clean = validateAddress({ ...good, city: "  Hyderabad  ", extra: "dropped" });
  assert.equal(clean.city, "Hyderabad");
  assert.equal(clean.extra, undefined);
});

for (const phone of ["6123456789", "7000000000", "8888888888", "9876543210"]) {
  test(`phone ${phone} is accepted`, () => assert.doesNotThrow(() => validateAddress({ ...good, phone })));
}

for (const phone of ["5876543210", "0987654321", "987654321", "98765432101", "+919876543210", "98765-43210", "98765 43210", "abcdefghij"]) {
  test(`phone "${phone}" is rejected`, () =>
    assert.throws(() => validateAddress({ ...good, phone }), (e) => e instanceof OrderValidationError && /mobile number/.test(e.message)));
}

test("other address rules still apply", () => {
  assert.throws(() => validateAddress({ ...good, city: "g45g" }), /city/);
  assert.throws(() => validateAddress({ ...good, zipcode: "rtf54" }), /ZIP/);
  assert.throws(() => validateAddress(undefined), /delivery details/);
});

test("new orders are INR with a ₹99 delivery charge", () => {
  assert.equal(ORDER_CURRENCY, "INR");
  assert.equal(deliveryCharge, 99);
});

test("orders without a stored currency read as USD; new INR orders keep INR", () => {
  const legacy = orderModel.hydrate({ _id: new mongoose.Types.ObjectId(), userId: "u", items: [], amount: 191, address: {}, paymentMethod: "COD", date: 1 });
  assert.equal(legacy.currency, "USD");
  const fresh = new orderModel({ userId: "u", items: [], amount: 2898, address: {}, paymentMethod: "COD", date: 1, currency: ORDER_CURRENCY });
  assert.equal(fresh.currency, "INR");
  assert.ok(new orderModel({ userId: "u", items: [], amount: 1, address: {}, paymentMethod: "COD", date: 1, currency: "EUR" }).validateSync());
});

test("product validation", () => {
  const base = { name: "Tee", description: "Cotton", price: "2799", category: "Men", subCategory: "Topwear", sizes: '["S","M"]', bestseller: "true" };
  const ok = validateProductFields(base);
  assert.deepEqual(ok.fields.sizes, ["S", "M"]);
  assert.equal(ok.fields.price, 2799);
  assert.equal(ok.fields.bestseller, true);
  assert.match(validateProductFields({ ...base, price: "0" }).error, /Price/);
  for (const price of ["99.5", "Infinity", "1e9", "-5"]) assert.match(validateProductFields({ ...base, price }).error, /whole number/);
  assert.match(validateProductFields({ ...base, category: "Pets" }).error, /category/);
  assert.match(validateProductFields({ ...base, sizes: '["XXXL"]' }).error, /size/);
  assert.match(validateProductFields({ ...base, name: " " }).error, /required/);
});

test("catalogue reprice divides by 3, ends in 99 and keeps the order", async () => {
  const { repriced } = await import("../scripts/reprice-products.js");
  assert.equal(repriced(1999), 699);
  assert.equal(repriced(3699), 1199);
  assert.equal(repriced(7599), 2499);
  assert.equal(repriced(500), 299, "never below the minimum");
  const before = [1999, 2299, 3699, 4599, 6099, 7599];
  const after = before.map(repriced);
  assert.deepEqual(after, [...after].sort((a, b) => a - b));
});

test("test-order clean-up flags USD orders and junk addresses, keeps real and demo orders", async () => {
  const { testOrderReason } = await import("../scripts/cleanup-test-orders.js");
  const { DEMO_ORDER_ADDRESS } = await import("../controllers/orderController.js");
  assert.equal(testOrderReason({ currency: "INR", address: good }), null);
  assert.equal(testOrderReason({ currency: "INR", address: { ...DEMO_ORDER_ADDRESS } }), null);
  assert.match(testOrderReason({ address: good }), /US dollars/);
  assert.match(testOrderReason({ currency: "INR", address: { ...good, city: "rgfdv1", zipcode: "x" } }), /address fails/);
  assert.match(testOrderReason({ currency: "INR", address: { ...good, city: "wsfWsd", state: "rgfdv", country: "efsd" } }), /country/);
  assert.match(testOrderReason({ currency: "INR", address: { ...good, state: "rgfdv" } }), /state/);
});

test("sample orders are realistic, rupee-priced, consistent and never hold stock", async () => {
  const { buildSampleOrders, SAMPLE_USER_ID, SAMPLE_COUNT } = await import("../scripts/sample-orders.js");
  const { testOrderReason } = await import("../scripts/cleanup-test-orders.js");
  const products = [
    { _id: "a", name: "Tee", price: 699, sizes: ["S", "M"], stock: { S: 3 }, rating: 4, reviewCount: 1 },
    { _id: "b", name: "Jacket", price: 2499, sizes: ["L"] },
  ];
  const now = Date.now();
  const orders = buildSampleOrders(products, now);
  assert.equal(orders.length, SAMPLE_COUNT);
  assert.deepEqual(buildSampleOrders(products, now), orders, "same seed, same orders");
  for (const o of orders) {
    assert.equal(o.userId, SAMPLE_USER_ID);
    assert.equal(testOrderReason(o), null, "would pass the test-order clean-up");
    assert.equal(o.amount, o.items.reduce((s, i) => s + i.price * i.quantity, 0) + deliveryCharge);
    assert.ok(o.items.every((i) => i.stockReserved === false && i.stock === undefined && products.find((p) => p._id === i._id).sizes.includes(i.size)));
    assert.ok(o.date <= now && o.date > now - 61 * 864e5);
    if (o.status === "Cancelled") assert.equal(o.payment, false);
    if (o.paymentMethod === "COD") assert.equal(o.payment, o.status === "Delivered");
  }
});

test("product rename gives every product a unique name that matches its category and garment", async () => {
  const { planRenames } = await import("../scripts/rename-products.js");
  const products = [
    ...Array.from({ length: 9 }, (_, i) => ({ _id: `m${i}`, name: "Men Round Neck Pure Cotton T-shirt", category: i < 7 ? "Men" : "Kids", date: i })),
    { _id: "g1", name: "Girls Round Neck Cotton Top", category: "Women", date: 20 },
    { _id: "g2", name: "Girls Round Neck Cotton Top", category: "Kids", date: 21 },
    { _id: "j1", name: "Men Slim Fit Relaxed Denim Jacket", category: "Men", date: 22 },
  ];
  const plan = planRenames(products);
  const names = plan.map((r) => r.after);
  assert.equal(new Set(names).size, names.length, "all unique");
  const byId = Object.fromEntries(plan.map((r) => [r._id, r.after]));
  assert.match(byId.m0, /^Men Classic Cotton T-shirt$/);
  assert.match(byId.m8, /^Kids \w+ Cotton T-shirt$/, "category Kids gets a Kids name");
  assert.match(byId.g1, /^Women \w+ Cotton Top$/);
  assert.match(byId.g2, /^Girls \w+ Cotton Top$/);
  assert.match(byId.j1, /Denim Jacket$/);
});
