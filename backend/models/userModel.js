import mongoose from "mongoose";

// Saved delivery address: the same fields an order stores (see orderController.validateAddress)
const addressSchema = new mongoose.Schema({
    label: { type: String, default: "" },          // e.g. "Home", "Work"
    firstName: String,
    lastName: String,
    email: String,
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String,
    phone: String,
    isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose. Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cartData: { type: Object, default: {} },
    addresses: { type: [addressSchema], default: [] },
    wishlist: { type: [String], default: [] }      // product ids
}, { minimize: false })

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel
