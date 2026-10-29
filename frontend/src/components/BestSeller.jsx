import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import ProductGrid from './ProductGrid';
import SectionHeader from './SectionHeader';

const ITEMS_PER_PAGE = 8;

const BestSeller = () => {
    const { products } = useContext(ShopContext);

    const [bestSeller, setBestSeller] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!products || products.length === 0) return;

        // Bestsellers only
        const filtered = products.filter(
            (item) => item.bestseller === true
        );

        // Newest first
        filtered.sort((a, b) => b.date - a.date);

        setBestSeller(filtered);
    }, [products]);

    // Pagination
    const totalPages = Math.ceil(bestSeller.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = bestSeller.slice(startIndex, endIndex);

    return (
        // scroll-mt keeps the heading clear of the sticky header when linked from the hero
        <section id="bestsellers" className="scroll-mt-24 border-t border-neutral-200 py-16 sm:py-24">
            <SectionHeader
                index="04"
                eyebrow="Most loved"
                title="Best sellers"
                description="The pieces our customers come back for most."
                linkTo="/collection"
            />

            {/* Products Grid */}
            <ProductGrid
                items={currentItems}
                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                emptyMessage="Best sellers are coming soon."
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <nav aria-label="Best sellers pages" className="mt-12 flex items-center justify-center gap-6">
                    <button
                        type="button"
                        className="btn-secondary px-6 py-3"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Previous
                    </button>

                    <span className="text-sm tabular-nums text-neutral-600" aria-live="polite">
                        {currentPage} / {totalPages}
                    </span>

                    <button
                        type="button"
                        className="btn-secondary px-6 py-3"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Next
                    </button>
                </nav>
            )}
        </section>
    );
};

export default BestSeller;
