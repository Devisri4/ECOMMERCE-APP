// Review rules: public display name, rating/comment validation, and requests rejected before the database.
import { test } from "node:test";
import assert from "node:assert/strict";

const { displayName, validateReview, addReview, listReviews, MAX_COMMENT } = await import("../controllers/reviewController.js");

const mockRes = () => ({ body: null, json(b) { this.body = b; return this; } });

test("display name shows the first name and last initial only", () => {
  assert.equal(displayName("Devi Sri"), "Devi S.");
  assert.equal(displayName("  anna  maria  lopez "), "anna L.");
  assert.equal(displayName("Ravi"), "Ravi");
  assert.equal(displayName(""), "Customer");
});

test("rating must be a whole number from 1 to 5; comment is optional and limited", () => {
  assert.deepEqual(validateReview({ rating: 5, comment: "  Great fit  " }), { rating: 5, comment: "Great fit" });
  assert.deepEqual(validateReview({ rating: "3" }), { rating: 3, comment: "" });
  for (const rating of [0, 6, 4.5, "five", null, { $gt: 0 }]) assert.match(validateReview({ rating }).error, /1 to 5/);
  assert.match(validateReview({ rating: 4, comment: { $ne: "" } }).error, /Invalid/);
  assert.match(validateReview({ rating: 4, comment: "x".repeat(MAX_COMMENT + 1) }).error, /up to/);
});

test("invalid product ids and ratings are rejected before any database call", async () => {
  const bad = mockRes();
  await addReview({ userId: "u", body: { productId: "__proto__", rating: 5 } }, bad);
  assert.equal(bad.body.message, "Product not found");

  const noStars = mockRes();
  await addReview({ userId: "u", body: { productId: "65f1c0ffee0000000000abcd", rating: 9 } }, noStars);
  assert.match(noStars.body.message, /1 to 5/);

  const list = mockRes();
  await listReviews({ query: { productId: { $ne: null } } }, list);
  assert.equal(list.body.success, false);
});
