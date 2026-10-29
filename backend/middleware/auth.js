import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
    const { token } = req.headers;

    if (!token) {
        return res.json({ success: false, message: 'Not Authorized Login Again' });
    }

    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);

        // Customer tokens carry { id }; anything else (e.g. an admin token) is not a customer session.
        // Tokens without an expiry (issued before sessions expired) are rejected too.
        if (!token_decode || typeof token_decode !== 'object' || !token_decode.id || !token_decode.exp) {
            return res.json({ success: false, message: 'Not Authorized Login Again' });
        }

        req.userId = token_decode.id;

        next();
    } catch (error) {
        // expired / tampered tokens all mean the same thing to the client: sign in again
        console.log(error.message);
        res.json({ success: false, message: 'Not Authorized Login Again' });
    }
};

export default authUser;
