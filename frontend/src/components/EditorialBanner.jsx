import React from 'react';
import { Link } from 'react-router-dom';
import { assets } from '../assets/assets';
import useParallax from '../hooks/useParallax';

// Split editorial band between the product rows — brand story, links to About.
const EditorialBanner = () => {
  const imageRef = useParallax(-0.05);

  return (
    <section className='grid items-center gap-10 border-t border-neutral-200 py-16 sm:py-24 md:grid-cols-2 md:gap-16'>
      <div className='overflow-hidden bg-neutral-100'>
        <img
          ref={imageRef}
          src={assets.about_img}
          alt='Folded garments and accessories from the FOREVER collection'
          loading='lazy'
          decoding='async'
          className='aspect-[4/5] w-full scale-110 object-cover will-change-transform md:aspect-square'
        />
      </div>
      <div className='md:pr-8'>
        <p className='eyebrow flex items-center gap-3 text-neutral-500'>
          <span className='font-display text-sm normal-case tracking-normal text-ink'>03</span>
          <span aria-hidden='true' className='h-px w-8 bg-neutral-300' />
          The FOREVER edit
        </p>
        <h2 className='mt-5 font-display text-4xl leading-[1.05] text-ink sm:text-5xl'>
          Quality you can feel, prices that make sense.
        </h2>
        <p className='mt-6 max-w-md text-sm leading-relaxed text-neutral-600 sm:text-base'>
          Every item is selected and checked for durability, comfort and value before it reaches you — so your wardrobe
          is built on pieces you can trust.
        </p>
        <Link to='/about' className='btn-secondary mt-9'>Our story</Link>
      </div>
    </section>
  );
};

export default EditorialBanner;
