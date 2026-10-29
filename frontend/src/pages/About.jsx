import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import NewsletterBox from '../components/NewsletterBox'
import { STORE_INFO } from '../utils/storeInfo'

const VALUES = [
  {
    title: 'Quality, checked',
    text: 'Every piece is chosen for fabric, fit and finish, and checked before it is packed, so what arrives matches what you saw.',
  },
  {
    title: 'Simple to shop',
    text: 'Filter by category and type, save your bag across devices, and pay by card or cash on delivery in a few steps.',
  },
  {
    title: 'Easy to return',
    text: `Changed your mind? Return unused items within ${STORE_INFO.returnDays} days of delivery, and cancel unshipped orders from your account.`,
  },
]

const About = () => {
  return (
    <div className='border-t border-neutral-200 pt-10 sm:pt-14'>
      <div className='grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20'>
        <img className='aspect-[4/5] w-full object-cover lg:aspect-auto lg:h-full' src={assets.about_img} alt='' />

        <div className='flex flex-col justify-center'>
          <p className='eyebrow text-neutral-500'>About us</p>
          <h1 className='mt-4 font-display text-[2.25rem] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[3rem]'>
            Everyday clothes, made to last
          </h1>
          <div className='mt-6 flex max-w-xl flex-col gap-4 text-sm leading-relaxed text-neutral-600 sm:text-[15px]'>
            <p>
              FOREVER is a fashion store for men, women and kids, built around wardrobe staples: tees, shirts, trousers
              and winterwear in easy fits and colours that work together.
            </p>
            <p>
              We keep the range focused, price it fairly and make shopping straightforward, from the first browse to
              delivery at your door.
            </p>
          </div>
          <Link to='/collection' className='btn-primary mt-10 self-start'>Shop the collection</Link>
        </div>
      </div>

      <section aria-labelledby='values-heading' className='mt-24 sm:mt-32'>
        <h2 id='values-heading' className='font-display text-[1.9rem] leading-tight text-ink sm:text-[2.4rem]'>
          Why shop with us
        </h2>
        <div className='mt-10 grid gap-px border border-neutral-200 bg-neutral-200 md:grid-cols-3'>
          {VALUES.map((value) => (
            <div key={value.title} className='bg-white px-8 py-10 sm:px-10 sm:py-12'>
              <h3 className='text-xs font-medium uppercase tracking-[0.18em] text-ink'>{value.title}</h3>
              <p className='mt-4 text-sm leading-relaxed text-neutral-600'>{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      <NewsletterBox />
    </div>
  )
}

export default About
