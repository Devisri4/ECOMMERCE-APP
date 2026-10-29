import React from 'react'
import { seasonYear } from '../utils/season'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { STORE_INFO, EMAIL_USER, EMAIL_DOMAIN } from '../utils/storeInfo'

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
                    Modern essentials for men, women and kids: considered fabrics, easy fits and a {STORE_INFO.returnDays}-day return window on every order.
                </p>
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
                <li><a href={`mailto:${STORE_INFO.email}`} className={linkClass}>{EMAIL_USER}@<wbr />{EMAIL_DOMAIN}</a></li>
                <li className='text-neutral-600'>{STORE_INFO.hours}</li>
                <li className='text-neutral-600'>{STORE_INFO.city}</li>
            </FooterColumn>
        </div>
        <div className='border-t border-neutral-200'>
            <div className='page-container flex flex-col gap-2 py-6 text-xs text-neutral-500 sm:flex-row sm:justify-between'>
                <p>© {seasonYear()} FOREVER. A portfolio demo store: no real orders are shipped or charged.</p>
                <a href={STORE_INFO.sourceUrl} target='_blank' rel='noreferrer' className='transition-colors hover:text-ink'>
                    View the source on GitHub
                </a>
            </div>
        </div>
    </footer>
    )
}
export default Footer
