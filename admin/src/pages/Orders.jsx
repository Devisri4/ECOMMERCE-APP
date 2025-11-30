import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([])

  const fetchAllOrders = async () => {
    try {
      if (!token) return

      const response = await axios.post(
        backendUrl + '/api/order/list',
        {},
        { headers: { token } }
      )

      if (response.data.success) {
        setOrders(response.data.orders.reverse())
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const statusHandler = async (event, orderId ) => {
    try {
      const response = await axios.post(backendUrl + '/api/order/status' , {orderId, status:event.target.value}, {headers: {token}})
        if (response.data.success) {
          await fetchAllOrders()
        }
      } catch (error) {
        console.log(error)
        toast.error(response.data.message)
      }
    }

  useEffect(() => {
    fetchAllOrders()
  }, [token])

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6">Order Page</h3>

      {orders.map((order, index) => (
        <div
          key={index}
          className="grid grid-cols-1 sm:grid-cols-[0.6fr_2fr_1fr_1fr_1fr] gap-4 items-start
                     border border-gray-200 rounded-lg p-4 md:p-6 mb-5 bg-white shadow-sm"
        >
          {/* ✅ IMAGES */}
          <div className="flex gap-2 flex-wrap">
            {order.items.map((item, i) => (
              <img
                key={i}
                src={item.image[0]}
                alt=""
                className="w-14 h-14 object-cover rounded border"
              />
            ))}
          </div>

          {/* ✅ ITEMS */}
          <div>
            {order.items.map((item, i) => (
              <p className="py-0.5" key={i}>
                {item.name} x {item.quantity}{' '}
                <span>{item.size}</span>
                {i !== order.items.length - 1 && ','}
              </p>
            ))}

            <p className="mt-3 mb-2 font-semibold">
              {order.address.firstName + ' ' + order.address.lastName}
            </p>

            <p>{order.address.street},</p>
            <p>
              {order.address.city},{order.address.state},{order.address.country},
              {order.address.zipcode}
            </p>
            <p>{order.address.phone}</p>
          </div>

          {/* ✅ META */}
          <div>
            <p className="text-sm sm:text-[15px]">
              Items: {order.items.length}
            </p>
            <p className="mt-3">Method: {order.paymentMethod}</p>
            <p>Payment: {order.payment ? 'Done' : 'Pending'}</p>
            <p>Date: {new Date(order.date).toLocaleDateString()}</p>
          </div>

          {/* ✅ AMOUNT */}
          <p className="text-sm sm:text-[15px]">
            {currency}{order.amount}
          </p>

          {/* ✅ STATUS */}
          <select  onChange={(event)=>statusHandler(event,order._id)}value={order.status} className="p-2 font-semibold">
            <option value="Order Placed">Order Placed</option>
            <option value="Packing">Packing</option>
            <option value="Shipped">Shipped</option>
            <option value="Out for delivery">Out for delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      ))}
    </div>
  )
}

export default Orders
