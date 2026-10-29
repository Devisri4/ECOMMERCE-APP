import React from 'react'
import { NavLink } from 'react-router-dom'

// Outline icons drawn in currentColor, so they follow the link's text colour (muted, white when active)
const icon = (path) => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' className='shrink-0'>
        {path}
    </svg>
)

const links = [
    { to: '/', label: 'Dashboard', end: true, icon: icon(<><rect x='3' y='3' width='7' height='9' rx='1' /><rect x='14' y='3' width='7' height='5' rx='1' /><rect x='14' y='12' width='7' height='9' rx='1' /><rect x='3' y='16' width='7' height='5' rx='1' /></>) },
    { to: '/add', label: 'Add product', icon: icon(<><circle cx='12' cy='12' r='9' /><path d='M12 8v8M8 12h8' /></>) },
    { to: '/list', label: 'Products', icon: icon(<><path d='M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z' /><circle cx='7.5' cy='7.5' r='1.5' /></>) },
    { to: '/orders', label: 'Orders', icon: icon(<><path d='M21 8l-9-5-9 5v8l9 5 9-5V8z' /><path d='M3 8l9 5 9-5M12 13v8' /></>) },
]

// Vertical on desktop, horizontal scroll strip on mobile. NavLink adds `.active` (styled in index.css).
const Sidebar = () => {
    return (
    <nav aria-label='Admin' className='admin-nav border-b border-zinc-800 md:min-h-[calc(100vh-4rem)] md:w-60 md:shrink-0 md:border-b-0 md:border-r'>
        <ul className='flex gap-2 overflow-x-auto px-4 py-3 md:flex-col md:gap-1 md:px-4 md:py-6'>
            {links.map((link) => (
                <li key={link.to}>
                    <NavLink
                        to={link.to}
                        end={link.end}
                        className='flex items-center gap-3 whitespace-nowrap rounded-md border border-transparent px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-white'
                    >
                        {link.icon}
                        {link.label}
                    </NavLink>
                </li>
            ))}
        </ul>
    </nav>
    )
}

export default Sidebar
