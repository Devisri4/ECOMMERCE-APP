import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import { validateAddress, OrderValidationError } from "./orderController.js";
import { isDemoCustomer, DEMO_ACCOUNT_LOCKED } from "./userController.js";
import { sendServerError } from "../utils/http.js";

// Saved addresses and wishlist for the signed-in customer (req.userId from authUser).

export const MAX_ADDRESSES = 5;
export const MAX_WISHLIST = 100;
const NOT_AUTHORIZED = "Not Authorized Login Again";

const isId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

// Address fields use the checkout rules; the optional label is short free text
export const cleanSavedAddress = (body = {}) => {
    const address = validateAddress(body.address); // throws OrderValidationError with a customer-facing message
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (label.length > 30) throw new OrderValidationError("Address names can be up to 30 characters");
    return { ...address, label };
};

const sendAddresses = (res, user, message) =>
    res.json({ success: true, message, addresses: user.addresses });

// ----------------- ADDRESSES -----------------
const listAddresses = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId).select("addresses");
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });
        sendAddresses(res, user);
    } catch (error) {
        sendServerError(res, error, "Couldn't load your addresses.");
    }
};

// Adds a new address, or updates one when body.id is given. The first address, or one saved with
// makeDefault, becomes the default (only one default at a time).
const saveAddress = async (req, res) => {
    try {
        const fields = cleanSavedAddress(req.body);
        const user = await userModel.findById(req.userId).select("email addresses");
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });
        // The demo account is shared, so addresses saved there would be visible to the next visitor
        if (isDemoCustomer(user)) return res.json({ success: false, message: DEMO_ACCOUNT_LOCKED });

        let saved;
        if (req.body.id !== undefined) {
            if (!isId(req.body.id)) return res.json({ success: false, message: "Address not found" });
            saved = user.addresses.id(req.body.id);
            if (!saved) return res.json({ success: false, message: "Address not found" });
            saved.set(fields);
        } else {
            if (user.addresses.length >= MAX_ADDRESSES) {
                return res.json({ success: false, message: `You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.` });
            }
            user.addresses.push(fields);
            saved = user.addresses[user.addresses.length - 1];
        }

        if (req.body.makeDefault === true || user.addresses.length === 1) {
            user.addresses.forEach((a) => { a.isDefault = a._id.equals(saved._id); });
        }
        await user.save();
        sendAddresses(res, user, "Address saved");
    } catch (error) {
        if (error instanceof OrderValidationError) return res.json({ success: false, message: error.message });
        sendServerError(res, error, "Couldn't save the address. Please try again.");
    }
};

const removeAddress = async (req, res) => {
    try {
        if (!isId(req.body.id)) return res.json({ success: false, message: "Address not found" });
        const user = await userModel.findById(req.userId).select("addresses");
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });
        const address = user.addresses.id(req.body.id);
        if (!address) return res.json({ success: false, message: "Address not found" });

        const wasDefault = address.isDefault;
        address.deleteOne();
        if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
        await user.save();
        sendAddresses(res, user, "Address removed");
    } catch (error) {
        sendServerError(res, error, "Couldn't remove the address. Please try again.");
    }
};

// ----------------- WISHLIST -----------------
const getWishlist = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId).select("wishlist");
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });
        res.json({ success: true, wishlist: user.wishlist });
    } catch (error) {
        sendServerError(res, error, "Couldn't load your wishlist.");
    }
};

// Adds the product if it isn't saved yet, otherwise removes it
const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        if (!isId(productId)) return res.json({ success: false, message: "Product not found" });
        const user = await userModel.findById(req.userId).select("wishlist");
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });

        const added = !user.wishlist.includes(productId);
        if (added) {
            if (user.wishlist.length >= MAX_WISHLIST) {
                return res.json({ success: false, message: `Your wishlist can hold up to ${MAX_WISHLIST} items.` });
            }
            if (!(await productModel.exists({ _id: productId }))) return res.json({ success: false, message: "Product not found" });
            user.wishlist.push(productId);
        } else {
            user.wishlist.pull(productId);
        }
        await user.save();
        res.json({ success: true, added, wishlist: user.wishlist });
    } catch (error) {
        sendServerError(res, error, "Couldn't update your wishlist. Please try again.");
    }
};

// Adds items saved while signed out (kept in the browser) to the account wishlist
const mergeWishlist = async (req, res) => {
    try {
        const ids = Array.isArray(req.body.productIds) ? [...new Set(req.body.productIds.filter(isId))].slice(0, MAX_WISHLIST) : [];
        const user = await userModel.findById(req.userId).select("wishlist");
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });

        const existing = ids.length ? (await productModel.find({ _id: { $in: ids } }).select("_id").lean()).map((p) => String(p._id)) : [];
        for (const id of existing) {
            if (user.wishlist.length >= MAX_WISHLIST) break;
            if (!user.wishlist.includes(id)) user.wishlist.push(id);
        }
        await user.save();
        res.json({ success: true, wishlist: user.wishlist });
    } catch (error) {
        sendServerError(res, error, "Couldn't update your wishlist.");
    }
};

export { listAddresses, saveAddress, removeAddress, getWishlist, toggleWishlist, mergeWishlist };
