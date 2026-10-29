import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { ShopContext } from '../../context/ShopContext'
import { optimizeImage } from '../../utils/image'
import { formatPrice } from '../../utils/currency'
import { isSoldOut } from '../../utils/stock'

const linkButton = 'text-xs uppercase tracking-[0.16em] text-neutral-600 underline-offset-4 hover:text-ink hover:underline'

// Saved products. Choosing a size happens on the product page, so "Choose size" links there.
const WishlistPanel = () => {
  const { wishlist, products, productsLoading, toggleWishlist } = useContext(ShopContext)

  if (productsLoading) {
    return <div role='status' className='h-40 animate-pulse bg-neutral-200/70'><span className='sr-only'>Loading your wishlist…</span></div>
  }

  // Products deleted from the store since they were saved are skipped
  const items = wishlist.map((id) => products.find((p) => p._id === id)).filter(Boolean)

  if (items.length === 0) {
    return (
      <div className='border border-neutral-200 bg-white px-6 py-14 text-center'>
        <p className='font-display text-2xl text-ink'>Your wishlist is empty</p>
        <p className='mt-3 text-sm text-neutral-600'>Tap the heart on any product to save it for later.</p>
        <Link to='/collection' className='btn-primary mt-8'>Browse the collection</Link>
      </div>
    )
  }

  return (
    <ul className='grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3'>
      {items.map((p) => {
        const soldOut = isSoldOut(p)
        return (
          <li key={p._id}>
            <Link to={`/product/${p._id}`} className='block'>
              <div className='relative aspect-[13/15] overflow-hidden bg-neutral-100'>
                <img src={optimizeImage(p.image[0], 400)} alt={p.name} loading='lazy' className='h-full w-full object-cover' />
                {soldOut && <span className='absolute left-3 top-3 bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink'>Sold out</span>}
              </div>
              <p className='mt-3 line-clamp-2 text-sm text-neutral-700'>{p.name}</p>
              <p className='text-sm font-medium text-ink'>{formatPrice(p.price)}</p>
            </Link>
            <div className='mt-3 flex flex-wrap gap-4'>
              {!soldOut && <Link to={`/product/${p._id}`} className={linkButton}>Choose size</Link>}
              <button type='button' onClick={() => toggleWishlist(p._id)} className={linkButton} aria-label={`Remove ${p.name} from wishlist`}>
                Remove
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default WishlistPanel
