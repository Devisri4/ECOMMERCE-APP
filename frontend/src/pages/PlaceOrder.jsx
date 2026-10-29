import React, { useState, useContext, useEffect } from 'react'
import Title from '../components/Title'
import CartTotal from '../components/CartTotal'
import AddressFields from '../components/AddressFields'
import { assets } from '../assets/assets'
import { ShopContext } from '../context/ShopContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { friendlyError } from '../utils/messages'
import { DELIVERY_FIELDS, EMPTY_ADDRESS, sameAddress, toAddressForm, trimAddress, validateAddress } from '../utils/deliveryFields'

// Only methods with a working backend flow. UPI/Razorpay are not implemented server-side, so they are not offered.
const PAYMENT_METHODS = [
  { id: 'stripe', label: 'Credit / Debit card', description: 'Pay securely with Stripe', logo: assets.stripe_logo },
  { id: 'cod', label: 'Cash on delivery', description: 'Pay when your order arrives' },
]

const MAX_ADDRESSES = 5 // same limit as backend/controllers/accountController.js

// Shown and sent for the shared demo shopper; the server stores its own copy (orderController.DEMO_ORDER_ADDRESS)
const DEMO_ADDRESS = {
  firstName: 'Demo', lastName: 'Shopper', email: 'demo@forever-store.example', street: '3rd Floor, Road No. 12, Banjara Hills',
  city: 'Hyderabad', state: 'Telangana', zipcode: '500034', country: 'India', phone: '9000000000',
}

const PlaceOrder = () => {

  const [method, setMethod] = useState('cod')
  const [placing, setPlacing] = useState(false)
  const {
    navigate,
    backendUrl,
    token,
    cartItems,
    setCartItems,
    getCartAmount,
    delivery_fee,
    products,
    productsLoading,
    cartLoaded
  } = useContext(ShopContext)

  // Bag lines for products that still exist (deleted products are skipped, as on the Cart page)
  const bagLines = Object.entries(cartItems).filter(
    ([id, sizes]) => products.some((p) => p._id === id) && Object.values(sizes).some((q) => q > 0)
  ).length

  const [formData, setFormData] = useState(EMPTY_ADDRESS)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [saveAddress, setSaveAddress] = useState(false)
  const [demo, setDemo] = useState(false) // shared demo shopper: the server stores a sample address instead

  useEffect(() => {
    if (!token) return
    axios.post(backendUrl + '/api/user/profile', {}, { headers: { token } })
      .then((res) => {
        if (!res.data.success || !res.data.user.demo) return
        setDemo(true)
        setFormData(DEMO_ADDRESS)
      })
      .catch(() => {})
  }, [token, backendUrl])

  // Checkout needs an account: send guests to the customer login, then back here.
  // The guest cart stays in localStorage and is merged into the account cart on login.
  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=/place-order', { replace: true })
    }
  }, [token, navigate])

  // Saved addresses: the default one fills the form so returning customers can check out in one step
  useEffect(() => {
    if (!token) return
    axios.post(backendUrl + '/api/user/addresses', {}, { headers: { token } })
      .then((res) => {
        if (!res.data.success) return
        setSavedAddresses(res.data.addresses)
        const preferred = res.data.addresses.find((a) => a.isDefault) || res.data.addresses[0]
        if (preferred) setFormData((current) => (sameAddress(current, EMPTY_ADDRESS) ? toAddressForm(preferred) : current))
      })
      .catch(() => {})
  }, [token, backendUrl])

  const [touched, setTouched] = useState({})   // fields the user has left; errors show after blur or submit
  const errors = validateAddress(formData)
  const matchesSaved = savedAddresses.some((a) => sameAddress(a, formData))
  const canSave = !demo && !matchesSaved && savedAddresses.length < MAX_ADDRESSES

  const onFieldChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }))
  const onFieldBlur = (name) => setTouched(prev => ({ ...prev, [name]: true }))

  // Saving the address is a convenience: an error here never blocks the order
  const saveCurrentAddress = async () => {
    if (!saveAddress || !canSave) return
    try {
      const res = await axios.post(backendUrl + '/api/user/addresses/save', { address: trimAddress(formData) }, { headers: { token } })
      if (!res.data.success) toast.info(friendlyError(res.data.message, 'Your address wasn’t saved, but your order went through.'))
    } catch {
      // ignore — the order itself is what matters here
    }
  }

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    if (placing) return // block double submits while a request is in flight

    if (Object.keys(errors).length > 0) {
      setTouched(Object.fromEntries(DELIVERY_FIELDS.map((f) => [f.name, true])))
      const first = DELIVERY_FIELDS.find((f) => errors[f.name])
      document.getElementById(`checkout-${first.name}`)?.focus()
      toast.error('Please check the highlighted delivery details.', { toastId: 'checkout-invalid' })
      return
    }

    if (!PAYMENT_METHODS.some((m) => m.id === method)) {
      toast.error('Please choose a payment method.')
      return
    }

    setPlacing(true)
    let redirecting = false

    try {
      let orderItems = []

      for (const items in cartItems) {
        for (const item in cartItems[items]) {
          if (cartItems[items][item] > 0) {
            const itemInfo = structuredClone(
              products.find(product => product._id === items)
            )
            if (itemInfo) {
              itemInfo.size = item
              itemInfo.quantity = cartItems[items][item]
              orderItems.push(itemInfo)
            }
          }
        }
      }

      if (orderItems.length === 0) {
        toast.error('Your bag is empty. Add an item before checking out.')
        return
      }

      let orderData = {
        address: trimAddress(formData),
        items: orderItems,
        amount: getCartAmount() + delivery_fee
      }

      switch (method) {

        case 'cod': {
          const response = await axios.post(
            backendUrl + '/api/order/place',
            orderData,
            { headers: { token } }
          )

          // Confirmation is shown only after the backend reports success
          if (response.data.success) {
            await saveCurrentAddress()
            setCartItems({})
            const orderId = response.data.orderId
            navigate(orderId ? `/order-success?orderId=${orderId}` : '/order-success', {
              replace: true,
              state: { placed: true },
            })
          } else {
            toast.error(friendlyError(response.data.message, 'We couldn’t place your order. Please try again.'))
          }
          break
        }

        case 'stripe': {
          const responseStripe = await axios.post(
            backendUrl + '/api/order/stripe',
            orderData,
            { headers: { token } }
          )

          if (responseStripe.data.success) {
            await saveCurrentAddress()
            redirecting = true // keep the button locked while the browser leaves for Stripe
            window.location.replace(responseStripe.data.session_url)
          } else {
            toast.error(friendlyError(responseStripe.data.message, 'We couldn’t start the card payment. Please try again or choose cash on delivery.'))
          }
          break
        }

        default:
          break
      }

    } catch (error) {
      console.log(error)
      toast.error(friendlyError(error, 'We couldn’t place your order. Please try again.'))
    } finally {
      if (!redirecting) setPlacing(false)
    }
  }

  if (!token) return null

  // Wait for the products and the account bag, so a refresh never shows a ₹0 total or "bag empty" by mistake
  if (productsLoading || !cartLoaded) {
    return (
      <div role='status' className='grid gap-12 border-t border-neutral-200 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_420px]'>
        <span className='sr-only'>Loading checkout…</span>
        <div aria-hidden='true' className='h-96 animate-pulse bg-neutral-200/70' />
        <div aria-hidden='true' className='h-64 animate-pulse bg-neutral-200/70' />
      </div>
    )
  }

  if (bagLines === 0) {
    return (
      <div className='border-t border-neutral-200 py-24 text-center'>
        <p className='font-display text-3xl text-ink'>Your bag is empty</p>
        <p className='mt-3 text-sm text-neutral-600'>Add something you love, then come back to check out.</p>
        <button type='button' onClick={() => navigate('/collection')} className='btn-primary mt-8'>Browse the collection</button>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmitHandler}
      noValidate
      aria-busy={placing}
      className='grid gap-12 border-t border-neutral-200 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_420px]'
    >
      <div>
        <div className='mb-6 text-xl sm:text-2xl'>
          <Title text1={'DELIVERY'} text2={'INFORMATION'} />
        </div>

        {demo && (
          <p role='status' className='mb-8 border border-neutral-200 bg-white px-5 py-4 text-sm leading-relaxed text-neutral-700'>
            You’re using the shared demo account, so this order uses a sample address. Your own details are never
            stored here. Card payments run in Stripe test mode: use the card 4242 4242 4242 4242.
          </p>
        )}

        {/* Saved addresses: picking one fills the form below (still editable) */}
        {savedAddresses.length > 0 && (
          <fieldset className='mb-8'>
            <legend className='mb-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-600'>Saved addresses</legend>
            <div className='grid gap-3 sm:grid-cols-2'>
              {savedAddresses.map((a) => {
                const selected = sameAddress(a, formData)
                return (
                  <label
                    key={a._id}
                    className={`flex cursor-pointer gap-3 border bg-white px-4 py-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${selected ? 'border-ink' : 'border-neutral-300 hover:border-neutral-500'}`}
                  >
                    <input
                      type='radio'
                      name='savedAddress'
                      checked={selected}
                      onChange={() => { setFormData(toAddressForm(a)); setTouched({}) }}
                      className='mt-1 h-4 w-4 shrink-0 accent-ink'
                    />
                    <span className='min-w-0'>
                      <span className='block font-medium text-ink'>
                        {a.label || `${a.firstName} ${a.lastName}`}
                        {a.isDefault && <span className='ml-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500'>Default</span>}
                      </span>
                      <span className='block truncate text-neutral-600'>{a.street}, {a.city} {a.zipcode}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <button
              type='button'
              onClick={() => { setFormData(EMPTY_ADDRESS); setTouched({}) }}
              className='mt-3 text-xs uppercase tracking-[0.16em] text-neutral-600 underline-offset-4 hover:text-ink hover:underline'
            >
              Use a new address
            </button>
          </fieldset>
        )}

        <AddressFields
          idPrefix='checkout'
          values={formData}
          errors={errors}
          touched={touched}
          onChange={onFieldChange}
          onBlur={onFieldBlur}
        />

        {canSave && (
          <label className='mt-6 flex cursor-pointer items-center gap-3 text-sm text-neutral-700'>
            <input type='checkbox' checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className='h-4 w-4 accent-ink' />
            Save this address to my account for next time
          </label>
        )}
      </div>

      <div className='lg:sticky lg:top-28 lg:self-start'>
        <div className='border border-neutral-200 bg-white px-6 py-6'>
          <CartTotal />
        </div>

        <div className='mt-10'>
          <Title text1={'PAYMENT'} text2={'METHOD'} size='sm' />

          {/* Native radios: keyboard + screen reader support, one choice at a time */}
          <fieldset className='mt-2'>
            <legend className='sr-only'>Payment method</legend>
            <div className='flex flex-col gap-3'>
              {PAYMENT_METHODS.map((option) => {
                const selected = method === option.id
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-4 border bg-white px-4 py-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${selected ? 'border-ink' : 'border-neutral-300 hover:border-neutral-500'}`}
                  >
                    <input
                      type='radio'
                      name='paymentMethod'
                      value={option.id}
                      checked={selected}
                      onChange={() => setMethod(option.id)}
                      className='sr-only'
                    />
                    <span
                      aria-hidden='true'
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-ink' : 'border-neutral-400'}`}
                    >
                      {selected && <span className='h-2 w-2 rounded-full bg-ink' />}
                    </span>
                    <span className='flex-1'>
                      <span className='block text-sm font-medium text-ink'>{option.label}</span>
                      <span className='block text-xs text-neutral-500'>{option.description}</span>
                    </span>
                    {option.logo && <img className='h-5 w-auto' src={option.logo} alt='' />}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className='mt-8'>
            <button type='submit' disabled={placing} className='btn-primary w-full py-4'>
              {placing
                ? (method === 'stripe' ? 'Redirecting to payment…' : 'Placing order…')
                : 'Place order'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default PlaceOrder
