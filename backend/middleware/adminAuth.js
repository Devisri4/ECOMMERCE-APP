import jwt from 'jsonwebtoken'

// Admin-only routes: the token must be signed by us, unexpired, and carry the admin role for the
// configured admin email. Customer tokens ({ id }) and the old password-in-token format are rejected.
const adminAuth = async (req,res, next) => {
    try {
        const { token} = req.headers
        if (!token) {
            return res.json({success: false, message: "Not Authorized Login Again"})
        }
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        const isAdmin =
            token_decode && typeof token_decode === 'object' &&
            token_decode.role === 'admin' && token_decode.email === process.env.ADMIN_EMAIL
        if (!isAdmin) {
            return res.json({success: false, message: "Not Authorized Login Again"})
        }
        next()
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: "Not Authorized Login Again" })
    }

}

export default adminAuth
