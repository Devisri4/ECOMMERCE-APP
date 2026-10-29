import React from 'react'
import { seasonYear } from '../utils/season';
import { Link } from 'react-router-dom';
import { assets } from "../assets/assets";
import useParallax from '../hooks/useParallax';

// Editorial hero: oversized serif headline on ivory, model photo in an arch frame with an offset
// outline arch behind it. The two layers drift at different speeds on scroll (off under prefers-reduced-motion).
const Hero = () => {
    const archRef = useParallax(0.04);
    const outlineRef = useParallax(-0.06);

    const year = seasonYear();

    return (
        <section aria-labelledby='hero-heading' className='relative pt-6 sm:pt-10'>
            <div className='grid items-center gap-y-14 lg:grid-cols-12 lg:gap-x-10'>
                {/* Copy */}
                <div className='relative z-10 lg:col-span-6 xl:col-span-6'>
                    <p className='reveal eyebrow flex items-center gap-3 text-neutral-500' style={{ animationDelay: '60ms' }}>
                        <span aria-hidden='true' className='h-px w-10 bg-ink' />
                        Collection {year}
                    </p>
                    <h1
                        id='hero-heading'
                        className='reveal mt-7 font-display text-[clamp(3.25rem,8.2vw,8.5rem)] leading-[0.9] tracking-[-0.02em] text-ink'
                        style={{ animationDelay: '140ms' }}
                    >
                        The New
                        <span className='block pl-[0.6em] text-[#8a837d]'>Season</span>
                    </h1>
                    <p className='reveal mt-8 max-w-md text-[15px] leading-relaxed text-neutral-600' style={{ animationDelay: '240ms' }}>
                        Considered cuts and everyday fabrics for men, women and kids — pieces made to be worn often and kept for longer.
                    </p>
                    <div className='reveal mt-10 flex flex-wrap items-center gap-x-8 gap-y-4' style={{ animationDelay: '320ms' }}>
                        <Link to='/collection' className='btn-primary'>Shop the collection</Link>
                        <a href='#bestsellers' className='group inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-ink'>
                            Best sellers
                            <span aria-hidden='true' className='h-px w-8 bg-ink transition-all duration-300 group-hover:w-12' />
                        </a>
                    </div>
                </div>

                {/* Arch composition: photo + an offset outline arch behind it for depth */}
                <div className='relative lg:col-span-6'>
                    <div className='relative mx-auto w-[82%] max-w-[480px] sm:w-[64%] lg:mr-6 lg:w-[78%]'>
                        {/* outer div gets the parallax transform, inner div keeps its fixed offset */}
                        <div ref={outlineRef} aria-hidden='true' className='absolute inset-0 will-change-transform'>
                            <div className='h-full w-full -translate-x-5 translate-y-5 rounded-t-full border border-neutral-300 sm:-translate-x-7 sm:translate-y-7' />
                        </div>
                        {/* The photo's blush backdrop becomes the arch colour */}
                        <div ref={archRef} className='reveal relative will-change-transform' style={{ animationDelay: '200ms' }}>
                            <div className='aspect-[4/5] overflow-hidden rounded-t-full bg-blush'>
                                <img
                                    className='h-full w-full object-cover object-[72%_30%]'
                                    src={assets.hero_img}
                                    alt='Model wearing a black sheer scarf from the new collection'
                                    width={1259}
                                    height={1008}
                                    fetchPriority='high'
                                />
                            </div>
                            <Link
                                to='/collection?category=Women'
                                className='group absolute bottom-5 left-5 flex items-center gap-4 bg-white/95 px-5 py-3 text-ink backdrop-blur transition-colors hover:bg-white sm:bottom-6 sm:left-6'
                            >
                                <span>
                                    <span className='block text-[10px] uppercase tracking-[0.22em] text-neutral-500'>New season</span>
                                    <span className='block text-sm font-medium'>Shop women</span>
                                </span>
                                <span aria-hidden='true' className='h-px w-6 bg-ink transition-all duration-300 group-hover:w-9' />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Marquee of store promises (duplicated track for a seamless loop) */}
            <div className='relative mt-24 overflow-hidden border-y border-neutral-200 py-4 sm:mt-28' aria-label='Store benefits'>
                <div className='marquee flex w-max whitespace-nowrap text-xs uppercase tracking-[0.3em] text-neutral-600'>
                    {[0, 1].map((copy) => (
                        <div key={copy} className='flex gap-12 pr-12' aria-hidden={copy === 1 ? 'true' : undefined}>
                            {['New season arrivals', 'Men · Women · Kids', 'Easy 7-day returns', 'Cash on delivery', 'Secure card payments', '100% original products'].map((item) => (
                                <span key={item} className='flex items-center gap-12'>
                                    {item}
                                    <span aria-hidden='true' className='h-1 w-1 rounded-full bg-neutral-400' />
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
  )
}

export default Hero
