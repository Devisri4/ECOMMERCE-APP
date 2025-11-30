import userModel from "../models/userModel.js";

// ✅ ADD TO CART (already correct)
const addToCart = async (req, res) => {
    try {
        const userId = req.userId;
        const { itemId, size } = req.body;

        const userData = await userModel.findById(userId);
        let cartData = userData.cartData || {};

        if (!cartData[itemId]) cartData[itemId] = {};
        cartData[itemId][size] = (cartData[itemId][size] || 0) + 1;

        await userModel.findByIdAndUpdate(userId, { cartData });

        res.json({ success: true, message: "Added To Cart" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// ✅ UPDATE CART — FIXED
const updateCart = async (req, res) => {
    try {
        const userId = req.userId;   // ✅ FIX
        const { itemId, size, quantity } = req.body;

        const userData = await userModel.findById(userId);
        let cartData = userData.cartData || {};

        if (!cartData[itemId]) cartData[itemId] = {};

        if (quantity > 0) {
            cartData[itemId][size] = quantity;
        } else {
            delete cartData[itemId][size];
            if (Object.keys(cartData[itemId]).length === 0) {
                delete cartData[itemId];
            }
        }

        await userModel.findByIdAndUpdate(userId, { cartData });
        res.json({ success: true, message: "Cart Updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// ✅ GET USER CART — FIXED (THIS WAS THE KILLER)
const getUserCart = async (req, res) => {
    try {
        const userId = req.userId;   // ✅ FIX

        const userData = await userModel.findById(userId);
        let cartData = userData.cartData || {};

        res.json({ success: true, cartData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export { addToCart, updateCart, getUserCart };
