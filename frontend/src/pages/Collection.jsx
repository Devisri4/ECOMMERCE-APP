import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import { assets } from '../assets/assets';
import Title from '../components/Title';
import ProductGrid from '../components/ProductGrid';

const CATEGORIES = ['Men', 'Women', 'Kids'];
const TYPES = ['Topwear', 'Bottomwear', 'Winterwear'];
const SORTS = [
  { value: 'relevant', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

// Filters live in the URL (?category=Men,Women&type=Topwear&sort=price-asc) so they survive
// refresh, back/forward, and can be linked from the homepage category tiles.
const readList = (params, key, allowed) =>
  (params.get(key) || '').split(',').filter((v) => allowed.includes(v));

const FilterGroup = ({ legend, options, selected, counts, onToggle }) => (
  <fieldset className='border-b border-neutral-200 pb-6'>
    <legend className='eyebrow mb-4 text-ink'>{legend}</legend>
    <div className='flex flex-col gap-3'>
      {options.map((option) => (
        <label key={option} className='flex cursor-pointer items-center gap-3 text-sm text-neutral-700 hover:text-ink'>
          <input
            type='checkbox'
            className='h-4 w-4 accent-ink'
            value={option}
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
          />
          <span className='flex-1'>{option}</span>
          <span className='text-xs text-neutral-400'>{counts[option] ?? 0}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

const Collection = () => {
  const { products, productsLoading, search, showSearch } = useContext(ShopContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const category = readList(searchParams, 'category', CATEGORIES);
  const subCategory = readList(searchParams, 'type', TYPES);
  const sortType = SORTS.some((s) => s.value === searchParams.get('sort')) ? searchParams.get('sort') : 'relevant';
  const activeQuery = showSearch ? search.trim().toLowerCase() : '';

  const updateParam = (key, values) => {
    const next = new URLSearchParams(searchParams);
    if (values.length) next.set(key, values.join(','));
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const toggle = (key, list, value) =>
    updateParam(key, list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const setSort = (value) => updateParam('sort', value === 'relevant' ? [] : [value]);
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.delete('type');
    setSearchParams(next, { replace: true });
  };

  // Search narrows everything; counts reflect the other active filter group
  const searched = useMemo(
    () => (activeQuery ? products.filter((p) => p.name.toLowerCase().includes(activeQuery)) : products),
    [products, activeQuery]
  );

  const filterProducts = useMemo(() => {
    let list = searched;
    if (category.length) list = list.filter((p) => category.includes(p.category));
    if (subCategory.length) list = list.filter((p) => subCategory.includes(p.subCategory));
    const sorted = list.slice();
    // Sort is applied after filtering, so it is kept when filters change
    if (sortType === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    if (sortType === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    if (sortType === 'newest') sorted.sort((a, b) => b.date - a.date);
    return sorted;
  }, [searched, category.join(), subCategory.join(), sortType]); // eslint-disable-line react-hooks/exhaustive-deps

  const countBy = (list, key, options) =>
    Object.fromEntries(options.map((o) => [o, list.filter((p) => p[key] === o).length]));
  const categoryCounts = countBy(
    subCategory.length ? searched.filter((p) => subCategory.includes(p.subCategory)) : searched, 'category', CATEGORIES
  );
  const typeCounts = countBy(
    category.length ? searched.filter((p) => category.includes(p.category)) : searched, 'subCategory', TYPES
  );

  const activeFilters = [
    ...category.map((v) => ({ key: 'category', list: category, value: v })),
    ...subCategory.map((v) => ({ key: 'type', list: subCategory, value: v })),
  ];

  // Lock scroll + Escape to close while the mobile filter drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const filters = (
    <div className='flex flex-col gap-6'>
      <FilterGroup legend='Category' options={CATEGORIES} selected={category} counts={categoryCounts} onToggle={(v) => toggle('category', category, v)} />
      <FilterGroup legend='Type' options={TYPES} selected={subCategory} counts={typeCounts} onToggle={(v) => toggle('type', subCategory, v)} />
      {activeFilters.length > 0 && (
        <button type='button' onClick={clearFilters} className='self-start text-xs font-medium uppercase tracking-[0.18em] text-neutral-600 underline underline-offset-4 hover:text-ink'>
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className='border-t border-neutral-200 pt-10 sm:pt-14'>
      {/* Header */}
      <div className='flex flex-col gap-6 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <Title text1='ALL' text2='COLLECTIONS' />
          <p className='text-sm text-neutral-600' aria-live='polite'>
            {productsLoading ? 'Loading products…' : `${filterProducts.length} ${filterProducts.length === 1 ? 'product' : 'products'}`}
            {activeQuery && !productsLoading && <> for “{search.trim()}”</>}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => setDrawerOpen(true)}
            className='btn-secondary flex-1 px-5 py-3 sm:hidden'
            aria-expanded={drawerOpen}
            aria-controls='filter-drawer'
          >
            Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}
          </button>
          <label htmlFor='sort' className='sr-only'>Sort products</label>
          <select
            id='sort'
            value={sortType}
            onChange={(e) => setSort(e.target.value)}
            className='min-w-0 flex-1 border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink sm:flex-none'
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>Sort: {s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <ul className='mt-5 flex flex-wrap gap-2' aria-label='Active filters'>
          {activeFilters.map((f) => (
            <li key={`${f.key}-${f.value}`}>
              <button
                type='button'
                onClick={() => toggle(f.key, f.list, f.value)}
                className='flex items-center gap-2 border border-neutral-300 bg-white px-3 py-1.5 text-xs text-ink transition-colors hover:border-ink'
                aria-label={`Remove filter ${f.value}`}
              >
                {f.value}
                <img src={assets.cross_icon} alt='' className='w-2' />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className='mt-8 flex gap-12'>
        {/* Desktop filters */}
        <aside className='hidden w-56 shrink-0 sm:block' aria-label='Product filters'>
          <div className='sticky top-28'>{filters}</div>
        </aside>

        {/* Products */}
        <div className='min-w-0 flex-1'>
          {!productsLoading && products.length > 0 && filterProducts.length === 0 ? (
            <div className='border border-neutral-200 bg-white px-6 py-16 text-center'>
              <p className='font-display text-xl text-ink'>No products match</p>
              <p className='mt-2 text-sm text-neutral-600'>Try removing a filter or searching for something else.</p>
              {activeFilters.length > 0 && (
                <button type='button' onClick={clearFilters} className='btn-secondary mt-6'>Clear filters</button>
              )}
            </div>
          ) : (
            <ProductGrid items={filterProducts} columns='grid-cols-2 md:grid-cols-3 lg:grid-cols-4' skeletonCount={12} />
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div className={`fixed inset-0 z-50 sm:hidden ${drawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-ink/30 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          id='filter-drawer'
          role='dialog'
          aria-modal='true'
          aria-label='Filters'
          inert={!drawerOpen}
          className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col bg-paper transition-transform duration-300 ease-out ${drawerOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className='flex items-center justify-between border-b border-neutral-200 px-6 py-4'>
            <p className='eyebrow text-ink'>Filters</p>
            <button type='button' onClick={() => setDrawerOpen(false)} className='flex h-10 w-10 items-center justify-center' aria-label='Close filters'>
              <img src={assets.cross_icon} alt='' className='w-3.5' />
            </button>
          </div>
          <div className='overflow-y-auto px-6 py-6'>{filters}</div>
          <div className='border-t border-neutral-200 p-4'>
            <button type='button' onClick={() => setDrawerOpen(false)} className='btn-primary w-full'>
              Show {filterProducts.length} {filterProducts.length === 1 ? 'product' : 'products'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Collection;
