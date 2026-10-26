import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { ShopContext } from "../context/ShopContext";
import { friendlyError } from "../utils/messages";

// Same values the admin panel can set (admin/src/pages/Orders.jsx)
const STATUS_STEPS = ["Order Placed", "Packing", "Shipped", "Out for delivery", "Delivered"];
// Mirrors the backend rule in cancelOrder: unpaid and not yet shipped
const CANCELLABLE_STATUSES = ["Order Placed", "Packing"];

const paymentLabel = (order) => {
  if (order.payment) return order.paymentMethod === "Stripe" ? "Paid by card" : "Paid";
  return order.paymentMethod === "COD" ? "Cash on delivery" : "Card payment not completed";
};

const canCancel = (order) => !order.payment && CANCELLABLE_STATUSES.includes(order.status);

const TrackingTimeline = ({ status }) => {
  const current = Math.max(0, STATUS_STEPS.indexOf(status));
  return (
    <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-2" aria-label="Order progress">
      {STATUS_STEPS.map((step, index) => {
        const done = index <= current;
        return (
          <li
            key={step}
            aria-current={index === current ? "step" : undefined}
            className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2"
          >
            <span className={`h-1 w-8 shrink-0 sm:w-full ${done ? "bg-ink" : "bg-neutral-200"}`} aria-hidden="true" />
            <span className={`text-xs ${done ? "font-medium text-ink" : "text-neutral-500"}`}>
              {step}
              {index === current && <span className="sr-only"> (current status)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const OrderHistory = () => {
  const { backendUrl, token, currency } = useContext(ShopContext);
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [trackingId, setTrackingId] = useState(null);   // order whose timeline is open
  const [refreshingId, setRefreshingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const loadOrderData = async () => {
    try {
      if (!token) return false;

      const res = await axios.post(
        backendUrl + "/api/order/userorders",
        {},
        { headers: { token } }
      );

      if (res.data.success) {
        setOrderData(res.data.orders || []);
        setLoadFailed(false);
        return true;
      }
      setLoadFailed(true);
      return false;
    } catch (err) {
      console.log(err);
      setLoadFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) setLoading(false);
    loadOrderData();
  }, [token]);

  // Open the timeline and fetch the latest status from the server
  const trackOrder = async (orderId) => {
    if (trackingId === orderId) {
      setTrackingId(null);
      return;
    }
    setTrackingId(orderId);
    setRefreshingId(orderId);
    const ok = await loadOrderData();
    setRefreshingId(null);
    if (!ok) toast.error("We couldn’t refresh your order status. Please try again.");
  };

  const cancelOrder = async (orderId) => {
    if (cancellingId) return;
    setCancellingId(orderId);
    try {
      const res = await axios.post(backendUrl + "/api/order/cancel", { orderId }, { headers: { token } });
      if (res.data.success) {
        toast.success("Your order has been cancelled.");
        setConfirmCancelId(null);
        await loadOrderData();
      } else {
        toast.error(friendlyError(res.data.message, "We couldn’t cancel this order. Please try again."));
        await loadOrderData(); // status may have moved on (e.g. shipped)
      }
    } catch (error) {
      console.log(error);
      toast.error(friendlyError(error, "We couldn’t cancel this order. Please try again."));
    } finally {
      setCancellingId(null);
    }
  };

  if (!token) {
    return (
      <div className="border border-neutral-200 bg-white px-6 py-14 text-center">
        <p className="text-sm text-neutral-600">Sign in to see your orders.</p>
        <Link to="/login?redirect=/orders" className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <span className="sr-only">Loading your orders…</span>
        {[0, 1].map((i) => (
          <div key={i} aria-hidden="true" className="h-40 animate-pulse border border-neutral-200 bg-neutral-100/70" />
        ))}
      </div>
    );
  }

  if (loadFailed && orderData.length === 0) {
    return (
      <div role="alert" className="border border-neutral-200 bg-white px-6 py-14 text-center">
        <p className="text-sm text-neutral-600">We couldn’t load your orders right now.</p>
        <button type="button" onClick={() => { setLoading(true); loadOrderData(); }} className="btn-secondary mt-6">
          Try again
        </button>
      </div>
    );
  }

  if (orderData.length === 0) {
    return (
      <div className="border border-neutral-200 bg-white px-6 py-14 text-center">
        <p className="font-display text-xl text-ink">No orders yet</p>
        <p className="mt-2 text-sm text-neutral-600">When you place an order, it will appear here.</p>
        <Link to="/collection" className="btn-primary mt-6">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {orderData.map((order) => {
        const cancelled = order.status === "Cancelled";
        const isTracking = trackingId === order._id;
        const isRefreshing = refreshingId === order._id;
        const isConfirming = confirmCancelId === order._id;
        const isCancelling = cancellingId === order._id;
        return (
          <article key={order._id} className="border border-neutral-200 bg-white">
            {/* Order summary */}
            <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-neutral-200 px-5 py-4 text-sm sm:px-6">
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <p><span className="text-neutral-500">Order </span><span className="font-medium text-ink">#{order._id.slice(-8).toUpperCase()}</span></p>
                <p><span className="text-neutral-500">Placed </span>{new Date(order.date).toDateString()}</p>
                <p><span className="text-neutral-500">Payment </span>{paymentLabel(order)}</p>
                <p><span className="text-neutral-500">Total </span><span className="font-medium">{currency}{order.amount}</span></p>
              </div>
              <p className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${cancelled ? "bg-red-700" : order.status === "Delivered" ? "bg-green-700" : "bg-ink"}`}
                  aria-hidden="true"
                />
                <span className={`font-medium ${cancelled ? "text-red-800" : "text-ink"}`}>{order.status}</span>
              </p>
            </header>

            {/* Items */}
            <ul className="divide-y divide-neutral-100 px-5 sm:px-6">
              {order.items.map((item, j) => (
                <li key={`${item._id}-${item.size}-${j}`} className="flex gap-4 py-4">
                  <img
                    src={item.image?.[0]}
                    alt={item.name}
                    className="h-24 w-20 shrink-0 bg-neutral-100 object-cover"
                    loading="lazy"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="mt-1 text-neutral-600">
                      {currency}{item.price} · Qty {item.quantity} · Size {item.size}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Actions: track / cancel */}
            <div className="border-t border-neutral-200 px-5 py-4 sm:px-6">
              {cancelled ? (
                <p className="text-sm text-neutral-600">This order was cancelled. You haven’t been charged.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {canCancel(order) && !isConfirming && (
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId(order._id)}
                        className="px-2 py-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-600 underline-offset-4 transition-colors hover:text-red-800 hover:underline"
                      >
                        Cancel order
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => trackOrder(order._id)}
                      disabled={isRefreshing}
                      aria-expanded={isTracking}
                      aria-controls={`tracking-${order._id}`}
                      className="btn-secondary px-6 py-3"
                    >
                      {isRefreshing ? "Updating…" : isTracking ? "Hide tracking" : "Track order"}
                    </button>
                  </div>

                  {/* Inline confirmation so an order is never cancelled by a single mis-click */}
                  {isConfirming && (
                    <div role="alertdialog" aria-labelledby={`cancel-title-${order._id}`} className="mt-4 border border-neutral-200 bg-paper px-4 py-4 text-sm">
                      <p id={`cancel-title-${order._id}`} className="font-medium text-ink">Cancel this order?</p>
                      <p className="mt-1 text-neutral-600">This can’t be undone. You can place a new order at any time.</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => cancelOrder(order._id)}
                          disabled={isCancelling}
                          className="btn-primary px-6 py-3"
                        >
                          {isCancelling ? "Cancelling…" : "Yes, cancel order"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(null)}
                          disabled={isCancelling}
                          className="btn-secondary px-6 py-3"
                        >
                          Keep order
                        </button>
                      </div>
                    </div>
                  )}

                  {isTracking && (
                    <div id={`tracking-${order._id}`} aria-live="polite">
                      <TrackingTimeline status={order.status} />
                      <p className="mt-4 text-xs text-neutral-500">
                        {isRefreshing
                          ? "Checking for the latest status…"
                          : `Current status: ${order.status}. Status is updated by our team as your order progresses.`}
                      </p>
                    </div>
                  )}

                  {!canCancel(order) && order.payment && CANCELLABLE_STATUSES.includes(order.status) && (
                    <p className="mt-3 text-right text-xs text-neutral-500">Need to cancel a paid order? Please contact support.</p>
                  )}
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default OrderHistory;
