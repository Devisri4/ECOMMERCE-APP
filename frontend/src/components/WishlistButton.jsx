import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';

// Heart toggle for saving a product. `variant`: 'icon' (round button over a product image) or
// 'full' (outlined button with a label, next to "Add to bag").
const WishlistButton = ({ productId, productName, variant = 'icon', className = '' }) => {
  const { isInWishlist, toggleWishlist } = useContext(ShopContext);
  const saved = isInWishlist(productId);
  const label = saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`;

  const heart = (
    <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true' className='shrink-0'>
      <path
        d='M12 20.5s-7.5-4.4-9.3-9.2C1.6 8.1 3.6 4.5 7.1 4.5c2 0 3.5 1.1 4.9 2.9 1.4-1.8 2.9-2.9 4.9-2.9 3.5 0 5.5 3.6 4.4 6.8-1.8 4.8-9.3 9.2-9.3 9.2z'
        fill={saved ? '#111111' : 'none'}
        stroke='#111111'
        strokeWidth='1.6'
        strokeLinejoin='round'
      />
    </svg>
  );

  if (variant === 'full') {
    return (
      <button type='button' onClick={() => toggleWishlist(productId)} aria-pressed={saved} aria-label={label} className={`btn-secondary py-4 ${className}`}>
        {heart}
        {saved ? 'Saved' : 'Wishlist'}
      </button>
    );
  }

  return (
    <button
      type='button'
      onClick={() => toggleWishlist(productId)}
      aria-pressed={saved}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform hover:scale-105 ${className}`}
    >
      {heart}
    </button>
  );
};

export default WishlistButton;
