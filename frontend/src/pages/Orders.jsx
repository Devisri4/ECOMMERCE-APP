import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { ShopContext } from "../context/ShopContext";
import Title from "../components/Title";

const Orders = () => {
  const { backendUrl, token, currency } = useContext(ShopContext);
  const [orderData, setOrderData] = useState([]);

  const loadOrderData = async () => {
    try {
      if (!token) return;

      const res = await axios.post(
        backendUrl + "/api/order/userorders",
        {},
        { headers: { token } }
      );

      if (res.data.success) {
        setOrderData(res.data.orders || []);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadOrderData();
  }, [token]);

  return (
    <div className="border-t pt-14 px-4 sm:px-10">
      <div className="text-2xl mb-8">
        <Title text1={"MY"} text2={"ORDERS"} />
      </div>

      {orderData.length === 0 && (
        <p className="text-gray-500">No orders found</p>
      )}

      {orderData.map((order, i) =>
        order.items.map((item, j) => (
          <div
            key={`${i}-${j}`}
            className="py-6 border-t border-b flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          >
            {/* LEFT */}
            <div className="flex gap-6">
              <img
                src={item.image?.[0]}
                alt={item.name}
                className="w-20 h-24 object-cover rounded"
              />

              <div>
                <p className="font-medium text-base">{item.name}</p>

                <div className="text-sm text-gray-600 mt-1 flex gap-3">
                  <p>{currency}{item.price}</p>
                  <p>Qty: {item.quantity}</p>
                  <p>Size: {item.size}</p>
                </div>

                <p className="text-sm mt-2">
                  Date:{" "}
                  <span className="text-gray-400">
                    {new Date(order.date).toDateString()}
                  </span>
                </p>

                <p className="text-sm mt-1">
                  Payment:{" "}
                  <span className="text-gray-400">
                    {order.paymentMethod}
                  </span>
                </p>
              </div>
            </div>

            
            <div className="md:w-1/2 flex justify-between">
              <div className="flex items-center gap-2">
                <span className="min-w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm md:text-base">{order.status}</p>
              </div>

              <button onClick={loadOrderData} className="border px-4 py-2 text-sm font-medium rounded hover:bg-gray-100 transition">
                Track Order
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Orders;

