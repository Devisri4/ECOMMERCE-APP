import mongoose from "mongoose";

// One review per customer per product (posting again updates it)
const reviewSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },          // display name, e.g. "Devi S."
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    verified: { type: Boolean, default: false },     // the customer has a (non-cancelled) order with this product
    date: { type: Number, required: true },
});

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, date: -1 });

const reviewModel = mongoose.models.review || mongoose.model("review", reviewSchema);

export default reviewModel;
