import React, { useContext, useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { ShopContext } from '../context/ShopContext'
import { formatPrice, orderCurrency } from '../utils/currency'

// Shown after checkout. Success is only displayed once the backend has the order
// (and, for Stripe, has marked it paid) — never on the strength of the URL alone.
const OrderSuccess = () => {
  const { backendUrl, token, navigate } = useContext(ShopContext)
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const orderId = searchParams.get('orderId')

  const [status, setStatus] = useState('checking') // checking | confirmed | unconfirmed
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!token) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true })
      return
    }

    // COD response without an id (older backend): the place-order call already succeeded
    if (!orderId) {
      setStatus(location.state?.placed ? 'confirmed' : 'unconfirmed')
      return
    }

    let cancelled = false
    const confirmOrder = async () => {
      try {
        const res = await axios.post(backendUrl + '/api/order/userorders', {}, { headers: { token } })
        const found = res.data.success ? (res.data.orders || []).find((o) => o._id === orderId) : null
        const paidIfOnline = found && (found.paymentMethod !== 'Stripe' || found.payment)
        if (cancelled) return
        setOrder(found || null)
        setStatus(paidIfOnline ? 'confirmed' : 'unconfirmed')
      } catch (error) {
        console.error(error)
        if (!cancelled) setStatus('unconfirmed')
      }
    }
    confirmOrder()
    return () => { cancelled = true }
  }, [token, orderId, backendUrl, navigate, location.pathname, location.search, location.state])

  if (status === 'checking') {
    return (
      <div role='status' className='flex min-h-[60vh] flex-col items-center justify-center gap-4'>
        <div className='h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-ink' />
        <p className='text-sm text-neutral-600'>Confirming your order…</p>
      </div>
    )
  }

  const confirmed = status === 'confirmed'

  return (
    <div className='flex min-h-[70vh] items-start justify-center border-t border-neutral-200 py-12 sm:items-center sm:py-20'>
      <div className='w-full max-w-lg bg-white px-6 py-12 text-center shadow-[0_12px_40px_rgba(17,17,17,0.06)] ring-1 ring-neutral-200 sm:px-12 sm:py-14'>
        {confirmed ? (
          <div className='success-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink'>
            <svg viewBox='0 0 24 24' className='h-8 w-8' fill='none' aria-hidden='true'>
              <path className='success-check' d='M5 12.5l4.5 4.5L19 7.5' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </div>
        ) : (
          <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-neutral-300 text-2xl text-neutral-500' aria-hidden='true'>
            !
          </div>
        )}

        <h1 className='mt-8 font-display text-2xl text-ink sm:text-3xl' role={confirmed ? 'status' : 'alert'}>
          {confirmed ? 'Order placed' : 'We couldn’t confirm this order'}
        </h1>

        <p className='mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-600'>
          {confirmed
            ? 'Thank you for shopping with FOREVER. We’ve received your order and will let you know when it ships.'
            : 'If you completed a payment, please check My orders. If it isn’t listed, you haven’t been charged and can try checking out again.'}
        </p>

        {confirmed && (orderId || order) && (
          <dl className='mx-auto mt-8 max-w-xs divide-y divide-neutral-200 border-y border-neutral-200 text-left text-sm'>
            {orderId && (
              <div className='flex items-start justify-between gap-4 py-3'>
                <dt className='text-neutral-500'>Order ID</dt>
                <dd className='break-all text-right font-medium text-ink'>{orderId}</dd>
              </div>
            )}
            {order && (
              <>
                <div className='flex justify-between gap-4 py-3'>
                  <dt className='text-neutral-500'>Payment</dt>
                  <dd className='text-ink'>{order.paymentMethod === 'Stripe' ? 'Card (paid)' : 'Cash on delivery'}</dd>
                </div>
                <div className='flex justify-between gap-4 py-3'>
                  <dt className='text-neutral-500'>Total</dt>
                  <dd className='font-medium text-ink'>{formatPrice(order.amount, orderCurrency(order))}</dd>
                </div>
              </>
            )}
          </dl>
        )}

        <div className='mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center'>
          <Link to='/orders' className='btn-primary'>View my orders</Link>
          <Link to='/collection' className='btn-secondary'>Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}

export default OrderSuccess
