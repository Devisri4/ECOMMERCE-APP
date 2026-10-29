// Small fixed-window rate limiter keyed by client IP (no extra dependency).
// Counts live in memory, so on Vercel each warm instance keeps its own: this slows brute-force
// guessing of passwords rather than being a hard global limit.
const rateLimit = ({ windowMs, max, message }) => {
    const hits = new Map(); // ip -> { count, resetAt }

    return (req, res, next) => {
        const now = Date.now();
        if (hits.size > 10000) {
            for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
        }

        const key = req.ip || "unknown";
        let entry = hits.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }
        entry.count += 1;

        if (entry.count > max) {
            res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
            return res.status(429).json({ success: false, message });
        }
        next();
    };
};

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TOO_MANY_SIGN_INS = "Too many sign-in attempts. Please wait a few minutes and try again.";

export const loginLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 10, message: TOO_MANY_SIGN_INS });
export const adminLoginLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5, message: TOO_MANY_SIGN_INS });
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: "Too many accounts created from this network. Please try again later.",
});
export const newsletterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many sign-ups from this network. Please try again later.",
});
// Placing orders holds stock, so it is limited like sign-in
export const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: "Too many orders from this network. Please try again later.",
});

export const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: "You've posted a lot of reviews. Please try again later.",
});

export default rateLimit;
