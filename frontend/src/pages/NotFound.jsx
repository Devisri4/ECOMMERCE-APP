import React from 'react'
import { Link } from 'react-router-dom'

const NotFound = () => (
  <div className='border-t border-neutral-200 py-24 text-center sm:py-32'>
    <p className='eyebrow text-neutral-500'>Error 404</p>
    <h1 className='mt-4 font-display text-[2.25rem] leading-tight text-ink sm:text-[3rem]'>Page not found</h1>
    <p className='mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-600'>
      The page you’re looking for doesn’t exist or has moved.
    </p>
    <div className='mt-10 flex flex-wrap justify-center gap-3'>
      <Link to='/' className='btn-primary'>Go to home</Link>
      <Link to='/collection' className='btn-secondary'>Browse the collection</Link>
    </div>
  </div>
)

export default NotFound
