import validator from "validator";
import subscriberModel from "../models/subscriberModel.js";
import { sendServerError } from "../utils/http.js";

const SUBSCRIBED = "Thanks for subscribing. You're on the list.";

// Route for joining the newsletter. Subscribing twice is harmless, and the reply is the same either
// way, so the form can't be used to check whether an email is already on the list.
const subscribe = async (req, res) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        if (!email || email.length > 254 || !validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email address" });
        }

        await subscriberModel.updateOne({ email }, { $setOnInsert: { email, date: Date.now() } }, { upsert: true });
        res.json({ success: true, message: SUBSCRIBED });
    } catch (error) {
        // The same email submitted twice at once: the unique index rejects the second, which is fine
        if (error?.code === 11000) return res.json({ success: true, message: SUBSCRIBED });
        sendServerError(res, error, "Couldn't subscribe you right now. Please try again.");
    }
};

// Route for the admin dashboard: number of subscribers only (no email addresses)
const subscriberCount = async (req, res) => {
    try {
        const count = await subscriberModel.countDocuments();
        res.json({ success: true, count });
    } catch (error) {
        sendServerError(res, error, "Couldn't load subscribers.");
    }
};

export { subscribe, subscriberCount };
