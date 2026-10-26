import React, { useContext, useState,useEffect } from 'react';
import { assets } from '../assets/assets';
import { ShopContext } from '../context/ShopContext';
import { useLocation } from 'react-router-dom';


const SearchBar = () => {
    const { search, setSearch, showSearch, setShowSearch} = useContext(ShopContext);
    const [visible, setVisible] = useState(false)
    const location = useLocation();

    useEffect(()=>{
        if (location.pathname.includes('collection')) {
            setVisible(true);
        }
        else {
            setVisible(false)
        }
    }, [location])

return showSearch && visible ? (
    <div className='pb-8 pt-4 sm:pb-10 sm:pt-6'>
      <div role='search' className='mx-auto flex max-w-2xl items-center gap-3 border-b border-ink pb-2'>
        <img className='w-4 opacity-60' src={assets.search_icon} alt='' />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && setShowSearch(false)}
          type="text"
          aria-label='Search products'
          className='flex-1 bg-transparent py-1 text-base text-ink outline-none placeholder:text-neutral-400 focus-visible:outline-none'
          placeholder='Search products'
        />
        {search && (
          <button
            type='button'
            onClick={() => setSearch('')}
            className='eyebrow text-neutral-500 transition-colors hover:text-ink'
          >
            Clear
          </button>
        )}
        <button
          type='button'
          onClick={() => setShowSearch(false)}
          className='flex h-8 w-8 items-center justify-center transition-opacity hover:opacity-60'
          aria-label='Close search'
        >
          <img className='w-3' src={assets.cross_icon} alt='' />
        </button>
      </div>
    </div>
  ) : null;
};

export default SearchBar;
