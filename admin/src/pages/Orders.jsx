import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { friendlyError } from '../utils/messages'
import { backendUrl } from '../App'
import { formatPrice, orderCurrency } from '../utils/currency'

const STATUSES = ['Order Placed', 'Packing', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled']

const statusTone = (status) =>
  status === 'Cancelled' ? 'bg-red-500/10 text-red-300'
    : status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-300'
    : 'bg-violet-500/10 text-violet-300'

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const fetchAllOrders = async () => {
    try {
      if (!token) return

      const response = await axios.post(
        backendUrl + '/api/order/list',
        {},
        { headers: { token } }
      )

      if (response.data.success) {
        setOrders(response.data.orders) // the API returns newest first
      }
    } catch (error) {
      toast.error(friendlyError(error, 'Couldn’t load orders. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const statusHandler = async (event, orderId ) => {
    setUpdatingId(orderId)
    try {
      const response = await axios.post(backendUrl + '/api/order/status' , {orderId, status:event.target.value}, {headers: {token}})
      if (response.data.success) {
        toast.success('Order status updated.')
        await fetchAllOrders()
      } else {
        toast.error(friendlyError(response.data.message, "Couldn’t update the order status. Please try again."))
      }
    } catch (error) {
      console.log(error)
      toast.error(friendlyError(error, 'Couldn’t update the order status. Please try again.'))
    } finally {
      setUpdatingId(null)
    }
  }

  useEffect(() => {
    fetchAllOrders()
  }, [token])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Orders</h1>
      <p className="mt-1 text-sm text-zinc-400">{loading ? 'Loading…' : `${orders.length} orders, newest first`}</p>

      <div className="mt-6 flex flex-col gap-4">
        {loading ? (
          [0, 1].map((i) => <div key={i} aria-hidden="true" className="h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-800/40" />)
        ) : orders.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-[#202024] px-5 py-12 text-center text-sm text-zinc-500">No orders yet.</p>
        ) : orders.map((order) => (
          <article
            key={order._id}
            className="grid gap-5 rounded-xl border border-zinc-800 bg-[#202024] p-5 text-sm md:grid-cols-[1.6fr_1.2fr_1fr_190px] md:p-6"
          >
            {/* Items */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-zinc-500">#{order._id.slice(-8).toUpperCase()}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusTone(order.status)}`}>{order.status}</span>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <img src={item.image?.[0]} alt="" className="h-12 w-10 shrink-0 rounded bg-zinc-800 object-cover" loading="lazy" />
                    <span className="text-zinc-200">
                      {item.name} <span className="text-zinc-500">× {item.quantity} · {item.size}</span>
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
              <p className="mt-1">{new Date(order.date).toLocaleDateString()}</p>
            </div>

            {/* Status */}
            <div>
              <label htmlFor={`status-${order._id}`} className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Status</label>
              <select
                id={`status-${order._id}`}
                onChange={(event)=>statusHandler(event,order._id)}
                value={order.status}
                disabled={updatingId === order._id}
                className="w-full px-3 py-2.5 font-medium disabled:opacity-60"
              >
                {STATUSES.map((s) => (
                  // No refund workflow exists, so paid orders can't be marked Cancelled (enforced server-side too)
                  <option key={s} value={s} disabled={s === 'Cancelled' && order.payment}>
                    {s === 'Cancelled' && order.payment ? 'Cancelled (refund first)' : s}
                  </option>
                ))}
              </select>
              {order.paymentMethod === 'COD' && (
                <p className="mt-2 text-xs text-zinc-500">COD is marked paid when the order is Delivered.</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default Orders
