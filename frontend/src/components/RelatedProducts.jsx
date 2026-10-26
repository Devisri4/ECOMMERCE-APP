import React, { useContext, useMemo } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title';
import ProductGrid from './ProductGrid';


// Same category + type, excluding the product being viewed
const RelatedProducts = ({category, subCategory, currentId}) => {
    const { products } = useContext (ShopContext);

    const related = useMemo(
        () => products
            .filter((item) => item.category === category && item.subCategory === subCategory && item._id !== currentId)
            .slice(0, 5),
        [products, category, subCategory, currentId]
    );

    if (related.length === 0) return null;

  return (
    <section className='mt-24 border-t border-neutral-200 pt-16'>
        <div className='mb-10 text-center'>
            <Title text1={'YOU MAY'} text2={'ALSO LIKE'} />
        </div>
        <ProductGrid items={related} columns='grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' skeletonCount={5} />
    </section>
  )
}

export default RelatedProducts
