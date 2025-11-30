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
    <div className='w-full flex justify-center pt-6 pb-10 bg-transparent'>
      <div className='flex items-center px-6 py-2 bg-white border border-gray-200 rounded-full shadow-sm w-[80vw] max-w-2xl'>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          type="text"
          className='flex-1 bg-white outline-none text-gray-700 text-base pl-2'
          placeholder='Search'
        />
        <img className='w-5 ml-2 cursor-pointer' src={assets.search_icon} alt='search'/>
        <img
          onClick={() => setShowSearch(false)}
          className='w-5 ml-4 cursor-pointer'
          src={assets.cross_icon}
          alt='close'
        />
      </div>
    </div>
  ) : null;
};

export default SearchBar;

