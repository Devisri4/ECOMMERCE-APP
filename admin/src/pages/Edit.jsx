import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';
import { friendlyError } from '../utils/messages';
import ProductForm from '../components/ProductForm';

// Loads the product via the existing public /api/product/single endpoint, saves via /api/product/update (admin only)
const Edit = ({ token, demo = false }) => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error

  useEffect(() => {
    let cancelled = false;
    // A different product id (back/forward, pasted URL): show its loading state, never the previous form
    setStatus('loading');
    setProduct(null);
    const load = async () => {
      try {
        const res = await axios.post(backendUrl + '/api/product/single', { productId });
        if (cancelled) return;
        if (res.data.success && res.data.product) {
          setProduct(res.data.product);
          setStatus('ready');
        } else {
          setStatus(res.data.success ? 'missing' : 'error');
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus('error');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [productId]);

  const onSubmit = async ({ name, description, price, category, subCategory, bestseller, sizes, slots, stock }) => {
    try {
      const formData = new FormData();
      formData.append('id', productId);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('subCategory', subCategory);
      formData.append('bestseller', bestseller);
      formData.append('sizes', JSON.stringify(sizes));
      formData.append('stock', JSON.stringify(stock));
      // What the form loaded, so the server applies only this change to stock (orders may have taken units since)
      formData.append('stockBase', JSON.stringify(product?.stock || {}));
      // Slots without a new file keep their current image (or are cleared if removed)
      formData.append('existingImages', JSON.stringify(slots.map((s) => (s.file ? null : s.url))));
      slots.forEach((slot, i) => slot.file && formData.append(`image${i + 1}`, slot.file));

      const res = await axios.post(backendUrl + '/api/product/update', formData, { headers: { token } });
      if (res.data.success) {
        toast.success('Product updated.');
        navigate('/list');
        return true;
      }
      toast.error(friendlyError(res.data.message, 'Couldn’t update the product. Please try again.'));
      return false;
    } catch (error) {
      console.error(error);
      toast.error(friendlyError(error, 'Couldn’t update the product. Please try again.'));
      return false;
    }
  };

  if (status === 'loading') {
    return (
      <div className='flex max-w-3xl flex-col gap-6' role='status'>
        <span className='sr-only'>Loading product…</span>
        <div aria-hidden='true' className='h-8 w-48 animate-pulse rounded-md bg-zinc-800/50' />
        <div aria-hidden='true' className='h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-800/40' />
        <div aria-hidden='true' className='h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-800/40' />
      </div>
    );
  }

  if (status !== 'ready') {
    return (
      <div role='alert' className='max-w-3xl rounded-xl border border-zinc-800 bg-[#202024] p-10 text-center'>
        <p className='text-sm text-zinc-400'>
          {status === 'missing' ? 'This product no longer exists.' : 'Couldn’t load this product. Please try again.'}
        </p>
        <Link to='/list' className='mt-5 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500'>
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to='/list' className='mb-6 inline-block text-sm text-zinc-400 hover:text-white'>← Back to products</Link>
      <ProductForm
        key={productId}
        readOnly={demo}
        initial={{
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          subCategory: product.subCategory,
          bestseller: product.bestseller,
          sizes: product.sizes,
          images: product.image,
          stock: product.stock,
        }}
        title={demo ? 'View product' : 'Edit product'}
        subtitle={demo ? 'Read-only demo: you can look around, but changes can’t be saved.' : 'Changes appear in the store as soon as you save.'}
        submitLabel='Save changes'
        submittingLabel='Saving…'
        onSubmit={onSubmit}
      />
    </div>
  );
};

export default Edit;
