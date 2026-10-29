import React, { useContext, useEffect, useRef, useState } from 'react';
import useDrawerFocus from '../hooks/useDrawerFocus';
import AccountMenu from './AccountMenu';
import { assets } from "../assets/assets";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ShopContext } from '../context/ShopContext';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/collection', label: 'Collection' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const iconButton = 'flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60';

const Navbar = () => {
  const [visible, setVisible] = useState(false); // mobile drawer hidden by default
  const drawerRef = useRef(null);
  useDrawerFocus(visible, drawerRef);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  const { setShowSearch, getCartCount, navigate, token, logout, wishlist } = useContext(ShopContext);
  const cartCount = getCartCount();

  // Search lives on the collection page, so take the shopper there
  const openSearch = () => {
    setShowSearch(true);
    if (!pathname.includes('collection')) navigate('/collection');
  };

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes the mobile drawer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setVisible(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Lock page scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-paper/95 backdrop-blur transition-shadow duration-300 ${scrolled ? 'shadow-[0_1px_0_0_rgba(17,17,17,0.08)]' : ''}`}
      >
        <div className="page-container flex h-16 items-center justify-between sm:h-20">
          {/* Logo */}
          <div className="flex flex-1 items-center">
            <Link to="/" aria-label="FOREVER home">
              <img src={assets.logo} className="w-28 sm:w-32" alt="FOREVER" />
            </Link>
          </div>

          {/* Menu links (large screens only) */}
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="flex gap-8">
              {navLinks.map(({ to, label }) => (
                <li key={to}>
                  <NavLink to={to} end={to === '/'} className="group relative block py-2 text-xs uppercase tracking-[0.18em]">
                    {({ isActive }) => (
                      <>
                        <span className={isActive ? 'text-ink' : 'text-neutral-500 transition-colors group-hover:text-ink'}>{label}</span>
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-0 left-0 h-px bg-ink transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}
                        />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right side icons */}
          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <button type="button" onClick={openSearch} className={iconButton} aria-label="Search products">
              <img src={assets.search_icon} className="w-[18px]" alt="" />
            </button>

            {/* Account: initials badge with a menu when signed in, sign-in link otherwise */}
            <AccountMenu iconButton={iconButton} />

            {/* Wishlist: guests sign in first; items they saved are kept and merged into the account */}
            <Link
              to={token ? '/account?tab=wishlist' : '/login?redirect=/account?tab=wishlist'}
              className={`${iconButton} relative`}
              aria-label={`Wishlist, ${wishlist.length} ${wishlist.length === 1 ? 'item' : 'items'}`}
            >
              <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true'>
                <path d='M12 20.5s-7.5-4.4-9.3-9.2C1.6 8.1 3.6 4.5 7.1 4.5c2 0 3.5 1.1 4.9 2.9 1.4-1.8 2.9-2.9 4.9-2.9 3.5 0 5.5 3.6 4.4 6.8-1.8 4.8-9.3 9.2-9.3 9.2z' fill='none' stroke='#111111' strokeWidth='1.6' strokeLinejoin='round' />
              </svg>
              {wishlist.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-medium leading-none text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link to="/cart" className={`${iconButton} relative`} aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}>
              <img src={assets.cart_icon} className="w-[18px]" alt="" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-medium leading-none text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile menu icon (opens drawer) */}
            <button
              type="button"
              onClick={() => setVisible(true)}
              className={`${iconButton} sm:hidden`}
              aria-label="Open menu"
              aria-expanded={visible}
              aria-controls="mobile-menu"
            >
              <img src={assets.menu_icon} className="w-[18px]" alt="" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — rendered outside the header so `fixed` is relative to the viewport */}
      <div className={`fixed inset-0 z-50 sm:hidden ${visible ? '' : 'pointer-events-none'}`} aria-hidden={!visible}>
        <div
          onClick={() => setVisible(false)}
          className={`absolute inset-0 bg-ink/30 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        />
        <nav
          id="mobile-menu"
          ref={drawerRef}
          aria-label="Mobile"
          inert={!visible}
          className={`absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-paper transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6">
            <span className="eyebrow text-neutral-500">Menu</span>
            <button type="button" onClick={() => setVisible(false)} className={iconButton} aria-label="Close menu">
              <img src={assets.cross_icon} className="w-3.5" alt="" />
            </button>
          </div>
          <ul className="flex flex-col px-6 py-4">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `block border-b border-neutral-200 py-4 font-display text-2xl ${isActive ? 'text-ink' : 'text-neutral-500'}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-3 border-t border-neutral-200 px-6 py-6 text-sm text-neutral-600">
            {token ? (
              <>
                <Link to="/account" className="hover:text-ink">My account</Link>
                <Link to="/account?tab=orders" className="hover:text-ink">My orders</Link>
                <Link to="/account?tab=wishlist" className="hover:text-ink">Wishlist</Link>
                <button type="button" onClick={logout} className="text-left hover:text-ink">Logout</button>
              </>
            ) : (
              <Link to="/login" className="hover:text-ink">Sign in / Create account</Link>
            )}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Navbar;
