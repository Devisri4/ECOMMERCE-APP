import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import NewsletterBox from '../components/NewsletterBox'
import { STORE_INFO, EMAIL_USER, EMAIL_DOMAIN } from '../utils/storeInfo'

const ContactBlock = ({ title, children }) => (
  <div className='border-t border-neutral-200 pt-6'>
    <h2 className='eyebrow text-ink'>{title}</h2>
    <div className='mt-4 flex flex-col gap-1.5 text-sm leading-relaxed text-neutral-600'>{children}</div>
  </div>
)

const linkClass = 'text-ink underline underline-offset-4 transition-opacity hover:opacity-70'

const Contact = () => {
  return (
    <div className='border-t border-neutral-200 pt-10 sm:pt-14'>
      <div className='grid gap-12 lg:grid-cols-2 lg:gap-20'>
        <img className='aspect-[4/5] w-full object-cover lg:aspect-auto lg:h-full' src={assets.contact_img} alt='' />

        <div className='flex flex-col justify-center'>
          <p className='eyebrow text-neutral-500'>Contact</p>
          <h1 className='mt-4 font-display text-[2.25rem] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[3rem]'>
            We’re here to help
          </h1>
          <p className='mt-5 max-w-md text-sm leading-relaxed text-neutral-600 sm:text-[15px]'>
            Questions about sizing, an order or a return? Write to us and we’ll get back to you within one working day.
          </p>

          <div className='mt-10 grid gap-8 sm:grid-cols-2'>
            <ContactBlock title='Customer care'>
              <a href={`mailto:${STORE_INFO.email}`} className={`${linkClass} self-start`}>{EMAIL_USER}@<wbr />{EMAIL_DOMAIN}</a>
              <p>{STORE_INFO.hours}</p>
            </ContactBlock>

            <ContactBlock title='Studio'>
              <address className='not-italic'>
                {STORE_INFO.studio.map((line) => <span key={line} className='block'>{line}</span>)}
              </address>
            </ContactBlock>

            <ContactBlock title='Your orders'>
              <p>Track an order or cancel one before it ships from your account.</p>
              <Link to='/orders' className={`${linkClass} self-start`}>View my orders</Link>
            </ContactBlock>

            <ContactBlock title='Returns'>
              <p>Return unused items with tags and original packaging within {STORE_INFO.returnDays} days of delivery.</p>
            </ContactBlock>
          </div>

          <p className='mt-10 border border-neutral-200 bg-white px-5 py-4 text-xs leading-relaxed text-neutral-500'>
            FOREVER is a portfolio demo store. The studio address is fictional, card payments run in Stripe test mode,
            and no orders are shipped.
          </p>
        </div>
      </div>

      <NewsletterBox />
    </div>
  )
}

export default Contact
