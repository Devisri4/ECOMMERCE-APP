import React, { useContext, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'
import { friendlyError } from '../utils/messages'

// Saves the email via POST /api/newsletter/subscribe (no emails are sent; this is a demo store)
const NewsletterBox = () => {
    const { backendUrl } = useContext(ShopContext);
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [subscribed, setSubscribed] = useState(false);

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await axios.post(backendUrl + '/api/newsletter/subscribe', { email: email.trim() });
            if (res.data.success) {
                setSubscribed(true);
                setEmail('');
            } else {
                toast.error(friendlyError(res.data.message, 'We couldn’t subscribe you. Please try again.'));
            }
        } catch (error) {
            toast.error(friendlyError(error, 'We couldn’t subscribe you. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    }

  return (
    <section className='py-20 text-center sm:py-24'>
        <p className='eyebrow text-neutral-500'>Newsletter</p>
        <h2 className='mt-4 font-display text-2xl text-ink sm:text-3xl'>Be the first to see new arrivals</h2>
        <p className='mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-600'>
            New collections, restocks and style notes. We only use your email for FOREVER updates.
        </p>
        {subscribed ? (
            <p role='status' className='mt-8 text-sm text-ink'>Thank you, you’re on the list.</p>
        ) : (
            <form onSubmit={onSubmitHandler} aria-busy={submitting} className='mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:gap-0'>
                <label htmlFor='newsletter-email' className='sr-only'>Email address</label>
                <input
                    id='newsletter-email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='min-w-0 flex-1 border border-neutral-300 bg-white px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-ink focus-visible:outline-none'
                    type="email"
                    placeholder='Enter your email'
                    required
                    maxLength={254}
                    autoComplete='email'
                />
                <button type='submit' disabled={submitting} className='btn-primary'>
                    {submitting ? 'Subscribing…' : 'Subscribe'}
                </button>
            </form>
        )}
    </section>
  )
}

export default NewsletterBox
