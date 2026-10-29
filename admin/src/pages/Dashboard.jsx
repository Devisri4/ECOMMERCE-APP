import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { backendUrl } from '../App'
import { formatPrice, orderCurrency } from '../utils/currency'

// Overview computed from the existing product list + admin order list endpoints (no new APIs, no mock data)
const Dashboard = ({ token }) => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  const load = async () => {
    setError(false)
    try {
      const [productsRes, ordersRes, subscribersRes] = await Promise.all([
        axios.get(backendUrl + '/api/product/list'),
        axios.post(backendUrl + '/api/order/list', {}, { headers: { token } }),
        // Optional: the dashboard still loads if the subscriber count is unavailable
        axios.post(backendUrl + '/api/newsletter/count', {}, { headers: { token } }).catch(() => null),
      ])
      if (!productsRes.data.success || !ordersRes.data.success) throw new Error('load failed')
      setData({
        products: productsRes.data.products,
        orders: ordersRes.data.orders,
        subscribers: subscribersRes?.data?.success ? subscribersRes.data.count : null,
      })
    } catch (err) {
      console.log(err)
      setError(true)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  if (error) {
    return (
      <div role='alert' className='rounded-xl border border-zinc-800 bg-[#202024] p-10 text-center'>
        <p className='text-sm text-zinc-400'>Couldn’t load dashboard data.</p>
        <button type='button' onClick={load} className='mt-5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500'>Try again</button>
      </div>
    )
  }

  const orders = data?.orders || []
  const active = orders.filter((o) => o.status !== 'Cancelled')
  const paidRevenue = (code) =>
    active.filter((o) => o.payment && orderCurrency(o) === code).reduce((sum, o) => sum + o.amount, 0)
  const stats = data && [
    { label: 'Products', value: data.products.length, hint: `${data.products.filter((p) => p.bestseller).length} bestsellers` },
    { label: 'Orders', value: active.length, hint: `${orders.length - active.length} cancelled` },
    { label: 'Awaiting fulfilment', value: active.filter((o) => o.status !== 'Delivered').length, hint: 'Not yet delivered' },
    {
      // Never add rupees and dollars together: INR is the headline, pre-INR (USD) revenue is shown separately
      label: 'Paid revenue',
      value: formatPrice(paidRevenue('INR'), 'INR'),
      hint: [
        paidRevenue('USD') > 0 && `+ ${formatPrice(paidRevenue('USD'), 'USD')} from earlier USD orders`,
        `${active.filter((o) => !o.payment).length} unpaid (COD / pending)`,
      ].filter(Boolean).join(' · '),
    },
    { label: 'Subscribers', value: data.subscribers ?? '–', hint: 'Newsletter sign-ups' },
  ]
  const recent = [...orders].sort((a, b) => b.date - a.date).slice(0, 5)

  return (
    <div>
      <h1 className='text-2xl font-semibold text-white'>Dashboard</h1>
      <p className='mt-1 text-sm text-zinc-400'>Store overview from live data.</p>

      <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5'>
        {stats
          ? stats.map((s) => (
              <div key={s.label} className='rounded-xl border border-zinc-800 bg-[#202024] p-5'>
                <p className='text-xs font-medium uppercase tracking-[0.16em] text-zinc-500'>{s.label}</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{s.value}</p>
                <p className='mt-1 text-xs text-zinc-500'>{s.hint}</p>
              </div>
            ))
          : [0, 1, 2, 3, 4].map((i) => <div key={i} aria-hidden='true' className='h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-800/40' />)}
      </div>

      <section className='mt-10 rounded-xl border border-zinc-800 bg-[#202024]'>
        <div className='flex items-center justify-between border-b border-zinc-800 px-5 py-4'>
          <h2 className='text-sm font-semibold text-white'>Recent orders</h2>
          <Link to='/orders' className='text-xs font-medium text-violet-300 hover:text-violet-200'>View all</Link>
        </div>
        {!data ? (
          <p className='px-5 py-8 text-sm text-zinc-500'>Loading…</p>
        ) : recent.length === 0 ? (
          <p className='px-5 py-8 text-sm text-zinc-500'>No orders yet.</p>
        ) : (
          <ul className='divide-y divide-zinc-800'>
            {recent.map((o) => (
              <li key={o._id} className='flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm'>
                <span className='font-mono text-xs text-zinc-400'>#{o._id.slice(-8).toUpperCase()}</span>
                <span className='text-zinc-300'>{o.address?.firstName} {o.address?.lastName}</span>
                <span className='text-zinc-400'>{new Date(o.date).toLocaleDateString()}</span>
                <span className='text-zinc-200'>{formatPrice(o.amount, orderCurrency(o))}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${o.status === 'Cancelled' ? 'bg-red-500/10 text-red-300' : o.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-violet-500/10 text-violet-300'}`}>
                  {o.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Dashboard
