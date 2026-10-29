import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';

const NOT_AUTHORIZED = 'Not Authorized Login Again';

const authUser = async (req, res, next) => {
    const { token } = req.headers;

    if (!token) {
        return res.json({ success: false, message: NOT_AUTHORIZED });
    }

    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);

        // Customer tokens carry { id }; anything else (e.g. an admin token) is not a customer session.
        // Tokens without an expiry (issued before sessions expired) are rejected too.
        if (!token_decode || typeof token_decode !== 'object' || !token_decode.id || !token_decode.exp) {
            return res.json({ success: false, message: NOT_AUTHORIZED });
        }

        // The account must still exist, and a password change signs out sessions issued before it
        // (compared in whole seconds, the precision of the token's "issued at")
        const user = await userModel.findById(token_decode.id).select('passwordChangedAt').lean();
        if (!user) return res.json({ success: false, message: NOT_AUTHORIZED });
        if (user.passwordChangedAt && token_decode.iat < Math.floor(user.passwordChangedAt / 1000)) {
            return res.json({ success: false, message: NOT_AUTHORIZED });
        }

        req.userId = token_decode.id;

        next();
    } catch (error) {
        // expired / tampered tokens all mean the same thing to the client: sign in again
        console.log(error.message);
        res.json({ success: false, message: NOT_AUTHORIZED });
    }
};

export default authUser;
