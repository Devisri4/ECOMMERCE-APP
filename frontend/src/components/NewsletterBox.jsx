import React, { useState } from 'react'

const NewsletterBox = () => {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    // NOTE: there is no newsletter API yet — this only confirms in the UI.
    const onSubmitHandler = (event) => {
        event.preventDefault();
        setSubscribed(true);
        setEmail('');
    }
  return (
    <section className='py-20 text-center sm:py-24'>
        <p className='eyebrow text-neutral-500'>Newsletter</p>
        <h2 className='mt-4 font-display text-2xl text-ink sm:text-3xl'>Subscribe now & get 20% off</h2>
        <p className='mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-600'>
            Be the first to know about new collections, special discounts, and style inspiration.
        </p>
        {subscribed ? (
            <p role='status' className='mt-8 text-sm text-ink'>Thank you — you’re on the list.</p>
        ) : (
            <form onSubmit={onSubmitHandler} className='mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:gap-0'>
                <label htmlFor='newsletter-email' className='sr-only'>Email address</label>
                <input
                    id='newsletter-email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='min-w-0 flex-1 border border-neutral-300 bg-white px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-ink focus-visible:outline-none'
                    type="email"
                    placeholder='Enter your email'
                    required
                    autoComplete='email'
                />
                <button type='submit' className='btn-primary'>Subscribe</button>
            </form>
        )}
    </section>
  )
}

export default NewsletterBox
