// Order state machine around card payments: settle/refund, the Stripe return link, admin status changes,
// the webhook, and demo-shopper orders. Database and Stripe calls are replaced by in-memory stand-ins that
// apply the same conditional filters ({ status: { $ne } }, { payment: false }, ...) MongoDB would.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.STRIPE_SECRET_KEY = "sk_test_offline_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
process.env.FRONTEND_URL = "https://store.example";
process.env.DEMO_CUSTOMER_EMAIL = "demo@forever-store.example";

const { default: stripe } = await import("../config/stripe.js");
const { default: orderModel } = await import("../models/orderModel.js");
const { default: userModel } = await import("../models/userModel.js");
const { default: productModel } = await import("../models/productModel.js");
const oc = await import("../controllers/orderController.js");

// ---------- in-memory database ----------
let db, calls;
const matches = (doc, filter) =>
  Object.entries(filter).every(([key, cond]) => {
    const value = key === "_id" ? String(doc._id) : doc[key];
    if (cond && typeof cond === "object" && "$ne" in cond) return value !== cond.$ne;
    if (cond && typeof cond === "object" && "$in" in cond) return cond.$in.includes(value);
    return key === "_id" ? value === String(cond) : value === cond;
  });
// Thenable query with the chain methods the controller uses
const query = (value) => ({
  then: (ok, fail) => Promise.resolve(value).then(ok, fail),
  lean() { return this; }, select() { return this; }, sort() { return this; },
});
const copy = (o) => (o ? structuredClone(o) : o);

orderModel.findById = (id) => query(copy(db.orders[String(id)]));
orderModel.findOneAndUpdate = (filter, update, opts = {}) => {
  const doc = Object.values(db.orders).find((o) => matches(o, filter));
  if (!doc) return query(null);
  const before = copy(doc);
  Object.assign(doc, update);
  return query(opts.new ? copy(doc) : before);
};
orderModel.findOneAndDelete = (filter) => {
  const doc = Object.values(db.orders).find((o) => matches(o, filter));
  if (doc) delete db.orders[String(doc._id)];
  return query(copy(doc));
};
orderModel.updateOne = async (filter, update) => {
  const doc = Object.values(db.orders).find((o) => matches(o, filter));
  if (doc) Object.assign(doc, update);
  return { modifiedCount: doc ? 1 : 0 };
};
orderModel.prototype.save = async function () { db.orders[String(this._id)] = this.toObject(); return this; };
userModel.findById = (id) => query(copy(db.users[String(id)]));
userModel.findByIdAndUpdate = async (id, update) => { calls.cartCleared.push(String(id)); Object.assign(db.users[String(id)] || {}, update); };
productModel.updateOne = async (filter, update) => { calls.stock.push({ filter, update }); return { modifiedCount: 1 }; };
productModel.find = () => query(Object.values(db.products));

// ---------- Stripe stand-in ----------
stripe.checkout.sessions.retrieve = async (id) => copy(db.sessions[id]);
stripe.checkout.sessions.expire = async (id) => {
  if (db.expireFails) throw new Error("Stripe unavailable");
  db.sessions[id].status = "expired";
  return copy(db.sessions[id]);
};
stripe.paymentIntents.retrieve = async (id) => ({ id, status: db.intentStatus || "processing" });
stripe.refunds.create = async (params, opts) => { calls.refunds.push({ params, opts }); return { id: "re_1" }; };

const ORDER = "65f1c0ffee0000000000aaaa";
const USER = "65f1c0ffee0000000000bbbb";
const cardOrder = (over = {}) => ({
  _id: ORDER, userId: USER, paymentMethod: "Stripe", payment: false, status: "Order Placed", stripeSessionId: "cs_1",
  amount: 1298, items: [{ _id: "p1", name: "Tee", size: "M", quantity: 1, price: 1199, stockReserved: true }], ...over,
});
const session = (over = {}) => ({ id: "cs_1", status: "open", payment_status: "unpaid", payment_intent: "pi_1", metadata: { orderId: ORDER }, ...over });
const mockRes = () => ({ body: null, redirected: null, statusCode: 200,
  json(b) { this.body = b; return this; }, redirect(u) { this.redirected = u; return this; }, status(c) { this.statusCode = c; return this; } });

beforeEach(() => {
  db = { orders: { [ORDER]: cardOrder() }, users: { [USER]: { _id: USER, email: "shopper@example.com", cartData: { x: 1 } } }, sessions: { cs_1: session() }, products: {} };
  calls = { refunds: [], cartCleared: [], stock: [] };
});

// ---------- settle / refund ----------
test("a confirmed payment marks an open order paid and empties the bag", async () => {
  assert.equal(await oc.settlePaidOrder(db.orders[ORDER], session({ payment_status: "paid" })), "paid");
  assert.equal(db.orders[ORDER].payment, true);
  assert.deepEqual(calls.cartCleared, [USER]);
  assert.equal(calls.refunds.length, 0);
});

test("a payment for an order cancelled first is refunded, never recorded as paid", async () => {
  db.orders[ORDER].status = "Cancelled";
  assert.equal(await oc.settlePaidOrder(db.orders[ORDER], session({ payment_status: "paid" })), "refunded");
  assert.equal(db.orders[ORDER].payment, false);
  assert.equal(calls.refunds.length, 1);
  assert.equal(calls.refunds[0].params.payment_intent, "pi_1");
  assert.match(calls.refunds[0].opts.idempotencyKey, /pi_1/);
});

// ---------- Stripe return link ----------
test("the return link does nothing without this order's own session id", async () => {
  for (const session_id of [undefined, "cs_someone_else", ["cs_1"]]) {
    const res = mockRes();
    await oc.verifyStripe({ query: { orderId: ORDER, session_id } }, res);
    assert.equal(res.redirected, "https://store.example/cart");
    assert.ok(db.orders[ORDER], "order still exists");
    assert.equal(db.sessions.cs_1.status, "open", "checkout untouched");
  }
});

test("cancelling on the payment page closes the checkout, removes the order and frees its stock", async () => {
  const res = mockRes();
  await oc.verifyStripe({ query: { orderId: ORDER, session_id: "cs_1" } }, res);
  assert.equal(res.redirected, "https://store.example/cart?payment=cancelled");
  assert.equal(db.orders[ORDER], undefined);
  assert.equal(db.sessions.cs_1.status, "expired");
  assert.equal(calls.stock.length, 1);
});

test("if Stripe can't close the checkout, the order is kept (it could still be paid)", async () => {
  db.expireFails = true;
  const res = mockRes();
  await oc.verifyStripe({ query: { orderId: ORDER, session_id: "cs_1" } }, res);
  assert.ok(db.orders[ORDER]);
  assert.equal(calls.stock.length, 0);
});

// ---------- admin status changes ----------
test("admin can't move an unpaid card order forward", async () => {
  const res = mockRes();
  await oc.updateStatus({ body: { orderId: ORDER, status: "Shipped" } }, res);
  assert.match(res.body.message, /card payment is confirmed/);
  assert.equal(db.orders[ORDER].status, "Order Placed");
});

test("admin cancel closes the checkout first, and refuses while a payment is processing", async () => {
  db.sessions.cs_1 = session({ status: "complete", payment_status: "unpaid" });
  const blocked = mockRes();
  await oc.updateStatus({ body: { orderId: ORDER, status: "Cancelled" } }, blocked);
  assert.match(blocked.body.message, /still being processed/);
  assert.equal(db.orders[ORDER].status, "Order Placed");

  db.sessions.cs_1 = session();
  const ok = mockRes();
  await oc.updateStatus({ body: { orderId: ORDER, status: "Cancelled" } }, ok);
  assert.equal(ok.body.success, true);
  assert.equal(db.orders[ORDER].status, "Cancelled");
  assert.equal(db.sessions.cs_1.status, "expired", "can't be paid any more");
  assert.equal(calls.stock.length, 1, "units given back once");
});

test("a status change based on a stale read reports a conflict instead of overwriting", async () => {
  db.orders[ORDER] = cardOrder({ paymentMethod: "COD", stripeSessionId: undefined });
  const stale = copy(db.orders[ORDER]);
  db.orders[ORDER].status = "Cancelled"; // the customer cancelled in the meantime
  const realFindById = orderModel.findById;
  orderModel.findById = () => query(stale);
  try {
    const res = mockRes();
    await oc.updateStatus({ body: { orderId: ORDER, status: "Shipped" } }, res);
    assert.match(res.body.message, /changed a moment ago/);
    assert.equal(db.orders[ORDER].status, "Cancelled");
  } finally {
    orderModel.findById = realFindById;
  }
});

// ---------- webhook ----------
test("a failed delayed bank payment removes the order and frees its stock", async () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.async_payment_failed", data: { object: session({ status: "complete" }) } });
  const res = mockRes();
  await oc.stripeWebhook({ body: Buffer.from(payload), headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET }) } }, res);
  assert.deepEqual(res.body, { received: true });
  assert.equal(db.orders[ORDER], undefined);
  assert.equal(calls.stock.length, 1);
});

// ---------- demo shopper ----------
test("demo shopper orders store the sample address and don't take stock", async () => {
  db.users[USER].email = "demo@forever-store.example";
  db.products = { p1: { _id: "65f1c0ffee0000000000cccc", name: "Tee", price: 1199, sizes: ["M"], stock: { M: 5 } } };
  const res = mockRes();
  await oc.placeOrder({
    userId: USER,
    body: { items: [{ _id: "65f1c0ffee0000000000cccc", size: "M", quantity: 2 }], address: { firstName: "Real", lastName: "Visitor", phone: "9876543210" } },
  }, res);
  assert.equal(res.body.success, true, res.body.message);
  const saved = db.orders[String(res.body.orderId)];
  assert.deepEqual(saved.address, { ...oc.DEMO_ORDER_ADDRESS });
  assert.equal(saved.items[0].stockReserved, false);
  assert.equal(calls.stock.length, 0);
});

test("orders are capped at 30 pieces", async () => {
  db.users[USER].email = "demo@forever-store.example";
  const res = mockRes();
  await oc.placeOrder({ userId: USER, body: { items: [{ _id: "65f1c0ffee0000000000cccc", size: "M", quantity: 31 }] } }, res);
  assert.match(res.body.message, /up to 30 pieces/);
});
