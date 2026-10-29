import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { friendlyError } from '../utils/messages'
import { backendUrl } from '../App'
import { formatPrice, orderCurrency } from '../utils/currency'
import { formatDate } from '../utils/date'
import { DEMO_DISABLED } from '../utils/session'
import { thumb } from '../utils/image'

const STATUSES = ['Order Placed', 'Packing', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled']

const statusTone = (status) =>
  status === 'Cancelled' ? 'bg-red-500/10 text-red-300'
    : status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-300'
    : 'bg-violet-500/10 text-violet-300'

const Orders = ({ token, demo = false }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false) // a failed load must not look like "no orders"
  // Orders with a status change in flight (several can be pending at once)
  const [updating, setUpdating] = useState(() => new Set())
  const markUpdating = (id, on) => setUpdating((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next })

  // keepOnError: a refresh after a status change that fails keeps the list on screen (with a toast)
  const fetchAllOrders = async ({ keepOnError = false } = {}) => {
    try {
      if (!token) return

      const response = await axios.post(
        backendUrl + '/api/order/list',
        {},
        { headers: { token } }
      )

      if (response.data.success) {
        setOrders(response.data.orders) // the API returns newest first
        setLoadError(false)
      } else if (keepOnError) {
        toast.error('Couldn’t refresh the order list.', { toastId: 'orders-refresh' })
      } else {
        setLoadError(true)
      }
    } catch (error) {
      console.error(error)
      if (keepOnError) toast.error('Couldn’t refresh the order list.', { toastId: 'orders-refresh' })
      else setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const statusHandler = async (event, orderId ) => {
    markUpdating(orderId, true)
    try {
      const response = await axios.post(backendUrl + '/api/order/status' , {orderId, status:event.target.value}, {headers: {token}})
      if (response.data.success) {
        toast.success('Order status updated.')
        await fetchAllOrders({ keepOnError: true })
      } else {
        toast.error(friendlyError(response.data.message, "Couldn’t update the order status. Please try again."))
        await fetchAllOrders({ keepOnError: true }) // e.g. "changed a moment ago": show the order as it is now
      }
    } catch (error) {
      console.error(error)
      toast.error(friendlyError(error, 'Couldn’t update the order status. Please try again.'))
    } finally {
      markUpdating(orderId, false)
    }
  }

  useEffect(() => {
    fetchAllOrders()
  }, [token])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Orders</h1>
      {demo && <p className="mt-3 text-xs text-amber-300">Read-only demo: order statuses can’t be changed here.</p>}
      <p className="mt-1 text-sm text-zinc-400">{loading ? 'Loading…' : loadError ? 'Orders couldn’t be loaded' : `${orders.length} orders, newest first`}</p>

      <div className="mt-6 flex flex-col gap-4">
        {loading ? (
          <div role="status" className="flex flex-col gap-4">
            <span className="sr-only">Loading orders…</span>
            {[0, 1].map((i) => <div key={i} aria-hidden="true" className="h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-800/40" />)}
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-xl border border-zinc-800 bg-[#202024] p-10 text-center">
            <p className="text-sm text-zinc-400">Couldn’t load orders.</p>
            <button type="button" onClick={() => { setLoading(true); fetchAllOrders() }} className="mt-5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">Try again</button>
          </div>
        ) : orders.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-[#202024] px-5 py-12 text-center text-sm text-zinc-400">No orders yet.</p>
        ) : orders.map((order) => (
          <article
            key={order._id}
            className="grid gap-5 rounded-xl border border-zinc-800 bg-[#202024] p-5 text-sm md:grid-cols-[1.6fr_1.2fr_1fr_190px] md:p-6"
          >
            {/* Items */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-zinc-400">#{order._id.slice(-8).toUpperCase()}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusTone(order.status)}`}>{order.status}</span>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <img src={thumb(item.image?.[0], 80, 96)} alt="" className="h-12 w-10 shrink-0 rounded bg-zinc-800 object-cover" loading="lazy" />
                    <span className="text-zinc-200">
                      {item.name} <span className="text-zinc-400">× {item.quantity} · {item.size}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer */}
            <div className="text-zinc-400">
              <p className="font-medium text-zinc-200">{order.address.firstName + ' ' + order.address.lastName}</p>
              <p className="mt-1">{order.address.street},</p>
              <p>{order.address.city}, {order.address.state}, {order.address.country}, {order.address.zipcode}</p>
              <p className="mt-1">{order.address.phone}</p>
            </div>

            {/* Meta */}
            <div className="text-zinc-400">
              <p className="text-lg font-semibold text-white">{formatPrice(order.amount, orderCurrency(order))}</p>
              <p className="mt-1">{order.items.length} {order.items.length === 1 ? 'item' : 'items'} · {order.paymentMethod}</p>
              <p className={order.payment ? 'text-emerald-300' : 'text-amber-300'}>
                {order.payment ? 'Paid' : order.paymentMethod === 'COD' ? 'Collect on delivery' : 'Card payment not completed'}
              </p>
              {/* A card payment that arrived after the order was cancelled is refunded automatically */}
              {order.refund === 'failed' && (
                <p className="mt-1 text-red-300">Paid after cancelling: automatic refund failed. Refund it in the Stripe dashboard.</p>
              )}
              {order.refund === 'refunded' && <p className="mt-1 text-zinc-400">Late payment refunded automatically.</p>}
              <p className="mt-1">{formatDate(order.date)}</p>
            </div>

            {/* Status */}
            <div>
              <label htmlFor={`status-${order._id}`} className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">Status</label>
              <select
                id={`status-${order._id}`}
                onChange={(event)=>statusHandler(event,order._id)}
                value={order.status}
                disabled={demo || updating.has(order._id)}
                title={demo ? DEMO_DISABLED : undefined}
                className="w-full px-3 py-2.5 font-medium disabled:opacity-60"
              >
                {STATUSES.map((s) => {
                  // Same rules as the API: paid orders can't be cancelled (no refund workflow), and an unpaid
                  // card order can only be cancelled until its payment is confirmed
                  const awaitingCard = order.paymentMethod === 'Stripe' && !order.payment
                  const disabled = s !== order.status && ((s === 'Cancelled' && order.payment) || (awaitingCard && s !== 'Cancelled'))
                  return (
                    <option key={s} value={s} disabled={disabled}>
                      {s === 'Cancelled' && order.payment ? 'Cancelled (refund first)' : s}
                    </option>
                  )
                })}
              </select>
              {order.paymentMethod === 'COD' && (
                <p className="mt-2 text-xs text-zinc-400">COD is marked paid when the order is Delivered.</p>
              )}
              {order.paymentMethod === 'Stripe' && !order.payment && order.status !== 'Cancelled' && (
                <p className="mt-2 text-xs text-amber-300">Waiting for the card payment. It can only be cancelled until then.</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default Orders
