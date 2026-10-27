import validator from "validator"
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import crypto from "crypto";
import userModel from "../models/userModel.js";
import { sendServerError } from "../utils/http.js";

// Customer sessions expire after 7 days (older tokens issued without an expiry keep working until logout)
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// Route for user login
const loginUser = async (req, res) => {
    try {
        // ERROR FIX: Destructuring was broken
        const { email, password } = req.body;
        
        const user = await userModel.findOne({ email });
        
        if (!user) {
            return res.json({ success: false, message: "User doesn't exist" })
        }
        
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = createToken(user._id);
            return res.json({ success: true, token });
        } else {
            // ERROR FIX: This should *only* send error if isMatch is false
            return res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        sendServerError(res, error);
    }
}

// Route for user register
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // checking user already exists or not
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "User already exists" })
        }
        
        // validating email format & strong password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword
        });

        const user = await newUser.save();

        const token = createToken(user._id);
        res.json({ success: true, token });

    } catch (error) {
        sendServerError(res, error);
    }
}

// Constant-time string comparison (avoids leaking how many characters matched)
const safeEqual = (a, b) => {
    const left = Buffer.from(String(a))
    const right = Buffer.from(String(b))
    return left.length === right.length && crypto.timingSafeEqual(left, right)
}

// Route for admin login
// Fails closed: if ADMIN_EMAIL / ADMIN_PASSWORD (or JWT_SECRET) aren't configured, nobody can sign in —
// otherwise an empty request would "match" two undefined values.
const adminLogin = async (req, res) => {
    try {
        const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env
        if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
            console.error("[config] Admin login refused: ADMIN_EMAIL, ADMIN_PASSWORD or JWT_SECRET is not set")
            return res.json({ success: false, message: "Admin sign-in is not available right now" })
        }

        const {email, password} = req.body
        if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
            return res.json({ success: false, message: "Invalid credentials" })
        }

        const emailOk = safeEqual(email, ADMIN_EMAIL)
        const passwordOk = safeEqual(password, ADMIN_PASSWORD)
        if (emailOk && passwordOk) {
            // The token carries a role claim only — never the admin password (JWT payloads are readable)
            const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: '1d' });
            res.json({success: true, token})
        } else {
            res.json({ success: false, message: "Invalid credentials"})
        }
    } catch (error) {
        sendServerError(res, error, "Couldn't sign you in. Please try again.");
    }

}
// ----------------- ACCOUNT (customer, authUser) -----------------
// All three use req.userId from the verified token, so a customer can only reach their own record.

const NOT_AUTHORIZED = "Not Authorized Login Again"

// Route for reading the signed-in customer's profile (never returns password or cart)
const getProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId).select('name email')
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED })
        res.json({ success: true, user: { name: user.name, email: user.email } })
    } catch (error) {
        sendServerError(res, error);
    }
}

// Route for updating the profile. Only the name is editable — email changes would need verification.
const updateProfile = async (req, res) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
        if (!name || name.length > 60) {
            return res.json({ success: false, message: "Please enter a name between 1 and 60 characters" })
        }
        const user = await userModel.findByIdAndUpdate(req.userId, { name }, { new: true }).select('name email')
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED })
        res.json({ success: true, user: { name: user.name, email: user.email } })
    } catch (error) {
        sendServerError(res, error);
    }
}

// Route for changing password: requires the current password; same strength rules as sign-up
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return res.json({ success: false, message: "Please fill in both password fields" })
        }

        const user = await userModel.findById(req.userId)
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED })

        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) return res.json({ success: false, message: "Current password is incorrect" })

        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
            return res.json({ success: false, message: "New password must be at least 8 characters with an uppercase letter, a lowercase letter and a number" })
        }
        if (await bcrypt.compare(newPassword, user.password)) {
            return res.json({ success: false, message: "New password must be different from your current password" })
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: "Password updated" })
    } catch (error) {
        sendServerError(res, error);
    }
}

export { loginUser, registerUser, adminLogin, getProfile, updateProfile, changePassword }
