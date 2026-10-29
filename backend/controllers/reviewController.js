import mongoose from "mongoose";
import reviewModel from "../models/reviewModel.js";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { sendServerError } from "../utils/http.js";
import { isDemoCustomer } from "./userController.js";

export const MAX_COMMENT = 1000;
const LIST_LIMIT = 50;

const isProductId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

// Shown publicly, so only the first name and the initial of the last word: "Devi Sri" → "Devi S."
export const displayName = (fullName = "") => {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "Customer";
    const first = parts[0].slice(0, 30);
    return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
};

// Returns { error } or { rating, comment }
export const validateReview = ({ rating, comment }) => {
    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Please choose a rating from 1 to 5 stars" };
    if (comment !== undefined && typeof comment !== "string") return { error: "Invalid review text" };
    const text = (comment || "").trim();
    if (text.length > MAX_COMMENT) return { error: `Reviews can be up to ${MAX_COMMENT} characters` };
    return { rating: stars, comment: text };
};

// Average (one decimal) and count for a product, from its reviews
const summarize = async (productId) => {
    const [row] = await reviewModel.aggregate([
        { $match: { productId } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    return { rating: row ? Math.round(row.avg * 10) / 10 : 0, reviewCount: row ? row.count : 0 };
};

// Keeps the product's rating/reviewCount in step, so product lists can show stars without extra queries
const refreshProductRating = async (productId) => {
    const summary = await summarize(productId);
    await productModel.updateOne({ _id: productId }, summary);
    return summary;
};

// Orders store the product id as an ObjectId (or a string on very old orders). Only a paid order counts
// (card orders once paid, cash on delivery once delivered), and a paid order can't be cancelled, so the
// "Verified buyer" badge can't be earned and then kept by cancelling.
const hasOrdered = (userId, productId) =>
    orderModel.exists({
        userId: String(userId),
        status: { $ne: "Cancelled" },
        payment: true,
        "items._id": { $in: [productId, new mongoose.Types.ObjectId(productId)] },
    });

// Route for a product's reviews (public): newest first, plus the star breakdown
const listReviews = async (req, res) => {
    try {
        const { productId } = req.query;
        if (!isProductId(productId)) return res.json({ success: false, message: "Product not found" });

        const [reviews, breakdown, summary] = await Promise.all([
            reviewModel.find({ productId }).sort({ date: -1 }).limit(LIST_LIMIT).select("name rating comment verified date").lean(),
            reviewModel.aggregate([{ $match: { productId } }, { $group: { _id: "$rating", count: { $sum: 1 } } }]),
            summarize(productId),
        ]);
        const counts = Object.fromEntries([1, 2, 3, 4, 5].map((s) => [s, breakdown.find((b) => b._id === s)?.count || 0]));
        res.json({ success: true, reviews, counts, ...summary });
    } catch (error) {
        sendServerError(res, error, "Couldn't load reviews.");
    }
};

// Route for the signed-in customer's own review of a product (to edit it), or null
const myReview = async (req, res) => {
    try {
        const { productId } = req.body;
        if (!isProductId(productId)) return res.json({ success: false, message: "Product not found" });
        const review = await reviewModel.findOne({ productId, userId: String(req.userId) }).select("rating comment").lean();
        res.json({ success: true, review });
    } catch (error) {
        sendServerError(res, error, "Couldn't load your review.");
    }
};

// Route for posting (or updating) the signed-in customer's review
const addReview = async (req, res) => {
    try {
        const { productId } = req.body;
        if (!isProductId(productId)) return res.json({ success: false, message: "Product not found" });
        const { error, rating, comment } = validateReview(req.body);
        if (error) return res.json({ success: false, message: error });

        const [product, user] = await Promise.all([
            productModel.exists({ _id: productId }),
            userModel.findById(req.userId).select("name email"),
        ]);
        if (!product) return res.json({ success: false, message: "Product not found" });
        if (!user) return res.json({ success: false, message: "Not Authorized Login Again" });

        // The shared demo shopper's orders are free to place, so its reviews are never "verified"
        const verified = !isDemoCustomer(user) && Boolean(await hasOrdered(req.userId, productId));
        await reviewModel.updateOne(
            { productId, userId: String(req.userId) },
            { $set: { rating, comment, verified, name: displayName(user.name), date: Date.now() } },
            { upsert: true }
        );
        res.json({ success: true, message: "Thanks for your review", ...(await refreshProductRating(productId)) });
    } catch (error) {
        sendServerError(res, error, "Couldn't save your review. Please try again.");
    }
};

// Route for deleting the signed-in customer's own review
const removeReview = async (req, res) => {
    try {
        const { productId } = req.body;
        if (!isProductId(productId)) return res.json({ success: false, message: "Product not found" });
        await reviewModel.deleteOne({ productId, userId: String(req.userId) });
        res.json({ success: true, message: "Review removed", ...(await refreshProductRating(productId)) });
    } catch (error) {
        sendServerError(res, error, "Couldn't remove your review. Please try again.");
    }
};

export { listReviews, myReview, addReview, removeReview };
