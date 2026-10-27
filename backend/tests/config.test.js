// Config, CORS origins, Stripe initialisation and admin fail-closed behaviour. No database or network.
import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

const withEnv = async (vars, fn) => {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try { return await fn(); } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
};

const mockRes = () => ({ body: null, statusCode: 200, json(b) { this.body = b; return this; }, status(c) { this.statusCode = c; return this; } });

const { checkConfig, allowedOrigins, backendUrl, frontendUrl } = await import("../config/env.js");
const { adminLogin } = await import("../controllers/userController.js");
const { default: adminAuth } = await import("../middleware/adminAuth.js");

test("production refuses to start without MONGODB_URI or JWT_SECRET", () =>
  withEnv({ NODE_ENV: "production", MONGODB_URI: undefined, JWT_SECRET: undefined }, () => {
    assert.throws(() => checkConfig(), /MONGODB_URI, JWT_SECRET/);
  }));

test("development does not throw when variables are missing", () =>
  withEnv({ NODE_ENV: "development", MONGODB_URI: undefined, JWT_SECRET: undefined }, () => {
    assert.doesNotThrow(() => checkConfig());
  }));

test("production never falls back to localhost URLs", () =>
  withEnv({ NODE_ENV: "production", FRONTEND_URL: undefined, ADMIN_URL: undefined, BACKEND_URL: undefined, CORS_ORIGINS: undefined }, () => {
    assert.equal(frontendUrl(), "");
    assert.equal(backendUrl(), "");
    assert.deepEqual(allowedOrigins(), []);
  }));

test("CORS origins = configured storefront + admin (+ extras), trailing slashes trimmed", () =>
  withEnv({ NODE_ENV: "production", FRONTEND_URL: "https://shop.example.com/", ADMIN_URL: "https://admin.example.com", CORS_ORIGINS: "https://preview.example.com" }, () => {
    assert.deepEqual(allowedOrigins(), ["https://shop.example.com", "https://admin.example.com", "https://preview.example.com"]);
    assert.ok(!allowedOrigins().includes("https://evil.example.com"));
  }));

test("Stripe is not initialised without a key (no crash at import)", async () => {
  assert.equal(process.env.STRIPE_SECRET_KEY, undefined, "run tests without STRIPE_SECRET_KEY");
  const { default: stripe } = await import("../config/stripe.js");
  assert.equal(stripe, null);
});

test("admin login fails closed when ADMIN_EMAIL / ADMIN_PASSWORD are missing", () =>
  withEnv({ ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined, JWT_SECRET: "x".repeat(40) }, async () => {
    for (const body of [{}, { email: undefined, password: undefined }, { email: "", password: "" }]) {
      const res = mockRes();
      await adminLogin({ body }, res);
      assert.equal(res.body.success, false);
      assert.equal(res.body.token, undefined);
    }
  }));

test("admin login: wrong credentials rejected, correct ones get a role token without the password", () =>
  withEnv({ ADMIN_EMAIL: "admin@example.com", ADMIN_PASSWORD: "correct-horse", JWT_SECRET: "s".repeat(40) }, async () => {
    const bad = mockRes();
    await adminLogin({ body: { email: "admin@example.com", password: "nope" } }, bad);
    assert.equal(bad.body.success, false);

    const good = mockRes();
    await adminLogin({ body: { email: "admin@example.com", password: "correct-horse" } }, good);
    assert.equal(good.body.success, true);
    const claims = jwt.verify(good.body.token, process.env.JWT_SECRET);
    assert.equal(claims.role, "admin");
    assert.ok(!JSON.stringify(claims).includes("correct-horse"));
  }));

test("adminAuth rejects a role token when ADMIN_EMAIL is unset", () =>
  withEnv({ ADMIN_EMAIL: undefined, JWT_SECRET: "s".repeat(40) }, async () => {
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET); // email missing → would match undefined
    const res = mockRes();
    let nextCalled = false;
    await adminAuth({ headers: { token } }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.body.success, false);
  }));
