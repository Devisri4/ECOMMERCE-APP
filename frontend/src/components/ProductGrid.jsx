import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import ProductItem from './ProductItem';

// Renders a product grid with shared loading, error and empty states.
// `columns` must be a full Tailwind class string so it is picked up by the build.
const ProductGrid = ({
    items,
    columns = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    skeletonCount = 8,
    emptyMessage = 'No products found.',
}) => {
    const { productsLoading, productsError, getProductsData } = useContext(ShopContext);
    const gridClass = `grid ${columns} gap-x-4 gap-y-10 sm:gap-x-6`;

    if (productsLoading) {
        return (
            <div role="status" className={gridClass}>
                <span className="sr-only">Loading products…</span>
                {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div key={i} aria-hidden="true" className="animate-pulse">
                        <div className="aspect-[13/15] bg-neutral-200/70" />
                        <div className="mt-3 h-3 w-3/4 bg-neutral-200/70" />
                        <div className="mt-2 h-3 w-1/4 bg-neutral-200/70" />
                    </div>
                ))}
            </div>
        );
    }

    if (productsError) {
        return (
            <div role="alert" className="border border-neutral-200 px-6 py-14 text-center">
                <p className="text-sm text-neutral-600">We couldn’t load products right now.</p>
                <button type="button" onClick={getProductsData} className="btn-secondary mt-6">
                    Try again
                </button>
            </div>
        );
    }

    if (items.length === 0) {
        return <p className="py-14 text-center text-sm text-neutral-500">{emptyMessage}</p>;
    }

    return (
        <div className={gridClass}>
            {items.map((item) => (
                <ProductItem key={item._id} id={item._id} name={item.name} price={item.price} image={item.image} />
            ))}
        </div>
    );
};

export default ProductGrid;
