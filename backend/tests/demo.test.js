// Read-only demo admin, masked order details for it, and newsletter input checks. No database or network.
import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

const ENV = {
  JWT_SECRET: "test-secret-that-is-at-least-32-characters",
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "correct-horse",
  DEMO_ADMIN_EMAIL: "demo-admin@example.com",
  DEMO_ADMIN_PASSWORD: "demo-pass",
};
Object.assign(process.env, ENV);

const mockRes = () => ({ body: null, json(b) { this.body = b; return this; } });

const { adminLogin } = await import("../controllers/userController.js");
const { default: adminAuth, adminReadAuth, DEMO_READ_ONLY } = await import("../middleware/adminAuth.js");
const { maskAddress } = await import("../controllers/orderController.js");
const { subscribe } = await import("../controllers/newsletterController.js");

const run = async (middleware, token) => {
  const res = mockRes();
  const req = { headers: { token } };
  let passed = false;
  await middleware(req, res, () => { passed = true; });
  return { passed, req, res };
};

test("demo admin credentials sign in with a demo-admin token", async () => {
  const res = mockRes();
  await adminLogin({ body: { email: ENV.DEMO_ADMIN_EMAIL, password: ENV.DEMO_ADMIN_PASSWORD } }, res);
  assert.equal(res.body.success, true);
  assert.equal(res.body.demo, true);
  assert.equal(jwt.decode(res.body.token).role, "demo-admin");

  const wrong = mockRes();
  await adminLogin({ body: { email: ENV.DEMO_ADMIN_EMAIL, password: "nope" } }, wrong);
  assert.equal(wrong.body.success, false);
});

test("demo admin can read but not change anything", async () => {
  const demo = jwt.sign({ role: "demo-admin", email: ENV.DEMO_ADMIN_EMAIL }, ENV.JWT_SECRET, { expiresIn: "1h" });
  const write = await run(adminAuth, demo);
  assert.equal(write.passed, false);
  assert.equal(write.res.body.message, DEMO_READ_ONLY);

  const read = await run(adminReadAuth, demo);
  assert.equal(read.passed, true);
  assert.equal(read.req.adminDemo, true);
});

test("full admin passes both checks; forged roles do not", async () => {
  const admin = jwt.sign({ role: "admin", email: ENV.ADMIN_EMAIL }, ENV.JWT_SECRET, { expiresIn: "1h" });
  assert.equal((await run(adminAuth, admin)).passed, true);
  const read = await run(adminReadAuth, admin);
  assert.equal(read.passed, true);
  assert.equal(read.req.adminDemo, false);

  // demo role with the real admin email, and admin role with the demo email, are both refused
  for (const payload of [{ role: "demo-admin", email: ENV.ADMIN_EMAIL }, { role: "admin", email: ENV.DEMO_ADMIN_EMAIL }, { id: "customer" }]) {
    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: "1h" });
    assert.equal((await run(adminReadAuth, token)).passed, false, JSON.stringify(payload));
  }
});

test("demo admin is disabled when DEMO_ADMIN_EMAIL is unset", async () => {
  const demo = jwt.sign({ role: "demo-admin", email: ENV.DEMO_ADMIN_EMAIL }, ENV.JWT_SECRET, { expiresIn: "1h" });
  delete process.env.DEMO_ADMIN_EMAIL;
  try {
    assert.equal((await run(adminReadAuth, demo)).passed, false);
  } finally {
    process.env.DEMO_ADMIN_EMAIL = ENV.DEMO_ADMIN_EMAIL;
  }
});

test("masked order address keeps only city, state and country", () => {
  const masked = maskAddress({
    firstName: "Devi", lastName: "Sri", email: "devi@gmail.com", street: "12 Main Street",
    city: "Hyderabad", state: "Telangana", zipcode: "501506", country: "India", phone: "9876543210",
  });
  assert.equal(masked.city, "Hyderabad");
  assert.equal(masked.country, "India");
  assert.equal(masked.email, undefined);
  for (const value of Object.values(masked)) assert.doesNotMatch(value, /Devi|Sri|Main|501506|9876543210/);
});

test("newsletter rejects invalid emails before the database", async () => {
  for (const email of ["", "not-an-email", { $ne: null }, "a".repeat(250) + "@x.com"]) {
    const res = mockRes();
    await subscribe({ body: { email } }, res);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /valid email/);
  }
});
