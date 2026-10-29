import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import stripe from "../config/stripe.js";
import { backendUrl as configuredBackendUrl, frontendUrl } from "../config/env.js";
import { sendServerError } from "../utils/http.js";
import { unitsLeft, stockMessage } from "../utils/stock.js";
import { isDemoCustomer } from "./userController.js";

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

// Limits that stop one account from holding the whole inventory
export const MAX_ORDER_LINES = 20;
export const MAX_ORDER_UNITS = 30;
export const MAX_OPEN_CARD_ORDERS = 3;   // unpaid card checkouts per customer
export const MAX_OPEN_COD_ORDERS = 10;   // cash-on-delivery orders not yet being packed

// Orders from the shared demo shopper always use this fictional address, so one visitor's real details
// are never stored where the next visitor would see them. Demo orders also don't take real stock.
export const DEMO_ORDER_ADDRESS = Object.freeze({
  firstName: "Demo", lastName: "Shopper", email: "demo@forever-store.example", street: "3rd Floor, Road No. 12, Banjara Hills",
  city: "Hyderabad", state: "Telangana", zipcode: "500034", country: "India", phone: "9000000000",
});

// ----------------- SERVER-SIDE PRICING -----------------
// The client sends which products/sizes/quantities it wants, but prices and the total are
// always taken from the database — a tampered request can't change what the customer pays.
const buildOrderItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError("Your bag is empty");
  }
  if (items.length > MAX_ORDER_LINES) {
    throw new OrderValidationError(`An order can have up to ${MAX_ORDER_LINES} different items`);
  }
  const units = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
  if (units > MAX_ORDER_UNITS) {
    throw new OrderValidationError(`An order can have up to ${MAX_ORDER_UNITS} pieces. Please place a second order for the rest.`);
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
    if (quantity > unitsLeft(product, item.size)) throw new OrderValidationError(stockMessage(product.name, item.size, unitsLeft(product, item.size)));
    // Same shape the frontend already sends (product fields + size + quantity), but from the DB.
    // Live stock and review totals aren't part of what was bought, so they aren't copied onto the order.
    const { stock, rating, reviewCount, ...snapshot } = product; // eslint-disable-line no-unused-vars
    return { ...snapshot, size: item.size, quantity };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { orderItems, amount: subtotal + deliveryCharge };
};

// ----------------- STOCK -----------------
// product.stock maps size → units left; a size without an entry isn't tracked. Every order that isn't
// Cancelled holds its units: they are taken when the order is created (or re-opened by the admin) and
// given back exactly once, when it is cancelled or an unpaid card order is removed. Items whose units
// were taken carry stockReserved: true, so only those are given back.

export const releaseStock = async (items = []) => {
  for (const item of items.filter((i) => i.stockReserved)) {
    const path = `stock.${item.size}`;
    // $exists: if the admin has since stopped tracking this size, there is nothing to give back
    await productModel.updateOne({ _id: item._id, [path]: { $exists: true } }, { $inc: { [path]: item.quantity } });
  }
};

// All or nothing: each size is decremented only while enough units are left (one atomic update per item),
// so two shoppers can't both buy the last one. Returns the items with stockReserved set.
export const reserveStock = async (items) => {
  const reserved = [];
  try {
    for (const item of items) {
      const path = `stock.${item.size}`;
      const res = await productModel.updateOne({ _id: item._id, [path]: { $gte: item.quantity } }, { $inc: { [path]: -item.quantity } });
      if (res.modifiedCount === 1) {
        reserved.push({ ...item, stockReserved: true });
        continue;
      }
      const product = await productModel.findById(item._id).select("name stock").lean();
      const left = unitsLeft(product, item.size);
      if (product && left !== Infinity) throw new OrderValidationError(stockMessage(product.name, item.size, left));
      reserved.push({ ...item, stockReserved: false }); // size not tracked (or product since deleted)
    }
    return reserved;
  } catch (err) {
    await releaseStock(reserved);
    throw err;
  }
};

// Removes an abandoned card checkout (never paid, still "Order Placed") and gives its units back, once:
// the conditional delete means only one of the redirect, the webhook or the list sync can win.
// Orders the admin has moved on, or that were cancelled, are never deleted this way.
const discardUnpaidOrder = async (orderId) => {
  const removed = await orderModel.findOneAndDelete({ _id: orderId, payment: false, status: "Order Placed" });
  if (removed) await releaseStock(removed.items);
  return Boolean(removed);
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
const paymentIntentId = (session) =>
  typeof session?.payment_intent === "string" ? session.payment_intent : session?.payment_intent?.id;

// Refunds a payment that arrived for an order that had already been cancelled (its units were back on
// sale). The idempotency key makes repeats (redirect + webhook) a single refund.
const refundSession = async (session) => {
  const intent = paymentIntentId(session);
  if (!stripe || !intent) {
    console.error("[stripe] Payment for a cancelled order needs a manual refund. Session:", session?.id);
    return;
  }
  try {
    await stripe.refunds.create({ payment_intent: intent }, { idempotencyKey: `refund-cancelled-${intent}` });
    console.log("[stripe] Refunded payment for cancelled order", session.metadata?.orderId);
  } catch (err) {
    if (err?.code !== "charge_already_refunded") console.error("[stripe] Automatic refund failed:", err.message);
  }
};

// A confirmed card payment. The order is marked paid only while it is still unpaid and not cancelled, in
// one atomic update, so the redirect, the webhook and the list sync can't disagree or apply it twice.
// If the order was cancelled first, the customer is refunded instead. Returns 'paid' | 'refunded'.
export const settlePaidOrder = async (order, session) => {
  const paid = await orderModel.findOneAndUpdate(
    { _id: order._id, payment: false, status: { $ne: "Cancelled" } },
    { payment: true },
    { new: true }
  );
  if (paid) {
    await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
    return "paid";
  }
  const current = await orderModel.findById(order._id).lean();
  if (current?.payment) return "paid"; // recorded a moment ago by another path
  await refundSession(session);
  return "refunded";
};

// A delayed bank payment that failed leaves the session "complete" but unpaid
const asyncPaymentFailed = async (session) => {
  const intent = paymentIntentId(session);
  if (!stripe || !intent || session.status !== "complete" || session.payment_status === "paid") return false;
  const pi = await stripe.paymentIntents.retrieve(intent);
  return ["canceled", "requires_payment_method"].includes(pi.status);
};

// Makes sure an unpaid order's checkout can no longer be paid before the order is cancelled or removed.
// Returns 'closed' (expired, or no session) | 'paid' | 'processing' (finished, payment pending) | 'open'
// (still payable, e.g. Stripe couldn't be reached — the caller must not cancel then).
const closeCheckout = async (order) => {
  if (!stripe || order.paymentMethod !== "Stripe" || !order.stripeSessionId) return { state: "closed" };
  let session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  if (session.status === "open") {
    try {
      session = await stripe.checkout.sessions.expire(session.id);
    } catch {
      session = await stripe.checkout.sessions.retrieve(order.stripeSessionId); // it may have just completed
    }
  }
  if (session.payment_status === "paid") return { state: "paid", session };
  if (session.status === "complete") return { state: (await asyncPaymentFailed(session)) ? "closed" : "processing", session };
  return { state: session.status === "expired" ? "closed" : "open", session };
};

// Brings an unpaid Stripe order in line with its Checkout Session.
// Returns 'paid' | 'refunded' | 'removed' | 'open' | 'processing' | 'skipped'.
const syncStripeOrder = async (order) => {
  if (!stripe || order.paymentMethod !== "Stripe" || order.payment || !order.stripeSessionId) return "skipped";
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  if (session.metadata?.orderId !== String(order._id)) return "skipped";

  if (session.payment_status === "paid") return settlePaidOrder(order, session);
  if (session.status === "expired" || (await asyncPaymentFailed(session))) {
    // Abandoned checkout or failed bank payment: nothing was charged, so remove the order and free its units
    return (await discardUnpaidOrder(order._id)) ? "removed" : "skipped";
  }
  return session.status === "complete" ? "processing" : "open";
};

// Reconciles pending Stripe orders before they are listed, so lists never show stale "pending" orders.
const syncPendingStripeOrders = async (orders) => {
  const pending = orders
    .filter((o) => o.paymentMethod === "Stripe" && !o.payment && o.stripeSessionId && o.status !== "Cancelled")
    .slice(0, 20);
  if (pending.length === 0) return false;
  const results = await Promise.allSettled(pending.map(syncStripeOrder));
  results.forEach((r) => r.status === "rejected" && console.log("Stripe sync failed:", r.reason?.message));
  return results.some((r) => r.status === "fulfilled" && (r.value === "paid" || r.value === "removed"));
};

// Who is ordering, and what gets stored. The shared demo shopper's typed details are replaced by the
// sample address and its orders don't hold stock; everyone else is checked against the open-order caps.
const prepareOrder = async (userId, { items, address }, paymentMethod) => {
  const user = await userModel.findById(userId).select("email");
  if (!user) throw new OrderValidationError("Please sign in again to place your order");
  const demo = isDemoCustomer(user);
  const cleanAddress = demo ? { ...DEMO_ORDER_ADDRESS } : validateAddress(address);
  const { orderItems, amount } = await buildOrderItems(items);

  if (!demo) {
    const open = paymentMethod === "Stripe"
      ? { userId: String(userId), paymentMethod: "Stripe", payment: false, status: "Order Placed" }
      : { userId: String(userId), paymentMethod: "COD", status: "Order Placed" };
    let count = await orderModel.countDocuments(open);
    if (paymentMethod === "Stripe" && count >= MAX_OPEN_CARD_ORDERS) {
      // Abandoned checkouts may simply not have been cleaned up yet
      await syncPendingStripeOrders(await orderModel.find(open));
      count = await orderModel.countDocuments(open);
    }
    const max = paymentMethod === "Stripe" ? MAX_OPEN_CARD_ORDERS : MAX_OPEN_COD_ORDERS;
    if (count >= max) {
      throw new OrderValidationError(
        paymentMethod === "Stripe"
          ? "You have card payments that aren't finished yet. Complete or cancel them in My orders first."
          : `You have ${count} orders waiting to be packed. Please wait for those before placing more.`
      );
    }
  }
  return { demo, cleanAddress, orderItems, amount };
};

const holdStock = (orderItems, demo) =>
  demo ? orderItems.map((item) => ({ ...item, stockReserved: false })) : reserveStock(orderItems);

// ----------------- COD ORDER -----------------
const placeOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { demo, cleanAddress, orderItems, amount } = await prepareOrder(userId, req.body, "COD");
    const reservedItems = await holdStock(orderItems, demo);

    const newOrder = new orderModel({
      userId,
      items: reservedItems,
      address: cleanAddress,
      amount,
      paymentMethod: "COD",
      currency: ORDER_CURRENCY,
      payment: false,
      date: Date.now(),
    });

    try {
      await newOrder.save();
    } catch (saveErr) {
      await releaseStock(reservedItems);
      throw saveErr;
    }
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
    const backendUrl = publicBackendUrl();
    if (!stripe || !backendUrl || !frontendUrl()) {
      console.error("[config] Card payments disabled: STRIPE_SECRET_KEY, BACKEND_URL or FRONTEND_URL is not set");
      return res.json({ success: false, message: "Card payments are temporarily unavailable. Please choose cash on delivery." });
    }

    const { demo, cleanAddress, orderItems, amount } = await prepareOrder(userId, req.body, "Stripe");
    const reservedItems = await holdStock(orderItems, demo);
    const newOrder = new orderModel({
      userId,
      items: reservedItems,
      address: cleanAddress,
      amount,
      paymentMethod: "Stripe",
      currency: ORDER_CURRENCY,
      payment: false,
      date: Date.now(),
    });

    try {
      await newOrder.save();
    } catch (saveErr) {
      await releaseStock(reservedItems);
      throw saveErr;
    }

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
      // Don't leave an order (or held stock) behind for a payment page that was never created
      await discardUnpaidOrder(newOrder._id);
      throw stripeErr;
    }

    // One update, and undo everything if it fails: an order without its session id could never be
    // matched to a payment or cleaned up, and would hold its stock forever
    try {
      await orderModel.updateOne({ _id: newOrder._id }, { stripeSessionId: session.id });
    } catch (saveErr) {
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      await discardUnpaidOrder(newOrder._id);
      throw saveErr;
    }

    res.json({ success: true, session_url: session.url });
  } catch (err) {
    res.json({ success: false, message: validationMessage(err) });
  }
};

// ----------------- VERIFY STRIPE -----------------
// Stripe redirects here after checkout. The link needs no sign-in, so it proves itself with the Checkout
// Session id Stripe adds to it: only a request carrying this order's own session id can confirm or cancel
// it (knowing an order id alone does nothing). The query string is NOT trusted for the outcome: the order
// is only marked paid when Stripe reports the session as paid, and only removed once Stripe confirms the
// checkout can no longer be paid.
const verifyStripe = async (req, res) => {
  const frontend = frontendUrl();
  const cartUrl = frontend + "/cart";
  try {
    const { orderId, session_id } = req.query;
    if (typeof orderId !== "string" || !/^[a-f0-9]{24}$/i.test(orderId)) return res.redirect(cartUrl);
    const order = await orderModel.findById(orderId);
    if (!order || order.paymentMethod !== "Stripe") return res.redirect(cartUrl);
    if (typeof session_id !== "string" || !order.stripeSessionId || session_id !== order.stripeSessionId) {
      return res.redirect(cartUrl);
    }

    const successUrl = frontend + "/order-success?orderId=" + order._id;
    if (order.payment) return res.redirect(successUrl); // already confirmed (e.g. page refresh)
    if (!stripe) return res.redirect(cartUrl);

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.metadata?.orderId !== String(order._id)) return res.redirect(cartUrl);

    if (session.payment_status === "paid") {
      const result = await settlePaidOrder(order, session);
      return res.redirect(result === "paid" ? successUrl : frontend + "/orders");
    }

    // Cancelled on the payment page or abandoned: close the checkout first, then remove the order
    const { state } = await closeCheckout(order);
    if (state === "paid") {
      await settlePaidOrder(order, session);
      return res.redirect(successUrl);
    }
    if (state === "processing") return res.redirect(frontend + "/orders"); // payment still going through
    if (state === "closed") {
      await discardUnpaidOrder(order._id);
      return res.redirect(cartUrl + "?payment=cancelled");
    }
    return res.redirect(cartUrl); // Stripe couldn't close it right now; the list sync will retry
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
      if (paid) await settlePaidOrder(order, session); // refunds instead if the order was cancelled first
      else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
        await discardUnpaidOrder(order._id);
      }
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

    // The demo shopper is shared: orders placed before demo orders used the sample address may still hold
    // a visitor's real details, so they are never sent to the next visitor
    const user = await userModel.findById(req.userId).select("email");
    if (user && isDemoCustomer(user)) {
      orders = orders.map((o) => {
        const { stripeSessionId, ...order } = o.toObject(); // eslint-disable-line no-unused-vars
        return { ...order, address: { ...DEMO_ORDER_ADDRESS } };
      });
    }
    res.json({ success: true, orders });
  } catch (err) {
    sendServerError(res, err);
  }
};

// An unpaid card order may only be cancelled once its checkout can no longer be paid. Returns an error
// message for the caller to show, or null when it is safe to cancel.
const checkoutBlocksCancel = async (order) => {
  if (order.paymentMethod !== "Stripe" || order.payment || !order.stripeSessionId) return null;
  const { state, session } = await closeCheckout(order);
  if (state === "paid") {
    await settlePaidOrder(order, session);
    return "This order was just paid, so it can't be cancelled here.";
  }
  if (state === "processing") return "The card payment for this order is still being processed. Please try again later.";
  if (state === "open") return "We couldn't reach the payment provider to stop this payment. Please try again.";
  return null;
};

// ----------------- CANCEL (customer) -----------------
// Only the order's owner, only before it ships, and only if nothing has been charged
// (paid card orders would need a Stripe refund, which isn't implemented).
const CANCELLABLE_STATUSES = ["Order Placed", "Packing"];

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (typeof orderId !== "string" || !/^[a-f0-9]{24}$/i.test(orderId)) return res.json({ success: false, message: "Order not found" });
    const order = await orderModel.findById(orderId);

    if (!order || order.userId !== String(req.userId)) {
      return res.json({ success: false, message: "Order not found" });
    }

    // For card orders, stop the payment page first: the payment may be completing in another tab
    if (!order.payment && CANCELLABLE_STATUSES.includes(order.status)) {
      const blocked = await checkoutBlocksCancel(order);
      if (blocked) return res.json({ success: false, message: blocked });
    }

    if (order.payment) {
      return res.json({ success: false, message: "Paid orders can't be cancelled online. Please contact support for a refund." });
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.json({ success: false, message: "This order can no longer be cancelled" });
    }

    // Conditional update, so a double click (or an admin change at the same moment) can't give units back twice
    const cancelled = await orderModel.findOneAndUpdate(
      { _id: order._id, status: { $in: CANCELLABLE_STATUSES }, payment: false },
      { status: "Cancelled" }
    );
    if (!cancelled) return res.json({ success: false, message: "This order can no longer be cancelled" });
    await releaseStock(cancelled.items);
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
      // The Stripe session id is what proves a payment-page return (see verifyStripe), so it is never shown
      orders = orders.map((o) => {
        const { userId, stripeSessionId, ...order } = o.toObject(); // eslint-disable-line no-unused-vars
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

    if (typeof orderId !== "string" || !/^[a-f0-9]{24}$/i.test(orderId)) return res.json({ success: false, message: "Order not found" });
    const order = await orderModel.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });
    if (order.status === status) return res.json({ success: true, message: "Status Updated" });

    // There is no refund workflow, so a paid order can't simply be marked Cancelled
    if (status === "Cancelled" && order.payment) {
      return res.json({
        success: false,
        message: "Paid orders can't be cancelled here. Issue the refund first (e.g. in the Stripe dashboard).",
      });
    }

    // A card order isn't fulfilled until it is paid: it can only be cancelled meanwhile
    if (order.paymentMethod === "Stripe" && !order.payment && status !== "Cancelled") {
      return res.json({ success: false, message: "Wait until the card payment is confirmed before changing this order." });
    }

    const update = { status };
    // Cash on delivery is collected on delivery, so it counts as paid exactly when the order is Delivered
    if (order.paymentMethod === "COD") update.payment = status === "Delivered";

    const wasCancelled = order.status === "Cancelled";
    const nowCancelled = status === "Cancelled";
    // Every change applies only if the order is still exactly as it was read here; otherwise someone
    // (the customer cancelling, Stripe confirming a payment, another admin tab) changed it in between
    const unchanged = { _id: order._id, status: order.status, payment: order.payment };
    const CONFLICT = { success: false, message: "This order was changed a moment ago. Refresh the page and try again." };

    if (!wasCancelled && nowCancelled) {
      // Stop a pending card payment first, so a cancelled order can't be paid afterwards
      const blocked = await checkoutBlocksCancel(order);
      if (blocked) return res.json({ success: false, message: blocked });
      const previous = await orderModel.findOneAndUpdate(unchanged, update);
      if (!previous) return res.json(CONFLICT);
      await releaseStock(previous.items); // only the request that cancelled it gives the units back
    } else if (wasCancelled && !nowCancelled) {
      // Re-opening a cancelled order takes its units again, which fails if they have been sold since
      const items = await reserveStock(order.items.map(({ stockReserved, ...item }) => item)); // eslint-disable-line no-unused-vars
      const reopened = await orderModel.findOneAndUpdate(unchanged, { ...update, items });
      if (!reopened) {
        await releaseStock(items);
        return res.json(CONFLICT);
      }
    } else {
      const moved = await orderModel.findOneAndUpdate(unchanged, update);
      if (!moved) return res.json(CONFLICT);
    }

    res.json({ success: true, message: "Status Updated" });
  } catch (err) {
    if (err instanceof OrderValidationError) return res.json({ success: false, message: `Can't re-open this order: ${err.message}` });
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
