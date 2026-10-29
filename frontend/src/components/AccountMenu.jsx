import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import { assets } from '../assets/assets';
import { initialsOf } from '../utils/initials';

const itemClass = 'block w-full px-4 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-ink';

// Header account control. Signed out: the person icon, linking to sign-in. Signed in: a round badge with
// the shopper's initials that opens a small menu (Escape, an outside click or choosing an item closes it).
const AccountMenu = ({ iconButton }) => {
  const { token, user, logout } = useContext(ShopContext);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const { pathname, search } = useLocation();

  useEffect(() => setOpen(false), [pathname, search]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!token) {
    return (
      <Link to='/login?redirect=/account' className={iconButton} aria-label='Sign in'>
        <img className='w-[18px]' src={assets.profile_icon} alt='' />
      </Link>
    );
  }

  const initials = initialsOf(user?.name);

  return (
    <div ref={wrapRef} className='relative'>
      <button
        ref={buttonRef}
        type='button'
        onClick={() => setOpen((v) => !v)}
        aria-haspopup='menu'
        aria-expanded={open}
        aria-label={user ? `Account menu for ${user.name}` : 'Account menu'}
        className={iconButton}
      >
        {initials ? (
          <span className='flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-medium tracking-wider text-white'>
            {initials}
          </span>
        ) : (
          <img className='w-[18px]' src={assets.profile_icon} alt='' />
        )}
      </button>

      {open && (
        <div role='menu' className='absolute right-0 top-full z-50 mt-2 w-60 border border-neutral-200 bg-white py-2 shadow-lg'>
          {user && (
            <div className='border-b border-neutral-200 px-4 pb-3 pt-1'>
              <p className='truncate text-sm font-medium text-ink'>{user.name}</p>
              <p className='truncate text-xs text-neutral-500'>{user.email}</p>
            </div>
          )}
          <div className='py-1'>
            <Link role='menuitem' to='/account' className={itemClass}>My account</Link>
            <Link role='menuitem' to='/account?tab=orders' className={itemClass}>My orders</Link>
            <Link role='menuitem' to='/account?tab=wishlist' className={itemClass}>Wishlist</Link>
          </div>
          <div className='border-t border-neutral-200 pt-1'>
            <button role='menuitem' type='button' onClick={() => { setOpen(false); logout(); }} className={itemClass}>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
