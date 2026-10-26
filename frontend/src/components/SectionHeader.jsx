import React from 'react';
import { Link } from 'react-router-dom';

// Editorial section header for the homepage: index + eyebrow, serif title, optional copy and "view all" link.
const SectionHeader = ({ id, index, eyebrow, title, description, linkTo, linkLabel = 'View all' }) => (
  <div className='mb-10 flex flex-col gap-6 sm:mb-14 md:flex-row md:items-end md:justify-between'>
    <div className='max-w-2xl'>
      <p className='eyebrow flex items-center gap-3 text-neutral-500'>
        {index && <span className='font-display text-sm normal-case tracking-normal text-ink'>{index}</span>}
        <span aria-hidden='true' className='h-px w-8 bg-neutral-300' />
        {eyebrow}
      </p>
      <h2 id={id} className='mt-5 font-display text-[2.25rem] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[3rem]'>
        {title}
      </h2>
      {description && <p className='mt-4 max-w-lg text-sm leading-relaxed text-neutral-600 sm:text-[15px]'>{description}</p>}
    </div>
    {linkTo && (
      <Link to={linkTo} className='group inline-flex shrink-0 items-center gap-3 self-start text-xs font-medium uppercase tracking-[0.18em] text-ink md:self-auto'>
        {linkLabel}
        <span aria-hidden='true' className='h-px w-8 bg-ink transition-all duration-300 group-hover:w-12' />
      </Link>
    )}
  </div>
);

export default SectionHeader;
