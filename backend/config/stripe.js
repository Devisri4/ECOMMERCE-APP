import Stripe from "stripe";

// Created only when a key is configured, so a missing STRIPE_SECRET_KEY disables card payments
// instead of crashing the whole API at startup. Callers must handle `stripe === null`.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export default stripe;
