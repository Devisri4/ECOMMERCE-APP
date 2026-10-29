import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets';

const SIZES = ["S", "M", "L", "XL", "XXL"];
const labelClass = 'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-zinc-400';
const cardClass = 'rounded-xl border border-zinc-800 bg-[#202024] p-5 sm:p-6';

// Small Cloudinary thumbnail for previews (the stored URL is unchanged)
const thumb = (url) =>
  typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/f_auto')
    ? url.replace('/upload/', '/upload/f_auto,q_auto,c_fill,w_200,h_200/')
    : url;

const EMPTY = { name: '', description: '', price: '', category: 'Men', subCategory: 'Topwear', bestseller: false, sizes: [], images: [], stock: {} };

// Stock inputs hold strings; an empty box means that size isn't tracked
const toStockInputs = (stock = {}) => Object.fromEntries(Object.entries(stock || {}).map(([size, units]) => [size, String(units)]));

// Shared by Add and Edit. Each of the 4 image slots holds either a new File, an existing URL, or nothing.
// onSubmit({ ...fields, slots, stock }) must resolve to true on success; stock only has the selected
// sizes whose box was filled in, e.g. { S: 4, M: 0 }.
// Upload limits: the API accepts images up to 4 MB each (backend/middleware/multer.js), and the host
// (Vercel) rejects a whole request above ~4.5 MB, so the new images together must stay under 4 MB.
const MB = 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * MB;
const MAX_UPLOAD_BYTES = 4 * MB;

const ProductForm = ({ initial = EMPTY, title, subtitle, submitLabel, submittingLabel, onSubmit, resetOnSuccess = false, readOnly = false }) => {
  const toSlots = (images = []) => [0, 1, 2, 3].map((i) => ({ file: null, url: images[i] || null }));

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [price, setPrice] = useState(String(initial.price ?? ''));
  const [category, setCategory] = useState(initial.category);
  const [subCategory, setSubCategory] = useState(initial.subCategory);
  const [bestseller, setBestseller] = useState(!!initial.bestseller);
  const [sizes, setSizes] = useState(initial.sizes || []);
  const [slots, setSlots] = useState(toSlots(initial.images));
  const [stockInputs, setStockInputs] = useState(toStockInputs(initial.stock));
  const [submitting, setSubmitting] = useState(false);

  const orderedSizes = SIZES.filter((s) => sizes.includes(s));
  const setStockInput = (size, value) => setStockInputs((prev) => ({ ...prev, [size]: value.replace(/[^0-9]/g, '').slice(0, 4) }));

  // Object URLs for new files (revoked when they change)
  const previews = useMemo(() => slots.map((s) => (s.file ? URL.createObjectURL(s.file) : null)), [slots]);
  useEffect(() => () => previews.forEach((p) => p && URL.revokeObjectURL(p)), [previews]);

  const toggleSize = (size) =>
    setSizes(prev => prev.includes(size) ? prev.filter(item => item !== size) : [...prev, size]);

  const setSlot = (i, value) => setSlots((prev) => prev.map((s, idx) => (idx === i ? value : s)));

  const reset = () => {
    setName(''); setDescription(''); setPrice(''); setCategory('Men'); setSubCategory('Topwear');
    setBestseller(false); setSizes([]); setSlots(toSlots([])); setStockInputs({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || readOnly) return;

    // The backend needs at least one image and one size to keep a usable product
    if (!slots.some((s) => s.file || s.url)) return toast.error('Please add at least one image.');
    const newFiles = slots.map((s) => s.file).filter(Boolean);
    const tooBig = newFiles.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) return toast.error(`“${tooBig.name}” is larger than 4 MB. Please use a smaller image.`);
    if (newFiles.reduce((sum, f) => sum + f.size, 0) > MAX_UPLOAD_BYTES) {
      return toast.error('The new images add up to more than 4 MB. Save fewer at once, or use smaller images.');
    }
    if (sizes.length === 0) return toast.error('Please select at least one size.');
    if (!(Number(price) > 0)) return toast.error('Please enter a price greater than 0.');

    setSubmitting(true);
    try {
      const stock = Object.fromEntries(
        orderedSizes.filter((s) => (stockInputs[s] ?? '') !== '').map((s) => [s, Number(stockInputs[s])])
      );
      const ok = await onSubmit({ name, description, price, category, subCategory, bestseller, sizes, slots, stock });
      if (ok && resetOnSuccess) reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='flex max-w-3xl flex-col gap-6' aria-busy={submitting}>
      <div>
        <h1 className='text-2xl font-semibold text-white'>{title}</h1>
        {subtitle && <p className='mt-1 text-sm text-zinc-400'>{subtitle}</p>}
      </div>

      <section className={cardClass}>
        <p className={labelClass}>Images <span className='normal-case tracking-normal text-zinc-400'>(up to 4, first is the cover; under 4 MB in total per save)</span></p>
        <div className='flex flex-wrap gap-3'>
          {slots.map((slot, i) => {
            const src = previews[i] || thumb(slot.url);
            return (
              <div key={i} className='relative'>
                <label
                  htmlFor={`image${i + 1}`}
                  className='group flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 transition-colors hover:border-violet-400'
                >
                  <img className={src ? 'h-full w-full object-cover' : 'w-12 opacity-60'} src={src || assets.upload_area} alt={src ? `Image ${i + 1} preview` : ''} />
                  <span className='sr-only'>{src ? `Replace image ${i + 1}` : `Upload image ${i + 1}`}</span>
                  <input
                    onChange={(e) => {
                      if (e.target.files[0]) setSlot(i, { file: e.target.files[0], url: null });
                      // Clear the input so picking the same file again (e.g. after removing it) still registers
                      e.target.value = '';
                    }}
                    type="file"
                    accept='image/*'
                    id={`image${i + 1}`}
                    className='sr-only'
                  />
                </label>
                {src && (
                  <button
                    type='button'
                    onClick={() => setSlot(i, { file: null, url: null })}
                    className='absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:border-red-400 hover:text-red-300'
                    aria-label={`Remove image ${i + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${cardClass} flex flex-col gap-5`}>
        <div>
          <label htmlFor='product-name' className={labelClass}>Product name</label>
          <input id='product-name' onChange={(e)=>setName(e.target.value)} value={name} className='w-full px-3 py-2.5' type="text" placeholder='e.g. Women Round Neck Cotton Top' required/>
        </div>
        <div>
          <label htmlFor='product-description' className={labelClass}>Description</label>
          <textarea id='product-description' onChange={(e)=>setDescription(e.target.value)} value={description} rows={4} className='w-full px-3 py-2.5' placeholder='Fabric, fit and care details' required/>
        </div>

        <div className='grid gap-5 sm:grid-cols-3'>
          <div>
            <label htmlFor='product-category' className={labelClass}>Category</label>
            <select id='product-category' onChange={(e) => setCategory(e.target.value)} value={category} className='w-full px-3 py-2.5'>
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Kids">Kids</option>
            </select>
          </div>
          <div>
            <label htmlFor='product-type' className={labelClass}>Sub category</label>
            <select id='product-type' onChange={(e) => setSubCategory(e.target.value)} value={subCategory} className='w-full px-3 py-2.5'>
              <option value="Topwear">Topwear</option>
              <option value="Bottomwear">Bottomwear</option>
              <option value="Winterwear">Winterwear</option>
            </select>
          </div>
          <div>
            <label htmlFor='product-price' className={labelClass}>Price (₹)</label>
            <input id='product-price' onChange={(e)=>setPrice(e.target.value)} value={price} className='w-full px-3 py-2.5' type="number" min='1' step='1' placeholder='25' required />
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>Sizes</legend>
          <div className='flex flex-wrap gap-2'>
            {SIZES.map((size) => (
              <button
                key={size}
                type='button'
                onClick={() => toggleSize(size)}
                aria-pressed={sizes.includes(size)}
                className={`min-w-12 rounded-md border px-3 py-2 text-sm transition-colors ${sizes.includes(size) ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>

        {orderedSizes.length > 0 && (
          <fieldset>
            <legend className={labelClass}>
              Stock per size <span className='normal-case tracking-normal text-zinc-400'>(leave empty to not track a size)</span>
            </legend>
            <div className='flex flex-wrap gap-3'>
              {orderedSizes.map((size) => (
                <label key={size} className='flex w-24 flex-col gap-1.5 text-xs text-zinc-400'>
                  {size}
                  <input
                    type='text'
                    inputMode='numeric'
                    value={stockInputs[size] ?? ''}
                    onChange={(e) => setStockInput(size, e.target.value)}
                    placeholder='Not tracked'
                    aria-label={`Units in stock, size ${size}`}
                    className='w-full px-3 py-2 text-sm placeholder:text-zinc-500'
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label htmlFor='bestseller' className='flex cursor-pointer items-center gap-3 text-sm text-zinc-300'>
          <input onChange={() => setBestseller(prev => !prev) } checked={bestseller} type="checkbox" id='bestseller' className='h-4 w-4 accent-violet-500' />
          Feature as a bestseller
        </label>
      </section>

      <div className='flex flex-wrap items-center gap-4'>
        <button type="submit" disabled={submitting || readOnly} className='rounded-md bg-violet-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60'>
          {submitting ? submittingLabel : submitLabel}
        </button>
        {readOnly && <p className='text-sm text-amber-300'>Saving is disabled in the read-only demo.</p>}
      </div>
    </form>
  );
};

export default ProductForm;
