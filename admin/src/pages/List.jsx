import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import { friendlyError } from '../utils/messages'
import { formatPrice } from '../utils/currency'

// Small Cloudinary thumbnail instead of the full-size original
const thumb = (url) =>
  typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/f_auto')
    ? url.replace('/upload/', '/upload/f_auto,q_auto,c_fill,w_96,h_110/')
    : url

const List = ({token}) => {

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [removingId, setRemovingId] = useState(null)


  const fetchList = async() => {
    try {
      const response = await axios.get(backendUrl + '/api/product/list')
      if (response.data.success) {
        setList(response.data.products);
      }
      else {
        toast.error(friendlyError(response.data.message, 'Couldn’t load products. Please try again.'))
      }
    } catch (error) {
      console.log(error)
      toast.error(friendlyError(error, 'Couldn’t load products. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const removeProduct = async (id) =>{
    if (removingId) return
    setRemovingId(id)
    try {

      const response = await axios.post(backendUrl + '/api/product/remove',{id} , {headers:{token}})

      if (response.data.success) {
        toast.success("Product removed.")
        setConfirmId(null)
        await fetchList();
      } else {
        toast.error(friendlyError(response.data.message, 'Couldn’t remove the product. Please try again.'))
      }

    } catch (error) {
      console.log(error)
      toast.error(friendlyError(error, 'Couldn’t remove the product. Please try again.'))
    } finally {
      setRemovingId(null)
    }
  }
  useEffect(()=>{
    fetchList()
  }, [])


  return (
  <div>
    <div className='flex flex-wrap items-end justify-between gap-4'>
      <div>
        <h1 className='text-2xl font-semibold text-white'>Products</h1>
        <p className='mt-1 text-sm text-zinc-400'>{loading ? 'Loading…' : `${list.length} products in the store`}</p>
      </div>
      <Link to='/add' className='rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500'>Add product</Link>
    </div>

    <div className='mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#202024]'>
      {/* List Table Title */}
      <div className='hidden grid-cols-[64px_3fr_1fr_1fr_170px] items-center gap-4 border-b border-zinc-800 px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 md:grid'>
        <span>Image</span>
        <span>Name</span>
        <span>Category</span>
        <span>Price</span>
        <span className='text-right'>Action</span>
      </div>

      {loading ? (
        <div className='flex flex-col gap-2 p-5' aria-hidden='true'>
          {[0, 1, 2, 3].map((i) => <div key={i} className='h-14 animate-pulse rounded-md bg-zinc-800/50' />)}
        </div>
      ) : list.length === 0 ? (
        <p className='px-5 py-12 text-center text-sm text-zinc-500'>No products yet. Add your first product to get started.</p>
      ) : (
        <ul className='divide-y divide-zinc-800'>
          {list.map((item) => (
            <li key={item._id} className='grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-3 text-sm md:grid-cols-[64px_3fr_1fr_1fr_170px]'>
              <img className='h-16 w-14 rounded-md bg-zinc-800 object-cover' src={thumb(item.image[0])} alt='' loading='lazy' />
              <div className='min-w-0'>
                <p className='truncate text-zinc-100'>{item.name}</p>
                <p className='text-xs text-zinc-500 md:hidden'>{item.category} · {formatPrice(item.price)}</p>
                {item.bestseller && <span className='mt-1 inline-block rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-300'>Bestseller</span>}
              </div>
              <p className='hidden text-zinc-400 md:block'>{item.category} · {item.subCategory}</p>
              <p className='hidden text-zinc-200 md:block'>{formatPrice(item.price)}</p>
              <div className='text-right'>
                {confirmId === item._id ? (
                  <span className='inline-flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => removeProduct(item._id)}
                      disabled={removingId === item._id}
                      className='rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60'
                    >
                      {removingId === item._id ? 'Removing…' : 'Delete'}
                    </button>
                    <button type='button' onClick={() => setConfirmId(null)} className='px-1.5 py-1.5 text-xs text-zinc-400 hover:text-white'>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <span className='inline-flex items-center gap-2'>
                    <Link
                      to={`/edit/${item._id}`}
                      className='rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-violet-400 hover:text-white'
                      aria-label={`Edit ${item.name}`}
                    >
                      Edit
                    </Link>
                    <button
                      type='button'
                      onClick={() => setConfirmId(item._id)}
                      className='rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-400 hover:text-red-300'
                      aria-label={`Remove ${item.name}`}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
  )
}

export default List
