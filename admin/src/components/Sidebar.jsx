import React from 'react'
import { NavLink } from 'react-router-dom'
import { assets } from '../assets/assets'

const links = [
    { to: '/', label: 'Dashboard', icon: assets.parcel_icon, end: true },
    { to: '/add', label: 'Add product', icon: assets.add_icon },
    { to: '/list', label: 'Products', icon: assets.order_icon },
    { to: '/orders', label: 'Orders', icon: assets.parcel_icon },
]

// Vertical on desktop, horizontal scroll strip on mobile. NavLink adds `.active` (styled in index.css).
const Sidebar = () => {
    return (
    <nav aria-label='Admin' className='border-b border-zinc-800 md:min-h-[calc(100vh-4rem)] md:w-60 md:shrink-0 md:border-b-0 md:border-r'>
        <ul className='flex gap-2 overflow-x-auto px-4 py-3 md:flex-col md:gap-1 md:px-4 md:py-6'>
            {links.map((link) => (
                <li key={link.to}>
                    <NavLink
                        to={link.to}
                        end={link.end}
                        className='flex items-center gap-3 whitespace-nowrap rounded-md border border-transparent px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-white'
                    >
                        {/* icons are dark PNG/SVGs — inverted for the dark theme */}
                        <img className='h-4 w-4 opacity-80 invert' src={link.icon} alt='' />
                        {link.label}
                    </NavLink>
                </li>
            ))}
        </ul>
    </nav>
    )
}

export default Sidebar
