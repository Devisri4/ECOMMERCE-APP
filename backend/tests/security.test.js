// Input hardening for cart, login/register, customer tokens and the rate limiter.
// Every case is rejected before any database call, so no database or network is needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET ||= "test-secret-that-is-at-least-32-characters";

const mockRes = () => ({
  body: null, statusCode: 200, headers: {},
  json(b) { this.body = b; return this; },
  status(c) { this.statusCode = c; return this; },
  set(k, v) { this.headers[k] = v; return this; },
});

const { addToCart, updateCart } = await import("../controllers/cartController.js");
const { loginUser, registerUser, isStrongPassword } = await import("../controllers/userController.js");
const { default: authUser } = await import("../middleware/auth.js");
const { default: rateLimit } = await import("../middleware/rateLimit.js");

test("cart rejects prototype keys without touching Object.prototype", async () => {
  for (const [itemId, size] of [["__proto__", "toString"], ["constructor", "prototype"], [{ $ne: null }, "M"], ["65f1c0ffee0000000000abcd", ["M"]]]) {
    const res = mockRes();
    await addToCart({ userId: "u", body: { itemId, size } }, res);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /can't be added/);
  }
  assert.equal(typeof ({}).toString, "function");
  assert.equal(Object.prototype.M, undefined);
});

test("cart update needs a whole, non-negative quantity and a valid item", async () => {
  for (const quantity of ["5", -1, 1.5, null, { $gt: 0 }]) {
    const res = mockRes();
    await updateCart({ userId: "u", body: { itemId: "65f1c0ffee0000000000abcd", size: "M", quantity } }, res);
    assert.match(res.body.message, /quantity/);
  }
  const res = mockRes();
  await updateCart({ userId: "u", body: { itemId: "__proto__", size: "toString", quantity: 2 } }, res);
  assert.match(res.body.message, /can't be added/);
});

test("login rejects non-string credentials with the generic message", async () => {
  for (const body of [{ email: { $regex: "^a" }, password: "x" }, { email: "a@b.com", password: { $ne: "" } }, {}]) {
    const res = mockRes();
    await loginUser({ body }, res);
    assert.deepEqual(res.body, { success: false, message: "Invalid credentials" });
  }
});

test("register validates name, email and password strength before the database", async () => {
  const cases = [
    [{ name: "", email: "a@b.com", password: "Strong123" }, /name/],
    [{ name: { $ne: 1 }, email: "a@b.com", password: "Strong123" }, /name/],
    [{ name: "Devi", email: { $regex: "." }, password: "Strong123" }, /valid email/],
    [{ name: "Devi", email: "a@b.com", password: "password" }, /uppercase/],
    [{ name: "Devi", email: "a@b.com" }, /uppercase/],
  ];
  for (const [body, expected] of cases) {
    const res = mockRes();
    await registerUser({ body }, res);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, expected);
  }
});

test("password strength matches the sign-up checklist", () => {
  assert.ok(isStrongPassword("Strong123"));
  for (const p of ["Short1A", "alllower123", "ALLUPPER123", "NoNumbers", 12345678, undefined]) assert.equal(isStrongPassword(p), false);
});

test("customer tokens must carry an expiry", async () => {
  const run = async (token) => {
    const res = mockRes();
    const req = { headers: { token } };
    let passed = false;
    await authUser(req, res, () => { passed = true; });
    return { passed, req };
  };
  assert.equal((await run(jwt.sign({ id: "u1" }, process.env.JWT_SECRET))).passed, false);
  const ok = await run(jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { expiresIn: "1h" }));
  assert.equal(ok.passed, true);
  assert.equal(ok.req.userId, "u1");
});

test("rate limiter blocks after the limit with 429 and Retry-After", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2, message: "slow down" });
  const call = (ip) => {
    const res = mockRes();
    let passed = false;
    limiter({ ip }, res, () => { passed = true; });
    return { passed, res };
  };
  assert.equal(call("1.1.1.1").passed, true);
  assert.equal(call("1.1.1.1").passed, true);
  const blocked = call("1.1.1.1");
  assert.equal(blocked.passed, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.res.body.message, "slow down");
  assert.ok(Number(blocked.res.headers["Retry-After"]) > 0);
  assert.equal(call("2.2.2.2").passed, true, "other clients are not affected");
});
