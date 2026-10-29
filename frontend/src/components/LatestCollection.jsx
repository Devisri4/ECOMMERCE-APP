import React, { useContext, useState, useEffect } from "react";
import { ShopContext } from '../context/ShopContext';
import SectionHeader from './SectionHeader';
import ProductGrid from './ProductGrid';

const LatestCollection = () => {
  const { products } = useContext(ShopContext);
  const [latestProducts, setLatestProducts] = useState([]);

  useEffect(() => {
    // Newest first: the API returns products in the order they were added
    setLatestProducts([...products].sort((a, b) => b.date - a.date).slice(0, 10));
  }, [products]);

  return (
    <section className='border-t border-neutral-200 py-16 sm:py-24'>
      <SectionHeader
        index='02'
        eyebrow='New in'
        title='Latest collections'
        description='Discover our newest styles curated for every trend and season. Explore fresh arrivals and elevate your style with our newest collection.'
        linkTo='/collection'
      />

      <ProductGrid
        items={latestProducts}
        columns='grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        skeletonCount={10}
      />
    </section>
  );
};

export default LatestCollection;
