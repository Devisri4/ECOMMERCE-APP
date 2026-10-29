import React, { useId } from 'react';

const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z';

// Read-only star rating (supports halves, e.g. 4.5). Screen readers get the number, not five icons.
const Stars = ({ value = 0, size = 14, className = '' }) => {
  // useId can contain characters (":", "«") that break url(#…) references, so keep only safe ones
  const uid = 'star' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role='img' aria-label={`${rounded} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={size} height={size} viewBox='0 0 20 20' aria-hidden='true' className='shrink-0'>
            <defs>
              <clipPath id={`${uid}-${i}`}><rect x='0' y='0' width='10' height='20' /></clipPath>
            </defs>
            <path d={STAR_PATH} fill='#d4d4d4' />
            {fill > 0 && <path d={STAR_PATH} fill='#111111' clipPath={fill === 0.5 ? `url(#${uid}-${i})` : undefined} />}
          </svg>
        );
      })}
    </span>
  );
};

export default Stars;
