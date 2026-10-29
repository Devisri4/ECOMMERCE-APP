// Saved addresses and wishlist: inputs rejected before any database call.
import { test } from "node:test";
import assert from "node:assert/strict";

const { cleanSavedAddress, saveAddress, removeAddress, toggleWishlist } = await import("../controllers/accountController.js");

const mockRes = () => ({ body: null, json(b) { this.body = b; return this; } });

const good = {
  firstName: "Devi", lastName: "Sri", email: "devi@gmail.com", street: "12 Main Street",
  city: "Hyderabad", state: "Telangana", zipcode: "500034", country: "India", phone: "9876543210",
};

test("saved addresses use the checkout rules and keep only known fields", () => {
  const clean = cleanSavedAddress({ address: { ...good, city: "  Hyderabad ", extra: "x" }, label: " Home " });
  assert.equal(clean.city, "Hyderabad");
  assert.equal(clean.label, "Home");
  assert.equal(clean.extra, undefined);
  assert.throws(() => cleanSavedAddress({ address: { ...good, phone: "12345" } }), /mobile number/);
  assert.throws(() => cleanSavedAddress({ address: good, label: "x".repeat(31) }), /30 characters/);
  assert.throws(() => cleanSavedAddress({}), /delivery details/);
});

test("invalid addresses and ids are refused before the database", async () => {
  const bad = mockRes();
  await saveAddress({ userId: "u", body: { address: { ...good, zipcode: "abc" } } }, bad);
  assert.match(bad.body.message, /ZIP/);

  const remove = mockRes();
  await removeAddress({ userId: "u", body: { id: { $ne: null } } }, remove);
  assert.equal(remove.body.message, "Address not found");
});

test("wishlist toggle refuses ids that aren't product ids", async () => {
  for (const productId of ["__proto__", { $gt: "" }, "123", undefined]) {
    const res = mockRes();
    await toggleWishlist({ userId: "u", body: { productId } }, res);
    assert.equal(res.body.message, "Product not found");
  }
});
