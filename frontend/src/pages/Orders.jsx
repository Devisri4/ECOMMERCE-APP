import React from "react";
import Title from "../components/Title";
import OrderHistory from "../components/OrderHistory";

const Orders = () => {
  return (
    <div className="border-t border-neutral-200 pt-14">
      <div className="mb-8 text-2xl">
        <Title text1={"MY"} text2={"ORDERS"} />
      </div>
      <OrderHistory />
    </div>
  );
};

export default Orders;
