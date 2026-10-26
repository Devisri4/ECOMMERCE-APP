import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'

const linkClass = 'text-neutral-600 transition-colors hover:text-ink'

const FooterColumn = ({ title, children }) => (
    <div>
        <h2 className='eyebrow mb-5 text-ink'>{title}</h2>
        <ul className='flex flex-col gap-3 text-sm'>{children}</ul>
    </div>
)

const Footer = () => {
    return (
    <footer className='mt-24 border-t border-neutral-200 bg-white sm:mt-32'>
        <div className='page-container grid gap-12 py-14 sm:grid-cols-2 sm:py-16 lg:grid-cols-[2fr_1fr_1fr_1fr]'>
            <div>
                <Link to='/' aria-label='FOREVER home'>
                    <img src={assets.logo} className='w-28' alt='FOREVER' />
                </Link>
                <p className='mt-5 max-w-sm text-sm leading-relaxed text-neutral-600'>
                    Welcome to FOREVER, your one-stop destination for quality products at the best prices. We bring you the latest trends, exclusive collections, and reliable service — all designed to make your shopping experience simple, secure, and enjoyable. </p>
            </div>
            <FooterColumn title='Shop'>
                <li><Link to='/collection' className={linkClass}>All collections</Link></li>
                <li><Link to='/cart' className={linkClass}>Cart</Link></li>
                <li><Link to='/orders' className={linkClass}>My orders</Link></li>
            </FooterColumn>
            <FooterColumn title='Company'>
                <li><Link to='/' className={linkClass}>Home</Link></li>
                <li><Link to='/about' className={linkClass}>About us</Link></li>
                <li><Link to='/contact' className={linkClass}>Contact</Link></li>
            </FooterColumn>
            <FooterColumn title='Get in touch'>
                <li><a href='tel:+12124567865' className={linkClass}>+1-212-456-7865</a></li>
                <li><a href='mailto:contact@forevershoping.com' className={`${linkClass} break-all`}>contact@forevershoping.com</a></li>
            </FooterColumn>
        </div>
        <div className='border-t border-neutral-200'>
            <p className='page-container py-6 text-xs text-neutral-500'>
                © {new Date().getFullYear()} FOREVER. All rights reserved.
            </p>
        </div>
    </footer>
    )
}
export default Footer
