import React from 'react'

// Text wordmark (the logo image is dark-on-transparent and disappears on the charcoal theme)
const Navbar = ({setToken}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-[#18181b]/95 px-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <p className="text-lg font-semibold tracking-[0.3em] text-white">
          FOREVER<span className="text-violet-400">.</span>
        </p>
        <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.25em] text-violet-300">
          Admin
        </span>
      </div>
      <button
        type="button"
        onClick={()=>{
          setToken('');
          localStorage.removeItem('token');
        }}
        className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-violet-400 hover:text-white sm:text-sm"
      >
        Logout
      </button>
    </header>
  )
}

export default Navbar
