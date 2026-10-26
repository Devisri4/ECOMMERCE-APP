import React, { useContext, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import RelatedProducts from '../components/RelatedProducts';
import { optimizeImage } from '../utils/image';

// Store policies already stated across the site (footer/policy strip) — no invented claims.
const DELIVERY_NOTES = [
  '100% original product.',
  'Cash on delivery is available on this product.',
  'Easy return and exchange policy within 7 days of delivery.',
];

// Sizes are stored in whatever order the admin clicked them; show them smallest → largest
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const Product = () => {
  const { productId } = useParams();
  const { products, productsLoading, productsError, getProductsData, currency, addToCart } = useContext(ShopContext);
  const [activeIndex, setActiveIndex] = useState(0);
  const [size, setSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

  const productData = products.find((item) => item._id === productId);

  // Reset gallery and size when navigating between products (e.g. from related items)
  useEffect(() => {
    setActiveIndex(0);
    setSize('');
    setSizeError(false);
    setJustAdded(false);
  }, [productId]);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 2500);
    return () => clearTimeout(t);
  }, [justAdded]);

  if (productsLoading) {
    return (
      <div role='status' className='grid gap-10 border-t border-neutral-200 pt-10 md:grid-cols-2'>
        <span className='sr-only'>Loading product…</span>
        <div aria-hidden='true' className='aspect-[13/15] animate-pulse bg-neutral-200/70' />
        <div aria-hidden='true' className='flex flex-col gap-4 pt-4'>
          <div className='h-4 w-32 animate-pulse bg-neutral-200/70' />
          <div className='h-10 w-3/4 animate-pulse bg-neutral-200/70' />
          <div className='h-6 w-24 animate-pulse bg-neutral-200/70' />
          <div className='mt-6 h-24 animate-pulse bg-neutral-200/70' />
        </div>
      </div>
    );
  }

  if (productsError) {
    return (
      <div role='alert' className='border-t border-neutral-200 py-24 text-center'>
        <p className='text-sm text-neutral-600'>We couldn’t load this product right now.</p>
        <button type='button' onClick={getProductsData} className='btn-secondary mt-6'>Try again</button>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className='border-t border-neutral-200 py-24 text-center'>
        <p className='font-display text-3xl text-ink'>Product not found</p>
        <p className='mt-3 text-sm text-neutral-600'>This item may have been removed or the link is incorrect.</p>
        <Link to='/collection' className='btn-primary mt-8'>Browse the collection</Link>
      </div>
    );
  }

  const images = productData.image || [];
  const mainImage = images[activeIndex] || images[0];

  const onAdd = () => {
    if (!size) {
      setSizeError(true);
      return;
    }
    addToCart(productData._id, size);
    setJustAdded(true);
  };

  const onZoomMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({
      active: true,
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className='border-t border-neutral-200 pt-6 sm:pt-8'>
      {/* Breadcrumb */}
      <nav aria-label='Breadcrumb' className='mb-6 text-xs text-neutral-500 sm:mb-8'>
        <ol className='flex flex-wrap items-center gap-2'>
          <li><Link to='/' className='hover:text-ink'>Home</Link></li>
          <li aria-hidden='true'>/</li>
          <li><Link to={`/collection?category=${productData.category}`} className='hover:text-ink'>{productData.category}</Link></li>
          <li aria-hidden='true'>/</li>
          <li aria-current='page' className='line-clamp-1 text-ink'>{productData.name}</li>
        </ol>
      </nav>

      <div className='grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16'>
        {/* Gallery */}
        <div className='flex flex-col-reverse gap-3 sm:flex-row'>
          {images.length > 1 && (
            <div className='no-scrollbar flex gap-3 overflow-x-auto sm:w-20 sm:shrink-0 sm:flex-col sm:overflow-visible' role='group' aria-label='Product images'>
              {images.map((item, index) => (
                <button
                  key={item}
                  type='button'
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  className={`aspect-[13/15] w-16 shrink-0 overflow-hidden bg-neutral-100 transition-opacity sm:w-full ${index === activeIndex ? 'ring-1 ring-ink' : 'opacity-60 hover:opacity-100'}`}
                >
                  <img src={optimizeImage(item, 200)} alt='' className='h-full w-full object-cover' />
                </button>
              ))}
            </div>
          )}
          <div
            className='relative aspect-[13/15] flex-1 overflow-hidden bg-neutral-100 sm:cursor-zoom-in'
            onMouseMove={onZoomMove}
            onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
          >
            <img
              key={mainImage}
              src={optimizeImage(mainImage, 1100)}
              alt={productData.name}
              className='page-enter h-full w-full object-cover transition-transform duration-300 ease-out'
              style={{
                transformOrigin: `${zoom.x}% ${zoom.y}%`,
                transform: zoom.active ? 'scale(1.6)' : 'scale(1)',
              }}
            />
          </div>
        </div>

        {/* Product info */}
        <div className='md:pt-2'>
          <p className='eyebrow text-neutral-500'>
            {productData.category} · {productData.subCategory}
            {productData.bestseller && <span className='ml-3 bg-ink px-2 py-1 text-[10px] text-white'>Bestseller</span>}
          </p>
          <h1 className='mt-4 font-display text-3xl leading-tight text-ink sm:text-4xl'>{productData.name}</h1>
          <p className='mt-4 text-2xl text-ink'>{currency}{productData.price}</p>
          <p className='mt-6 text-sm leading-relaxed text-neutral-600 md:max-w-md'>{productData.description}</p>

          {/* Size selector */}
          <fieldset className='mt-8'>
            <legend className='eyebrow text-ink'>Select size</legend>
            <div className='mt-4 flex flex-wrap gap-2'>
              {[...productData.sizes].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)).map((item) => (
                <button
                  key={item}
                  type='button'
                  onClick={() => { setSize(item); setSizeError(false); }}
                  aria-pressed={item === size}
                  className={`min-w-12 border px-4 py-2.5 text-sm transition-colors ${item === size ? 'border-ink bg-ink text-white' : 'border-neutral-300 bg-white text-ink hover:border-ink'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            {sizeError && <p role='alert' className='mt-3 text-xs text-red-700'>Please select a size to continue.</p>}
          </fieldset>

          <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
            <button type='button' onClick={onAdd} className='btn-primary flex-1 py-4' aria-live='polite'>
              {justAdded ? 'Added to bag' : 'Add to bag'}
            </button>
            {justAdded && <Link to='/cart' className='btn-secondary py-4'>View bag</Link>}
          </div>

          {/* Details */}
          <div className='mt-10 border-t border-neutral-200'>
            <details className='group border-b border-neutral-200'>
              <summary className='flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium text-ink'>
                Delivery &amp; returns
                <span aria-hidden='true' className='text-lg leading-none transition-transform group-open:rotate-45'>+</span>
              </summary>
              <ul className='flex flex-col gap-2 pb-5 text-sm text-neutral-600'>
                {DELIVERY_NOTES.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </details>
          </div>
        </div>
      </div>

      {/* dispaly related products */}
      <RelatedProducts category={productData.category} subCategory={productData.subCategory} currentId={productData._id} />
    </div>
  );
};

export default Product;
