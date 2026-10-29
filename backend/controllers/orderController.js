import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import stripe from "../config/stripe.js";
import { backendUrl as configuredBackendUrl, frontendUrl } from "../config/env.js";
import { sendServerError } from "../utils/http.js";

// Store currency. Product prices and delivery are whole rupees; Stripe amounts are in paise (×100).
// Orders placed before the INR switch have no `currency` and are treated as USD (see orderModel).
export const ORDER_CURRENCY = "INR";
const currency = "inr";
export const deliveryCharge = 99;

// Stripe's minimum Checkout Session lifetime. Abandoned sessions expire after this and the
// pending order is cleaned up the next time order lists are loaded (see syncStripeOrder).
const STRIPE_SESSION_TTL_SECONDS = 30 * 60;

// Every status the admin panel can set
const ORDER_STATUSES = ["Order Placed", "Packing", "Shipped", "Out for delivery", "Delivered", "Cancelled"];

// Stripe return URLs come from configuration (config/env.js), never from the request's Host header.
// Local development falls back to this server; production must set BACKEND_URL and FRONTEND_URL.
const publicBackendUrl = configuredBackendUrl;

export class OrderValidationError extends Error {}

// ----------------- SERVER-SIDE PRICING -----------------
// The client sends which products/sizes/quantities it wants, but prices and the total are
// always taken from the database — a tampered request can't change what the customer pays.
const buildOrderItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError("Your bag is empty");
  }

  const ids = [...new Set(items.map((item) => String(item?._id)))];
  const products = await productModel.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const orderItems = items.map((item) => {
    const product = byId.get(String(item?._id));
    const quantity = Number(item?.quantity);
    if (!product) throw new OrderValidationError("Some items in your bag are no longer available");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new OrderValidationError("Invalid item quantity");
    if (!product.sizes.includes(item.size)) throw new OrderValidationError(`Size ${item.size} is not available for ${product.name}`);
    // Same shape the frontend already sends (product fields + size + quantity), but from the DB
    return { ...product, size: item.size, quantity };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { orderItems, amount: subtotal + deliveryCharge };
};

// ----------------- SERVER-SIDE ADDRESS VALIDATION -----------------
// Same rules as the checkout form (frontend/src/pages/PlaceOrder.jsx). Only known fields are stored.
const NAME_LIKE = /^[\p{L}][\p{L}\s'.-]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const nameCheck = (label, min = 2) => (v) =>
  v.length < min || v.length > 50 || !NAME_LIKE.test(v) ? `Please enter a valid ${label}` : "";

const ADDRESS_RULES = {
  firstName: nameCheck("first name"),
  lastName: nameCheck("last name", 1),
  email: (v) => (!EMAIL_PATTERN.test(v) || v.length > 254 ? "Please enter a valid email address" : ""),
  street: (v) => (v.length < 5 || v.length > 120 || !/\p{L}/u.test(v) ? "Please enter a full street address" : ""),
  city: nameCheck("city"),
  state: nameCheck("state"),
  zipcode: (v) => (!/^[0-9]{4,10}$/.test(v) ? "ZIP / postal code must be 4–10 digits" : ""),
  country: nameCheck("country"),
  // Indian mobile numbers: 10 digits starting with 6, 7, 8 or 9
  phone: (v) => (!/^[6-9][0-9]{9}$/.test(v) ? "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9" : ""),
};

export const validateAddress = (address) => {
  if (!address || typeof address !== "object") throw new OrderValidationError("Please enter your delivery details");
  const clean = {};
  for (const [field, rule] of Object.entries(ADDRESS_RULES)) {
    const value = typeof address[field] === "string" ? address[field].trim() : "";
    const problem = value ? rule(value) : "Please complete all delivery details";
    if (problem) throw new OrderValidationError(problem);
    clean[field] = value;
  }
  return clean;
};

// Only our own validation messages are shown to customers; anything else gets a generic message
const validationMessage = (err) => {
  if (err instanceof OrderValidationError) return err.message;
  if (err?.name === "CastError") return "Some items in your bag are no longer available";
  console.error(err);
  return "We couldn't place your order. Please try again.";
};

// ----------------- STRIPE HELPERS -----------------
const expireSessionIfOpen = async (sessionId) => {
  if (!stripe) return;
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch {
    // already expired or completed — nothing to do
  }
};

// A confirmed card payment: mark the order paid and empty the customer's bag
const markPaid = async (order) => {
  order.payment = true;
  await order.save();
  await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
};

// Brings an unpaid Stripe order in line with its Checkout Session.
// Returns 'paid' | 'removed' | 'open' | 'processing' | 'skipped'.
const syncStripeOrder = async (order) => {
  if (!stripe || order.paymentMethod !== "Stripe" || order.payment || !order.stripeSessionId) return "skipped";
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  if (session.metadata?.orderId !== String(order._id)) return "skipped";

  if (session.payment_status === "paid") {
    await markPaid(order);
    return "paid";
  }
  if (session.status === "expired") {
    // Abandoned checkout: nothing was charged, so remove the unpaid order (same as a cancelled checkout)
    await orderModel.findByIdAndDelete(order._id);
    return "removed";
  }
  return session.status === "complete" ? "processing" : "open";
};

// Reconciles pending Stripe orders before they are listed, so lists never show stale "pending" orders.
const syncPendingStripeOrders = async (orders) => {
  const pending = orders.filter((o) => o.paymentMethod === "Stripe" && !o.payment && o.stripeSessionId).slice(0, 20);
  if (pending.length === 0) return false;
  const results = await Promise.allSettled(pending.map(syncStripeOrder));
  results.forEach((r) => r.status === "rejected" && console.log("Stripe sync failed:", r.reason?.message));
  return results.some((r) => r.status === "fulfilled" && (r.value === "paid" || r.value === "removed"));
};

// ----------------- COD ORDER -----------------
const placeOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { items, address } = req.body;
    const cleanAddress = validateAddress(address);
    const { orderItems, amount } = await buildOrderItems(items);

    const newOrder = new orderModel({
      userId,
      items: orderItems,
      address: cleanAddress,
      amount,
      paymentMethod: "COD",
      currency: ORDER_CURRENCY,
      payment: false,
      date: Date.now(),
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    res.json({ success: true, message: "Order Placed", orderId: newOrder._id });
  } catch (err) {
    res.json({ success: false, message: validationMessage(err) });
  }
};

// ----------------- STRIPE ORDER -----------------
const placeOrderStripe = async (req, res) => {
  try {
    const userId = req.userId;
    const { items, address } = req.body;
    const cleanAddress = validateAddress(address);
    const { orderItems, amount } = await buildOrderItems(items);

    const backendUrl = publicBackendUrl();
    if (!stripe || !backendUrl || !frontendUrl()) {
      console.error("[config] Card payments disabled: STRIPE_SECRET_KEY, BACKEND_URL or FRONTEND_URL is not set");
      return res.json({ success: false, message: "Card payments are temporarily unavailable. Please choose cash on delivery." });
    }

    const newOrder = new orderModel({
      userId,
      items: orderItems,
      address: cleanAddress,
      amount,
      paymentMethod: "Stripe",
      currency: ORDER_CURRENCY,
      payment: false,
      date: Date.now(),
    });

    await newOrder.save();

    const line_items = orderItems.map(item => ({
      price_data: {
        currency,
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency,
        product_data: { name: "Delivery Charges" },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    let session;
    try {
      // {CHECKOUT_SESSION_ID} is filled in by Stripe on both return URLs (verified in test mode)
      session = await stripe.checkout.sessions.create({
        success_url: `${backendUrl}/api/order/verifyStripe?success=true&orderId=${newOrder._id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${backendUrl}/api/order/verifyStripe?success=false&orderId=${newOrder._id}&session_id={CHECKOUT_SESSION_ID}`,
        mode: "payment",
        line_items,
        metadata: { orderId: String(newOrder._id) },
        expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_TTL_SECONDS,
      });
    } catch (stripeErr) {
      // Don't leave an order behind for a payment page that was never created
      await orderModel.findByIdAndDelete(newOrder._id);
      throw stripeErr;
    }

    newOrder.stripeSessionId = session.id;
    await newOrder.save();

    res.json({ success: true, session_url: session.url });
  } catch (err) {
    res.json({ success: false, message: validationMessage(err) });
  }
};

// ----------------- VERIFY STRIPE -----------------
// Stripe redirects here after checkout. The query string is NOT trusted: the order is only marked
// paid when Stripe reports its stored session as paid. A cancelled checkout expires the session
// (so it can't be paid later from browser history) and removes the unpaid order.
const verifyStripe = async (req, res) => {
  const frontend = frontendUrl();
  const cartUrl = frontend + "/cart";
  try {
    const { orderId, session_id } = req.query;
    const order = await orderModel.findById(orderId);
    if (!order || order.paymentMethod !== "Stripe") return res.redirect(cartUrl);

    const successUrl = frontend + "/order-success?orderId=" + order._id;
    if (order.payment) return res.redirect(successUrl); // already confirmed (e.g. page refresh)
    if (!stripe) return res.redirect(cartUrl);

    // Prefer the session stored on the order; a different session_id in the URL is rejected
    const sessionId = order.stripeSessionId || session_id;
    if (!sessionId || (order.stripeSessionId && session_id && session_id !== order.stripeSessionId)) {
      return res.redirect(cartUrl);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.orderId !== String(order._id)) return res.redirect(cartUrl);

    if (session.payment_status === "paid") {
      await markPaid(order);
      return res.redirect(successUrl);
    }

    if (session.status === "complete") {
      // Checkout finished but payment is still processing — keep the order pending
      return res.redirect(frontend + "/orders");
    }

    // Cancelled (session still open) or abandoned (expired): nothing was charged
    if (session.status === "open") await expireSessionIfOpen(session.id);
    await orderModel.findByIdAndDelete(order._id);
    return res.redirect(cartUrl + "?payment=cancelled");
  } catch (err) {
    console.log(err);
    return res.redirect(cartUrl);
  }
};

// ----------------- STRIPE WEBHOOK -----------------
// Stripe calls this directly when a Checkout Session finishes or expires, so an order is marked paid even
// if the customer closes the tab before the redirect. The signature (STRIPE_WEBHOOK_SECRET) proves the
// request came from Stripe; the route receives the raw body, which the signature check needs.
const stripeWebhook = async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return res.status(503).json({ received: false });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
  } catch (err) {
    console.log("Stripe webhook signature check failed:", err.message);
    return res.status(400).json({ received: false });
  }

  try {
    const session = event.data?.object;
    const orderId = session?.metadata?.orderId;
    const order = typeof orderId === "string" && /^[a-f0-9]{24}$/i.test(orderId) ? await orderModel.findById(orderId) : null;

    // Only the session this order was created with (same rule as verifyStripe)
    if (order && order.paymentMethod === "Stripe" && order.stripeSessionId === session.id && !order.payment) {
      const paid =
        (event.type === "checkout.session.completed" && session.payment_status === "paid") ||
        event.type === "checkout.session.async_payment_succeeded";
      if (paid) await markPaid(order);
      else if (event.type === "checkout.session.expired") await orderModel.findByIdAndDelete(order._id);
    }
    res.json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ received: false }); // Stripe retries failed deliveries
  }
};

// ----------------- USER ORDERS -----------------
const userOrders = async (req, res) => {
  try {
    const query = () => orderModel.find({ userId: req.userId }).sort({ date: -1 });
    let orders = await query();
    if (await syncPendingStripeOrders(orders)) orders = await query();
    res.json({ success: true, orders });
  } catch (err) {
    sendServerError(res, err);
  }
};

// ----------------- CANCEL (customer) -----------------
// Only the order's owner, only before it ships, and only if nothing has been charged
// (paid card orders would need a Stripe refund, which isn't implemented).
const CANCELLABLE_STATUSES = ["Order Placed", "Packing"];

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await orderModel.findById(orderId);

    if (!order || order.userId !== String(req.userId)) {
      return res.json({ success: false, message: "Order not found" });
    }

    // For card orders, check Stripe first: the payment may have completed in another tab
    if (order.paymentMethod === "Stripe" && !order.payment && order.stripeSessionId) {
      const state = await syncStripeOrder(order);
      if (state === "removed") return res.json({ success: true, message: "Order cancelled" });
      if (state === "open") await expireSessionIfOpen(order.stripeSessionId);
    }

    if (order.payment) {
      return res.json({ success: false, message: "Paid orders can't be cancelled online. Please contact support for a refund." });
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.json({ success: false, message: "This order can no longer be cancelled" });
    }

    order.status = "Cancelled";
    await order.save();
    res.json({ success: true, message: "Order cancelled" });
  } catch (err) {
    sendServerError(res, err);
  }
};

// ----------------- ADMIN -----------------
// The demo admin sees real orders but not who placed them: name, street, ZIP, phone and email are
// replaced; city/state/country stay so the list still reads like a real store.
export const maskAddress = (address = {}) => ({
  firstName: "Customer",
  lastName: "(hidden in demo)",
  street: "Address hidden",
  city: address.city || "",
  state: address.state || "",
  country: address.country || "",
  zipcode: "•••",
  phone: "Phone hidden",
});

const allOrders = async (req, res) => {
  try {
    const query = () => orderModel.find({}).sort({ date: -1 });
    let orders = await query();
    if (await syncPendingStripeOrders(orders)) orders = await query();
    if (req.adminDemo) {
      orders = orders.map((o) => {
        const { userId, ...order } = o.toObject(); // eslint-disable-line no-unused-vars
        return { ...order, address: maskAddress(order.address) };
      });
    }
    res.json({ success: true, orders });
  } catch (err) {
    sendServerError(res, err);
  }
};

const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.json({ success: false, message: "Invalid order status" });
    }

    const order = await orderModel.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });

    // There is no refund workflow, so a paid order can't simply be marked Cancelled
    if (status === "Cancelled" && order.payment) {
      return res.json({
        success: false,
        message: "Paid orders can't be cancelled here. Issue the refund first (e.g. in the Stripe dashboard).",
      });
    }

    order.status = status;
    // Cash on delivery is collected on delivery, so it counts as paid exactly when the order is Delivered
    if (order.paymentMethod === "COD") order.payment = status === "Delivered";
    await order.save();

    res.json({ success: true, message: "Status Updated" });
  } catch (err) {
    sendServerError(res, err);
  }
};

export {
  placeOrder,
  placeOrderStripe,
  verifyStripe,
  stripeWebhook,
  userOrders,
  cancelOrder,
  allOrders,
  updateStatus
};
