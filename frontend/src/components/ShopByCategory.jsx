import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import SectionHeader from './SectionHeader';
import { optimizeImage } from '../utils/image';

const CATEGORIES = ['Women', 'Men', 'Kids'];

// Category entry points built from the live catalogue: real cover image and real product count.
const ShopByCategory = () => {
  const { products, productsLoading, productsError } = useContext(ShopContext);

  const tiles = useMemo(
    () =>
      CATEGORIES.map((category) => {
        const inCategory = products.filter((p) => p.category === category);
        const cover = inCategory.find((p) => p.bestseller) || inCategory[0];
        return { category, count: inCategory.length, image: cover?.image?.[0] };
      }).filter((tile) => tile.count > 0),
    [products]
  );

  if (productsError) return null; // the product grids below already show the error + retry

  return (
    <section className='py-16 sm:py-24' aria-labelledby='shop-by-category'>
      <SectionHeader id='shop-by-category' index='01' eyebrow='Categories' title='Shop by category' linkTo='/collection' linkLabel='Shop all' />

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6'>
        {productsLoading
          ? CATEGORIES.map((c) => (
              <div key={c} aria-hidden='true' className='aspect-[16/11] animate-pulse sm:aspect-[4/5] bg-neutral-200/70' />
            ))
          : tiles.map((tile) => (
              <Link
                key={tile.category}
                to={`/collection?category=${tile.category}`}
                className='group relative block aspect-[16/11] overflow-hidden sm:aspect-[4/5] bg-neutral-100'
              >
                {tile.image && (
                  <img
                    src={optimizeImage(tile.image, 700)}
                    alt=''
                    loading='lazy'
                    decoding='async'
                    className='h-full w-full object-cover object-[center_22%] transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]'
                  />
                )}
                <div aria-hidden='true' className='absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/5 to-transparent' />
                <div className='absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-white'>
                  <div>
                    <p className='font-display text-3xl sm:text-4xl'>{tile.category}</p>
                    <p className='mt-1 text-xs uppercase tracking-[0.2em] text-white/80'>{tile.count} styles</p>
                  </div>
                  <span className='eyebrow translate-x-0 border-b border-white/70 pb-1 transition-transform duration-300 group-hover:translate-x-1'>
                    Shop
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
};

export default ShopByCategory;
