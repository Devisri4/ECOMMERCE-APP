import validator from "validator"
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import crypto from "crypto";
import userModel from "../models/userModel.js";
import { sendServerError } from "../utils/http.js";

// Customer sessions expire after 7 days (tokens without an expiry are rejected by middleware/auth.js)
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// Same rules as the sign-up checklist (frontend/src/utils/passwordRules.js) and change-password
const PASSWORD_RULES_MESSAGE = "Password must be at least 8 characters with an uppercase letter, a lowercase letter and a number"
export const isStrongPassword = (p) =>
    typeof p === 'string' && p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p)

// Emails are stored lowercase. Lookups ignore case so accounts created before that still match.
const normalizeEmail = (email) => email.trim().toLowerCase()
const findByEmail = (email) => userModel.findOne({ email }).collation({ locale: 'en', strength: 2 })

const INVALID_LOGIN = 'Invalid credentials'

// Compared against when the email is unknown, so a missing account takes as long as a wrong password
let dummyHash
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('not-a-real-password', 10))

// Route for user login
// Unknown email and wrong password get the same message, so the form can't be used to find accounts.
// Both fields must be strings: an object like { "$regex": "^a" } would otherwise reach the database query.
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
            return res.json({ success: false, message: INVALID_LOGIN })
        }

        const user = await findByEmail(normalizeEmail(email));
        const isMatch = await bcrypt.compare(password, user ? user.password : await getDummyHash());

        if (user && isMatch) {
            const token = createToken(user._id);
            return res.json({ success: true, token });
        }
        return res.json({ success: false, message: INVALID_LOGIN });
    } catch (error) {
        sendServerError(res, error);
    }
}

// Route for user register
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // validating name, email format & strong password before touching the database
        const cleanName = typeof name === 'string' ? name.trim() : ''
        if (!cleanName || cleanName.length > 60) {
            return res.json({ success: false, message: "Please enter a name between 1 and 60 characters" })
        }
        if (typeof email !== 'string' || !validator.isEmail(email.trim())) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        if (!isStrongPassword(password)) {
            return res.json({ success: false, message: PASSWORD_RULES_MESSAGE })
        }
        const cleanEmail = normalizeEmail(email)

        // checking user already exists or not
        const exists = await findByEmail(cleanEmail);
        if (exists) {
            return res.json({ success: false, message: "User already exists" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword
        });

        const user = await newUser.save();

        const token = createToken(user._id);
        res.json({ success: true, token });

    } catch (error) {
        // Two sign-ups with the same email at once: the unique index rejects the second
        if (error?.code === 11000) return res.json({ success: false, message: "User already exists" })
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
            return res.json({success: true, token})
        }

        // Optional read-only demo admin for portfolio visitors: only set when both variables are configured.
        // Its token has its own role, which middleware/adminAuth.js allows on read-only routes only.
        const { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } = process.env
        if (DEMO_ADMIN_EMAIL && DEMO_ADMIN_PASSWORD && safeEqual(email, DEMO_ADMIN_EMAIL) && safeEqual(password, DEMO_ADMIN_PASSWORD)) {
            const token = jwt.sign({ role: 'demo-admin', email }, JWT_SECRET, { expiresIn: '2h' });
            return res.json({ success: true, token, demo: true })
        }

        res.json({ success: false, message: "Invalid credentials"})
    } catch (error) {
        sendServerError(res, error, "Couldn't sign you in. Please try again.");
    }

}
// ----------------- ACCOUNT (customer, authUser) -----------------
// All three use req.userId from the verified token, so a customer can only reach their own record.

const NOT_AUTHORIZED = "Not Authorized Login Again"

// The shared demo shopper account (DEMO_CUSTOMER_EMAIL) can't be renamed or have its password
// changed, so one visitor can't lock the next one out.
const DEMO_ACCOUNT_LOCKED = "The demo account can't be changed. Create your own account to try this."
const isDemoCustomer = (user) =>
    Boolean(process.env.DEMO_CUSTOMER_EMAIL) && user.email.toLowerCase() === normalizeEmail(process.env.DEMO_CUSTOMER_EMAIL)

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
        const current = await userModel.findById(req.userId).select('email')
        if (!current) return res.json({ success: false, message: NOT_AUTHORIZED })
        if (isDemoCustomer(current)) return res.json({ success: false, message: DEMO_ACCOUNT_LOCKED })

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
        if (isDemoCustomer(user)) return res.json({ success: false, message: DEMO_ACCOUNT_LOCKED })

        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) return res.json({ success: false, message: "Current password is incorrect" })

        if (!isStrongPassword(newPassword)) {
            return res.json({ success: false, message: `New ${PASSWORD_RULES_MESSAGE.toLowerCase()}` })
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
