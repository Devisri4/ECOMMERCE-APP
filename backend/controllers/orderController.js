import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

const currency = "inr";
const deliveryCharge = 10;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ----------------- COD ORDER -----------------
const placeOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { items, amount, address } = req.body;

    const newOrder = new orderModel({
      userId,
      items,
      address,
      amount,
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    res.json({ success: true, message: "Order Placed" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// ----------------- STRIPE ORDER -----------------
const placeOrderStripe = async (req, res) => {
  try {
    const userId = req.userId;
    const { items, amount, address } = req.body;

    const newOrder = new orderModel({
      userId,
      items,
      address,
      amount,
      paymentMethod: "Stripe",
      payment: false,
      date: Date.now(),
    });

    await newOrder.save();

    const line_items = items.map(item => ({
      price_data: {
        currency,
        product_data: { name: item.name },
        unit_amount: item.price * 100,
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

    const session = await stripe.checkout.sessions.create({
      success_url: `http://localhost:4000/api/order/verifyStripe?success=true&orderId=${newOrder._id}`,
      cancel_url: `http://localhost:4000/api/order/verifyStripe?success=false&orderId=${newOrder._id}`,
      mode: "payment",
      line_items,
    });

    res.json({ success: true, session_url: session.url });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// ----------------- VERIFY STRIPE -----------------
const verifyStripe = async (req, res) => {
  try {
    const { success, orderId } = req.query;

    if (success === "true") {
      const order = await orderModel.findByIdAndUpdate(
        orderId,
        { payment: true },
        { new: true }
      );

      await userModel.findByIdAndUpdate(order.userId, {
        cartData: {}
      });

      return res.redirect(process.env.FRONTEND_URL + "/orders");
    } else {
      await orderModel.findByIdAndDelete(orderId);
      return res.redirect(process.env.FRONTEND_URL + "/cart");
    }
  } catch (err) {
    return res.redirect(process.env.FRONTEND_URL + "/cart");
  }
};


// ----------------- USER ORDERS -----------------
const userOrders = async (req, res) => {
  const orders = await orderModel
    .find({ userId: req.userId })
    .sort({ date: -1 });
  res.json({ success: true, orders });
};

// ----------------- ADMIN -----------------
const allOrders = async (req, res) => {
  const orders = await orderModel.find({});
  res.json({ success: true, orders });
};

const updateStatus = async (req, res) => {
  const { orderId, status } = req.body;
  await orderModel.findByIdAndUpdate(orderId, { status });
  res.json({ success: true });
};

export {
  placeOrder,
  placeOrderStripe,
  verifyStripe,
  userOrders,
  allOrders,
  updateStatus
};
