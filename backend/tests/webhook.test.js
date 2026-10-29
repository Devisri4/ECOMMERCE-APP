// Stripe webhook signature handling. Signatures are created and checked offline; no database or network.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STRIPE_SECRET_KEY = "sk_test_offline_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

const { default: stripe } = await import("../config/stripe.js");
const { stripeWebhook } = await import("../controllers/orderController.js");

const mockRes = () => ({
  statusCode: 200, body: null,
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
});

const call = async (payload, signature) => {
  const res = mockRes();
  await stripeWebhook({ body: Buffer.from(payload), headers: { "stripe-signature": signature } }, res);
  return res;
};

const sign = (payload, secret = process.env.STRIPE_WEBHOOK_SECRET) =>
  stripe.webhooks.generateTestHeaderString({ payload, secret });

// An event whose session has no order id: accepted without any database lookup
const event = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", metadata: {} } } });

test("webhook rejects missing or forged signatures", async () => {
  assert.equal((await call(event, undefined)).statusCode, 400);
  assert.equal((await call(event, "t=1,v1=deadbeef")).statusCode, 400);
  assert.equal((await call(event, sign(event, "whsec_someone_else"))).statusCode, 400);
});

test("webhook accepts a correctly signed event", async () => {
  const res = await call(event, sign(event));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { received: true });
});

test("webhook is disabled without STRIPE_WEBHOOK_SECRET", async () => {
  const saved = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try {
    assert.equal((await call(event, sign(event, saved))).statusCode, 503);
  } finally {
    process.env.STRIPE_WEBHOOK_SECRET = saved;
  }
});
