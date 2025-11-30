import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import ProductItem from './ProductItem';
import Title from './Title';

const ITEMS_PER_PAGE = 8;

const BestSeller = () => {
    const { products } = useContext(ShopContext);

    const [bestSeller, setBestSeller] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!products || products.length === 0) return;

        // 1️⃣ filter bestseller products
        const filtered = products.filter(
            (item) => item.bestseller === true
        );

        // 2️⃣ sort by newest first
        filtered.sort((a, b) => b.date - a.date);

        setBestSeller(filtered);
    }, [products]);

    // 3️⃣ pagination logic
    const totalPages = Math.ceil(bestSeller.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = bestSeller.slice(startIndex, endIndex);

    return (
        <div className="my-10">
            <div className="text-center text-3xl py-8">
                <Title text1={'BEST'} text2={'SELLERS'} />
                <p className="w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600">
                    Explore our collection of best sellers — curated for those who
                    value elegance, craftsmanship, and timeless appeal.
                </p>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 gap-y-6">
                {currentItems.map((item) => (
                    <ProductItem
                        key={item._id}
                        id={item._id}
                        name={item.name}
                        image={item.image}
                        price={item.price}
                    />
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                        className="px-4 py-2 border rounded disabled:opacity-40"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Previous
                    </button>

                    <span className="text-sm">
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        className="px-4 py-2 border rounded disabled:opacity-40"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default BestSeller;
