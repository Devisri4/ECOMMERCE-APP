import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ShopContext } from '../context/ShopContext';
import { friendlyError } from '../utils/messages';
import Stars from './Stars';

const MAX_COMMENT = 1000; // same limit as backend/controllers/reviewController.js
const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };

const formatDate = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Star picker built from native radio buttons, so it works with the keyboard and screen readers
const StarInput = ({ value, onChange }) => (
  <fieldset>
    <legend className='mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-600'>Your rating</legend>
    <div className='flex items-center gap-1'>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className='cursor-pointer p-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink'>
          <input type='radio' name='review-rating' value={n} checked={value === n} onChange={() => onChange(n)} className='sr-only' />
          <span className='sr-only'>{n} {n === 1 ? 'star' : 'stars'}, {RATING_LABELS[n]}</span>
          <svg width='24' height='24' viewBox='0 0 20 20' aria-hidden='true'>
            <path d='M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z' fill={n <= value ? '#111111' : '#d4d4d4'} />
          </svg>
        </label>
      ))}
      {value > 0 && <span className='ml-2 text-sm text-neutral-600'>{RATING_LABELS[value]}</span>}
    </div>
  </fieldset>
);

const ProductReviews = ({ productId }) => {
  const { backendUrl, token, updateProduct } = useContext(ShopContext);
  const [data, setData] = useState(null);       // { reviews, counts, rating, reviewCount }
  const [loadError, setLoadError] = useState(false);
  const [mine, setMine] = useState(null);       // the signed-in customer's review, if any
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // The product being shown right now. Replies for a product the shopper has already left are
  // dropped, so quick clicks through "You may also like" never show another product's reviews.
  const currentId = useRef(productId);
  currentId.current = productId;

  const load = async () => {
    const id = productId;
    setLoadError(false);
    try {
      const res = await axios.get(backendUrl + '/api/review/list', { params: { productId: id } });
      if (currentId.current !== id) return;
      if (res.data.success) setData(res.data);
      else setLoadError(true);
    } catch {
      if (currentId.current === id) setLoadError(true);
    }
  };

  useEffect(() => {
    setData(null);
    load();
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill the form with the customer's existing review so they can edit it
  useEffect(() => {
    setMine(null); setRating(0); setComment('');
    if (!token) return;
    let active = true;
    axios.post(backendUrl + '/api/review/mine', { productId }, { headers: { token } })
      .then((res) => {
        if (active && res.data.success && res.data.review) {
          setMine(res.data.review);
          setRating(res.data.review.rating);
          setComment(res.data.review.comment || '');
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [productId, token, backendUrl]);

  const applySummary = (res) => {
    updateProduct(productId, { rating: res.data.rating, reviewCount: res.data.reviewCount });
    load();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!rating) return toast.error('Please choose a star rating.', { toastId: 'review-rating' });
    setSaving(true);
    try {
      const res = await axios.post(backendUrl + '/api/review/add', { productId, rating, comment: comment.trim() }, { headers: { token } });
      if (res.data.success) {
        toast.success(mine ? 'Your review has been updated.' : 'Thanks for your review.');
        setMine({ rating, comment: comment.trim() });
        applySummary(res);
      } else {
        toast.error(friendlyError(res.data.message, 'We couldn’t save your review. Please try again.'));
      }
    } catch (error) {
      toast.error(friendlyError(error, 'We couldn’t save your review. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await axios.post(backendUrl + '/api/review/remove', { productId }, { headers: { token } });
      if (res.data.success) {
        toast.success('Your review has been removed.');
        setMine(null); setRating(0); setComment('');
        applySummary(res);
      } else {
        toast.error(friendlyError(res.data.message, 'We couldn’t remove your review. Please try again.'));
      }
    } catch (error) {
      toast.error(friendlyError(error, 'We couldn’t remove your review. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const total = data?.reviewCount || 0;

  return (
    <section id='reviews' aria-labelledby='reviews-heading' className='scroll-mt-28 border-t border-neutral-200 py-16 sm:py-20'>
      <h2 id='reviews-heading' className='font-display text-[1.9rem] leading-tight text-ink sm:text-[2.4rem]'>Reviews</h2>

      <div className='mt-10 grid gap-12 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16'>
        {/* Summary + form */}
        <div className='flex flex-col gap-10'>
          {data && total > 0 && (
            <div>
              <div className='flex items-end gap-3'>
                <span className='font-display text-5xl leading-none text-ink'>{data.rating.toFixed(1)}</span>
                <div className='pb-1'>
                  <Stars value={data.rating} size={16} />
                  <p className='mt-1 text-xs text-neutral-500'>{total} {total === 1 ? 'review' : 'reviews'}</p>
                </div>
              </div>
              {total > 0 && (
                <ul className='mt-6 flex flex-col gap-2' aria-label='Rating breakdown'>
                  {[5, 4, 3, 2, 1].map((s) => {
                    const count = data.counts[s] || 0;
                    return (
                      <li key={s} className='flex items-center gap-3 text-xs text-neutral-600'>
                        <span className='w-10 shrink-0'>{s} star</span>
                        <span className='h-1.5 flex-1 bg-neutral-200' aria-hidden='true'>
                          <span className='block h-full bg-ink' style={{ width: `${(count / total) * 100}%` }} />
                        </span>
                        <span className='w-6 shrink-0 text-right tabular-nums'>{count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {token ? (
            <form onSubmit={onSubmit} aria-busy={saving} className='flex flex-col gap-5 border border-neutral-200 bg-white p-6'>
              <p className='text-sm font-medium text-ink'>{mine ? 'Edit your review' : 'Write a review'}</p>
              <StarInput value={rating} onChange={setRating} />
              <div>
                <label htmlFor='review-comment' className='mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-600'>
                  Your review <span className='normal-case tracking-normal text-neutral-400'>(optional)</span>
                </label>
                <textarea
                  id='review-comment'
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                  rows={4}
                  placeholder='How was the fit, fabric and quality?'
                  className='w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink focus-visible:outline-none'
                />
                <p className='mt-1 text-right text-[11px] text-neutral-400'>{comment.length}/{MAX_COMMENT}</p>
              </div>
              <div className='flex flex-wrap items-center gap-4'>
                <button type='submit' disabled={saving} className='btn-primary'>
                  {saving ? 'Saving…' : mine ? 'Update review' : 'Post review'}
                </button>
                {mine && (
                  <button type='button' onClick={onDelete} disabled={saving} className='text-xs uppercase tracking-[0.16em] text-neutral-500 underline-offset-4 hover:text-ink hover:underline'>
                    Delete
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className='border border-neutral-200 bg-white p-6 text-sm text-neutral-600'>
              <p>Bought this piece? Share how it fits.</p>
              <Link to={`/login?redirect=/product/${productId}`} className='btn-secondary mt-4 w-full'>Sign in to review</Link>
            </div>
          )}
        </div>

        {/* List */}
        <div>
          {loadError ? (
            <div role='alert' className='text-sm text-neutral-600'>
              <p>We couldn’t load reviews right now.</p>
              <button type='button' onClick={load} className='btn-secondary mt-4'>Try again</button>
            </div>
          ) : !data ? (
            <div role='status' className='flex flex-col gap-4'>
              <span className='sr-only'>Loading reviews…</span>
              {[0, 1].map((i) => <div key={i} aria-hidden='true' className='h-24 animate-pulse bg-neutral-200/70' />)}
            </div>
          ) : data.reviews.length === 0 ? (
            <p className='text-sm text-neutral-600'>No reviews yet. Be the first to review this piece.</p>
          ) : (
            <ul className='divide-y divide-neutral-200 border-y border-neutral-200'>
              {data.reviews.map((review) => (
                <li key={review._id} className='py-6'>
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                    <Stars value={review.rating} size={14} />
                    <span className='text-sm font-medium text-ink'>{review.name}</span>
                    {review.verified && (
                      <span className='text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-800'>Verified buyer</span>
                    )}
                    <span className='text-xs text-neutral-500'>{formatDate(review.date)}</span>
                  </div>
                  {review.comment && <p className='mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-700'>{review.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductReviews;
