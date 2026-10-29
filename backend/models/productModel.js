import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required:true },
    description: { type: String, required:true },
    price: { type: Number,required:true },
    image: { type: [String], required:true }, // Use [String] for strictness
    category: { type: String, required:true },
    subCategory: { type: String, required: true },
    sizes: { type:[String], required: true },
    bestseller:{ type: Boolean },
    date: { type: Number, required:true },
    // Units left per size, e.g. { S: 4, M: 0 }. A size without an entry isn't tracked (always available).
    stock: { type: mongoose.Schema.Types.Mixed },
    // Average star rating and number of reviews, kept up to date by reviewController
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
},
{ collection: "products" } // Explicitly state the collection name for absolute control
);

const productModel = mongoose.models.Product || mongoose.model("Product", productSchema);

export default productModel;
