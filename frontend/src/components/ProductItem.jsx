import React from 'react';
import { Link } from 'react-router-dom';
import { optimizeImage } from '../utils/image';
import { formatPrice } from '../utils/currency';
import Stars from './Stars';

const ProductItem = ({ id, image, name, price, soldOut = false, rating = 0, reviewCount = 0 }) => {

    // ✅ handle image array OR string
    const productImage = optimizeImage(Array.isArray(image) ? image[0] : image, 600);
    // second shot (if any) is revealed on hover
    const hoverImage = Array.isArray(image) && image.length > 1 ? optimizeImage(image[1], 600) : null;

    return (
        <Link className="group block text-ink" to={`/product/${id}`}>
            <div className="relative aspect-[13/15] overflow-hidden bg-neutral-100">
                <img
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    src={productImage}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                />
                {hoverImage && (
                    <img
                        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        src={hoverImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />
                )}
                {soldOut && (
                    <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink">
                        Sold out
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1 pt-3">
                <p className="line-clamp-2 text-sm leading-snug text-neutral-700">{name}</p>
                <p className="text-sm font-medium">
                    {formatPrice(price)}
                </p>
                {reviewCount > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <Stars value={rating} size={12} />
                        <span>({reviewCount})</span>
                    </p>
                )}
            </div>
        </Link>
    );
};

export default ProductItem;
