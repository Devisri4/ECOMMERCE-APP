import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import { sendServerError } from "../utils/http.js";
import { unitsLeft, stockMessage } from "../utils/stock.js";

// Same per-size limit as checkout (orderController.buildOrderItems)
export const MAX_CART_QTY = 99;

const INVALID_ITEM = "This item can't be added to your bag.";
const NOT_AUTHORIZED = "Not Authorized Login Again";

// itemId and size become keys of cartData, so they are checked before use: a key like "__proto__"
// or "toString" would otherwise write onto Object.prototype for the whole server process.
const isProductId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

// The item must be a real product offered in that size. Returns the product (name, sizes, stock) or null.
const findOrderable = async (itemId, size) => {
    if (!isProductId(itemId) || typeof size !== "string") return null;
    const product = await productModel.findById(itemId).select("name sizes stock").lean();
    return product && product.sizes.includes(size) ? product : null;
};

// Field path of one bag line. Only built from a checked product id (24 hex) and a size like "M" or "XXL",
// so the path can never point anywhere else in the document.
const linePath = (itemId, size) => `cartData.${itemId}.${size}`;
const isSize = (size) => typeof size === "string" && /^[A-Z]{1,4}$/.test(size);

// ADD TO CART: one more of itemId in size. A single conditional $inc, so quick repeated clicks are all
// counted and can never push a line past its limit (99, or the units left when stock is tracked).
const addToCart = async (req, res) => {
    try {
        const userId = req.userId;
        const { itemId, size } = req.body;
        const product = await findOrderable(itemId, size);
        if (!product) return res.json({ success: false, message: INVALID_ITEM });

        // The bag doesn't hold stock (checkout does), but it shouldn't offer more than is left
        const left = unitsLeft(product, size);
        const limit = Math.min(MAX_CART_QTY, left);
        if (limit < 1) return res.json({ success: false, message: stockMessage(product.name, size, left) });

        const path = linePath(itemId, size);
        const updated = await userModel.findOneAndUpdate(
            { _id: userId, $or: [{ [path]: { $exists: false } }, { [path]: { $lt: limit } }] },
            { $inc: { [path]: 1 } }
        );
        if (!updated) {
            // Either the account is gone or the line is already at its limit: say which
            const user = await userModel.findById(userId).select("cartData").lean();
            if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });
            const current = user.cartData?.[itemId]?.[size] || 0;
            return res.json({
                success: false,
                message: current >= MAX_CART_QTY ? `You can add up to ${MAX_CART_QTY} of each item.` : stockMessage(product.name, size, left),
            });
        }

        res.json({ success: true, message: "Added To Cart" });
    } catch (error) {
        sendServerError(res, error, "Couldn’t update your bag. Please try again.");
    }
};

// UPDATE CART: set the quantity of itemId in size (0 removes it). Only that one line is written.
const updateCart = async (req, res) => {
    try {
        const userId = req.userId;
        const { itemId, size, quantity } = req.body;
        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.json({ success: false, message: "Invalid item quantity" });
        }
        if (!isProductId(itemId) || !isSize(size)) return res.json({ success: false, message: INVALID_ITEM });
        const path = linePath(itemId, size);

        if (quantity === 0) {
            // Removing is always allowed (even for a product that has since been deleted)
            const user = await userModel.findByIdAndUpdate(userId, { $unset: { [path]: "" } });
            if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });
            return res.json({ success: true, message: "Cart Updated" });
        }

        // Setting a quantity needs a real product in that size
        const product = await findOrderable(itemId, size);
        if (!product) return res.json({ success: false, message: INVALID_ITEM });
        const user = await userModel.findById(userId).select("cartData").lean();
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });

        // Increases are capped at the units left; lowering a quantity that's now above stock is always allowed
        const current = user.cartData?.[itemId]?.[size] || 0;
        const left = unitsLeft(product, size);
        if (quantity > left && quantity > current) {
            return res.json({ success: false, message: stockMessage(product.name, size, left) });
        }
        await userModel.updateOne({ _id: userId }, { $set: { [path]: Math.min(quantity, MAX_CART_QTY) } });
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
