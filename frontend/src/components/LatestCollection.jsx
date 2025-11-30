import React, { useContext, useState, useEffect } from "react";
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import ProductItem from './ProductItem'; // make sure you import this if not already

const LatestCollection = () => {
  const { products } = useContext(ShopContext);
  const [latestProducts, setLatestProducts] = useState([]);

  useEffect(() => {
    setLatestProducts(products.slice(0, 10));
  }, [products]);

  return (
    <div className='my-10'>
      <div className='text-center py-8 text-3xl'>
        <Title text1="LATEST" text2="COLLECTIONS" />
        <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-700'>
          Discover our newest styles curated for every trend and season. Explore fresh arrivals and elevate your style with our newest collection.
        </p>
      </div>

      {/* Rendering Products */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6'>
        {
          latestProducts.map((item, index) => (
            <ProductItem key={index} id={item._id} image={item.image} name={item.name} price={item.price} />
          ))
        }
      </div>
    </div>
  );
};

export default LatestCollection;
