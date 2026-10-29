import jwt from 'jsonwebtoken'

const NOT_AUTHORIZED = "Not Authorized Login Again"
export const DEMO_READ_ONLY = "The demo admin is read-only, so changes are disabled."

// Which admin a verified token belongs to: 'admin' (full access), 'demo' (read-only) or null.
// The role claim must match the configured email for that role. Customer tokens ({ id }) and the
// old password-in-token format are rejected. Fails closed: with ADMIN_EMAIL / DEMO_ADMIN_EMAIL unset,
// no token can match (undefined === undefined must not pass).
export const adminRole = (token_decode) => {
    if (!token_decode || typeof token_decode !== 'object') return null
    const { ADMIN_EMAIL, DEMO_ADMIN_EMAIL } = process.env
    if (token_decode.role === 'admin' && ADMIN_EMAIL && token_decode.email === ADMIN_EMAIL) return 'admin'
    if (token_decode.role === 'demo-admin' && DEMO_ADMIN_EMAIL && token_decode.email === DEMO_ADMIN_EMAIL) return 'demo'
    return null
}

const verifyAdmin = ({ allowDemo }) => async (req, res, next) => {
    try {
        const { token } = req.headers
        if (!token) {
            return res.json({ success: false, message: NOT_AUTHORIZED })
        }
        const role = adminRole(jwt.verify(token, process.env.JWT_SECRET))
        if (!role) {
            return res.json({ success: false, message: NOT_AUTHORIZED })
        }
        if (role === 'demo' && !allowDemo) {
            return res.json({ success: false, message: DEMO_READ_ONLY })
        }
        req.adminDemo = role === 'demo'
        next()
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: NOT_AUTHORIZED })
    }
}

// Changes (products, order status): full admin only
const adminAuth = verifyAdmin({ allowDemo: false })

// Read-only views (order list, subscriber count): full admin or the demo admin (sets req.adminDemo)
export const adminReadAuth = verifyAdmin({ allowDemo: true })

export default adminAuth
