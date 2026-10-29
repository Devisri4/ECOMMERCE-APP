import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import { sendServerError } from "../utils/http.js";

// Same per-size limit as checkout (orderController.buildOrderItems)
export const MAX_CART_QTY = 99;

const INVALID_ITEM = "This item can't be added to your bag.";
const NOT_AUTHORIZED = "Not Authorized Login Again";

// itemId and size become keys of cartData, so they are checked before use: a key like "__proto__"
// or "toString" would otherwise write onto Object.prototype for the whole server process.
const isProductId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

// The item must be a real product offered in that size
const isOrderable = async (itemId, size) => {
    if (!isProductId(itemId) || typeof size !== "string") return false;
    const product = await productModel.findById(itemId).select("sizes").lean();
    return Boolean(product && product.sizes.includes(size));
};

// ADD TO CART: one more of itemId in size
const addToCart = async (req, res) => {
    try {
        const userId = req.userId;
        const { itemId, size } = req.body;
        if (!(await isOrderable(itemId, size))) return res.json({ success: false, message: INVALID_ITEM });

        const userData = await userModel.findById(userId);
        if (!userData) return res.json({ success: false, message: NOT_AUTHORIZED });
        let cartData = userData.cartData || {};

        if (!Object.hasOwn(cartData, itemId)) cartData[itemId] = {};
        const current = Object.hasOwn(cartData[itemId], size) ? cartData[itemId][size] : 0;
        if (current >= MAX_CART_QTY) {
            return res.json({ success: false, message: `You can add up to ${MAX_CART_QTY} of each item.` });
        }
        cartData[itemId][size] = current + 1;

        await userModel.findByIdAndUpdate(userId, { cartData });

        res.json({ success: true, message: "Added To Cart" });
    } catch (error) {
        sendServerError(res, error, "Couldn’t update your bag. Please try again.");
    }
};

// UPDATE CART: set the quantity of itemId in size (0 removes it)
const updateCart = async (req, res) => {
    try {
        const userId = req.userId;
        const { itemId, size, quantity } = req.body;
        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.json({ success: false, message: "Invalid item quantity" });
        }
        if (!isProductId(itemId) || typeof size !== "string") return res.json({ success: false, message: INVALID_ITEM });

        const userData = await userModel.findById(userId);
        if (!userData) return res.json({ success: false, message: NOT_AUTHORIZED });
        let cartData = userData.cartData || {};

        if (quantity > 0) {
            // Removing is always allowed (even for a product that has since been deleted); setting needs a real product
            if (!(await isOrderable(itemId, size))) return res.json({ success: false, message: INVALID_ITEM });
            if (!Object.hasOwn(cartData, itemId)) cartData[itemId] = {};
            cartData[itemId][size] = Math.min(quantity, MAX_CART_QTY);
        } else if (Object.hasOwn(cartData, itemId)) {
            delete cartData[itemId][size];
            if (Object.keys(cartData[itemId]).length === 0) {
                delete cartData[itemId];
            }
        }

        await userModel.findByIdAndUpdate(userId, { cartData });
        res.json({ success: true, message: "Cart Updated" });
    } catch (error) {
        sendServerError(res, error, "Couldn’t update your bag. Please try again.");
    }
};

// GET USER CART
const getUserCart = async (req, res) => {
    try {
        const userId = req.userId;

        const userData = await userModel.findById(userId);
        if (!userData) return res.json({ success: false, message: NOT_AUTHORIZED });
        let cartData = userData.cartData || {};

        res.json({ success: true, cartData });
    } catch (error) {
        sendServerError(res, error, "Couldn’t update your bag. Please try again.");
    }
};

export { addToCart, updateCart, getUserCart };
