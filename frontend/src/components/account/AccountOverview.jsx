import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { ShopContext } from '../../context/ShopContext'
import { formatPrice, orderCurrency } from '../../utils/currency'

const panelClass = 'border border-neutral-200 bg-white px-5 py-6 sm:px-8 sm:py-8'
const formatDate = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const Stat = ({ label, value, to, hint }) => (
  <Link to={to} className='group border border-neutral-200 bg-white px-5 py-5 transition-colors hover:border-ink'>
    <p className='eyebrow text-neutral-500'>{label}</p>
    <p className='mt-3 text-2xl font-medium text-ink'>{value}</p>
    {hint && <p className='mt-1 text-xs text-neutral-500'>{hint}</p>}
  </Link>
)

// First account tab: a summary built from the customer's orders, wishlist and saved addresses
const AccountOverview = () => {
  const { backendUrl, token, wishlist } = useContext(ShopContext)
  const [orders, setOrders] = useState(null)
  const [addressCount, setAddressCount] = useState(null)

  useEffect(() => {
    axios.post(backendUrl + '/api/order/userorders', {}, { headers: { token } })
      .then((res) => setOrders(res.data.success ? res.data.orders : []))
      .catch(() => setOrders([]))
    axios.post(backendUrl + '/api/user/addresses', {}, { headers: { token } })
      .then((res) => setAddressCount(res.data.success ? res.data.addresses.length : 0))
      .catch(() => setAddressCount(0))
  }, [backendUrl, token])

  if (!orders) {
    return (
      <div role='status' className='flex flex-col gap-6'>
        <span className='sr-only'>Loading your account…</span>
        <div aria-hidden='true' className='h-28 animate-pulse bg-neutral-200/70' />
        <div aria-hidden='true' className='h-40 animate-pulse bg-neutral-200/70' />
      </div>
    )
  }

  const active = orders.filter((o) => o.status !== 'Cancelled')
  // Never mix currencies: only rupee orders count towards "spent" (older test orders were in USD)
  const spent = active.filter((o) => orderCurrency(o) === 'INR').reduce((sum, o) => sum + o.amount, 0)
  const latest = orders[0] // the API returns newest first

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid gap-4 sm:grid-cols-3'>
        <Stat label='Orders' value={active.length} to='/account?tab=orders' hint={latest ? `Last on ${formatDate(latest.date)}` : 'No orders yet'} />
        <Stat label='Total spent' value={formatPrice(spent, 'INR')} to='/account?tab=orders' hint='Excludes cancelled orders' />
        <Stat label='Wishlist' value={wishlist.length} to='/account?tab=wishlist' hint={wishlist.length === 1 ? '1 saved item' : `${wishlist.length} saved items`} />
      </div>

      <div className={panelClass}>
        <div className='flex flex-wrap items-baseline justify-between gap-3'>
          <h2 className='font-display text-xl text-ink'>Latest order</h2>
          {latest && <Link to='/account?tab=orders' className='text-xs uppercase tracking-[0.16em] text-neutral-600 underline-offset-4 hover:text-ink hover:underline'>All orders</Link>}
        </div>
        {latest ? (
          <div className='mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm'>
            <div>
              <p className='text-xs text-neutral-500'>Order</p>
              <p className='font-mono text-ink'>#{latest._id.slice(-8).toUpperCase()}</p>
            </div>
            <div>
              <p className='text-xs text-neutral-500'>Placed</p>
              <p className='text-ink'>{formatDate(latest.date)}</p>
            </div>
            <div>
              <p className='text-xs text-neutral-500'>Items</p>
              <p className='text-ink'>{latest.items.reduce((n, i) => n + i.quantity, 0)}</p>
            </div>
            <div>
              <p className='text-xs text-neutral-500'>Total</p>
              <p className='text-ink'>{formatPrice(latest.amount, orderCurrency(latest))}</p>
            </div>
            <span className='ml-auto border border-neutral-300 px-3 py-1 text-xs uppercase tracking-[0.14em] text-ink'>{latest.status}</span>
          </div>
        ) : (
          <div className='mt-4 text-sm text-neutral-600'>
            <p>You haven’t placed an order yet.</p>
            <Link to='/collection' className='btn-primary mt-5'>Start shopping</Link>
          </div>
        )}
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Link to='/account?tab=addresses' className={`${panelClass} transition-colors hover:border-ink`}>
          <p className='font-medium text-ink'>Saved addresses</p>
          <p className='mt-1 text-sm text-neutral-600'>
            {addressCount ? `${addressCount} saved. Pick one at checkout to skip typing.` : 'Save an address to check out faster.'}
          </p>
        </Link>
        <Link to='/account?tab=profile' className={`${panelClass} transition-colors hover:border-ink`}>
          <p className='font-medium text-ink'>Profile &amp; password</p>
          <p className='mt-1 text-sm text-neutral-600'>Update your name or change your password.</p>
        </Link>
      </div>
    </div>
  )
}

export default AccountOverview
