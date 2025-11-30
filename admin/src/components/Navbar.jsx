import React from 'react'
import { assets } from '../assets/assets'

const Navbar = ({setToken}) => {
  return (
    <div className="flex items-center justify-between py-4 px-[4%] w-full bg-white">
      <div>
        <img className="w-[max(45%,80px)]" src={assets.logo} alt="Logo" />
        
      </div>
      <button onClick={()=>{
  setToken('');
  localStorage.removeItem('token');
}} 
className="bg-gray-600 text-white px-5 py-2 sm:px-7 sm:py-2 rounded-full text-xs sm:text-sm">
  Logout
</button>

    </div>
  )
}

export default Navbar
