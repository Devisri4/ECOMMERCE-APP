import React, { useContext, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from '../components/Title';
import CartTotal from '../components/CartTotal';
import { optimizeImage } from '../utils/image';

// Matches the server-side limit in orderController.buildOrderItems
const MAX_QTY = 99;

const stepButton = 'flex h-9 w-9 items-center justify-center text-base text-ink transition-colors hover:bg-neutral-100 disabled:opacity-40';

const Cart = () => {
  const { products, productsLoading, cartLoaded, currency, cartItems, updateQuantity, navigate } = useContext(ShopContext);

  // Flatten { productId: { size: qty } } into rows, skipping products no longer in the catalogue
  const cartData = useMemo(() => {
    const rows = [];
    for (const productId in cartItems) {
      for (const size in cartItems[productId]) {
        const quantity = cartItems[productId][size];
        const product = products.find((p) => p._id === productId);
        if (quantity > 0 && product) rows.push({ product, size, quantity });
      }
    }
    return rows;
  }, [cartItems, products]);

  const loading = productsLoading || !cartLoaded;
  // Set by the backend when a customer cancels on the Stripe payment page
  const [searchParams] = useSearchParams();
  const paymentCancelled = searchParams.get('payment') === 'cancelled';

  return (
    <div className='border-t border-neutral-200 pt-10 sm:pt-14'>
      <div className='mb-8 text-2xl'>
        <Title text1={'YOUR'} text2={'BAG'} />
      </div>

      {paymentCancelled && (
        <p role='status' className='mb-8 border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-700'>
          Your card payment was cancelled and you have not been charged. Your bag is saved — you can try again or choose cash on delivery.
        </p>
      )}

      {loading ? (
        <div role='status' className='flex flex-col gap-4'>
          <span className='sr-only'>Loading your bag…</span>
          {[0, 1].map((i) => <div key={i} aria-hidden='true' className='h-32 animate-pulse bg-neutral-200/70' />)}
        </div>
      ) : cartData.length === 0 ? (
        <div className='border border-neutral-200 bg-white px-6 py-16 text-center'>
          <p className='font-display text-2xl text-ink'>Your bag is empty</p>
          <p className='mt-3 text-sm text-neutral-600'>Explore the collection and add your favourite pieces.</p>
          <Link to='/collection' className='btn-primary mt-8'>Start shopping</Link>
        </div>
      ) : (
        <div className='grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]'>
          {/* Items */}
          <ul className='border-t border-neutral-200'>
            {cartData.map(({ product, size, quantity }) => (
              <li key={`${product._id}-${size}`} className='flex gap-4 border-b border-neutral-200 py-6 sm:gap-6'>
                <Link to={`/product/${product._id}`} className='w-24 shrink-0 sm:w-28'>
                  <img
                    className='aspect-[13/15] w-full bg-neutral-100 object-cover'
                    src={optimizeImage(product.image[0], 300)}
                    alt={product.name}
                  />
                </Link>

                <div className='flex min-w-0 flex-1 flex-col justify-between gap-4 sm:flex-row'>
                  <div className='min-w-0'>
                    <Link to={`/product/${product._id}`} className='line-clamp-2 text-sm font-medium text-ink hover:underline sm:text-base'>
                      {product.name}
                    </Link>
                    <p className='mt-1 text-sm text-neutral-600'>Size {size} · {currency}{product.price}</p>

                    {/* Quantity */}
                    <div className='mt-4 inline-flex items-center border border-neutral-300 bg-white' role='group' aria-label={`Quantity for ${product.name}, size ${size}`}>
                      <button
                        type='button'
                        className={stepButton}
                        onClick={() => updateQuantity(product._id, size, quantity - 1)}
                        aria-label={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                      >
                        −
                      </button>
                      <span className='w-9 text-center text-sm tabular-nums' aria-live='polite'>{quantity}</span>
                      <button
                        type='button'
                        className={stepButton}
                        onClick={() => updateQuantity(product._id, size, quantity + 1)}
                        disabled={quantity >= MAX_QTY}
                        aria-label='Increase quantity'
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className='flex items-end justify-between gap-4 sm:flex-col sm:items-end'>
                    <p className='text-sm font-medium text-ink'>{currency}{(product.price * quantity).toFixed(2)}</p>
                    <button
                      type='button'
                      onClick={() => updateQuantity(product._id, size, 0)}
                      className='text-xs uppercase tracking-[0.16em] text-neutral-500 underline-offset-4 hover:text-ink hover:underline'
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Summary */}
          <aside className='lg:sticky lg:top-28 lg:self-start'>
            <div className='border border-neutral-200 bg-white px-6 py-6'>
              <CartTotal />
              <button onClick={() => navigate('/place-order')} className='btn-primary mt-2 w-full py-4'>
                Proceed to checkout
              </button>
              <p className='mt-4 text-center text-xs text-neutral-500'>Cash on delivery and card payments available</p>
            </div>
            <Link to='/collection' className='mt-4 block text-center text-xs uppercase tracking-[0.16em] text-neutral-600 hover:text-ink'>
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Cart;
