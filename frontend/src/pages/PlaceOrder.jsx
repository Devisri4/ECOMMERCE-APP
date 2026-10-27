import React, { useState, useContext, useEffect } from 'react'
import Title from '../components/Title'
import CartTotal from '../components/CartTotal'
import { assets } from '../assets/assets'
import { ShopContext } from '../context/ShopContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { friendlyError } from '../utils/messages'

// Only methods with a working backend flow. UPI/Razorpay are not implemented server-side, so they are not offered.
const PAYMENT_METHODS = [
  { id: 'stripe', label: 'Credit / Debit card', description: 'Pay securely with Stripe', logo: assets.stripe_logo },
  { id: 'cod', label: 'Cash on delivery', description: 'Pay when your order arrives' },
]

// Letters (incl. accented), spaces, apostrophes, dots and hyphens — e.g. "O'Neil", "St. Louis", "Jean-Luc"
const NAME_LIKE = /^[\p{L}][\p{L}\s'.-]*$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const nameRule = (label, min = 2) => (v) =>
  !v ? `Please enter your ${label}.`
    : v.length < min || v.length > 50 ? `${label[0].toUpperCase() + label.slice(1)} must be ${min}–50 characters.`
    : !NAME_LIKE.test(v) ? `${label[0].toUpperCase() + label.slice(1)} can only contain letters, spaces, hyphens and apostrophes.`
    : ''

// Field names match the address object the backend already stores on each order.
// `validate` returns an error message or '' ; `sanitize` strips characters as the user types.
const DELIVERY_FIELDS = [
  { name: 'firstName', label: 'First name', half: true, input: { type: 'text', autoComplete: 'given-name', maxLength: 50 }, validate: nameRule('first name') },
  { name: 'lastName', label: 'Last name', half: true, input: { type: 'text', autoComplete: 'family-name', maxLength: 50 }, validate: nameRule('last name', 1) },
  {
    name: 'email', label: 'Email address', input: { type: 'email', autoComplete: 'email', inputMode: 'email' },
    validate: (v) => (!v ? 'Please enter your email address.' : !EMAIL_PATTERN.test(v) ? 'Enter a valid email, like name@example.com.' : ''),
  },
  {
    name: 'street', label: 'Street address', input: { type: 'text', autoComplete: 'street-address', maxLength: 120 },
    validate: (v) => (!v ? 'Please enter your street address.' : v.length < 5 || !/\p{L}/u.test(v) ? 'Enter a full street address (house number and street).' : ''),
  },
  { name: 'city', label: 'City', half: true, input: { type: 'text', autoComplete: 'address-level2', maxLength: 50 }, validate: nameRule('city') },
  { name: 'state', label: 'State', half: true, input: { type: 'text', autoComplete: 'address-level1', maxLength: 50 }, validate: nameRule('state') },
  {
    name: 'zipcode', label: 'ZIP / Postal code', half: true,
    input: { type: 'text', inputMode: 'numeric', autoComplete: 'postal-code', maxLength: 10, placeholder: 'e.g. 501506' },
    sanitize: (v) => v.replace(/[^0-9]/g, ''),
    validate: (v) => (!v ? 'Please enter your ZIP / postal code.' : !/^[0-9]{4,10}$/.test(v) ? 'ZIP / postal code must be 4–10 digits.' : ''),
  },
  { name: 'country', label: 'Country', half: true, input: { type: 'text', autoComplete: 'country-name', maxLength: 50 }, validate: nameRule('country') },
  {
    name: 'phone', label: 'Mobile number', input: { type: 'tel', inputMode: 'numeric', autoComplete: 'tel-national', placeholder: 'e.g. 9876543210' },
    // Indian mobile: exactly 10 digits starting with 6–9 (same rule as the backend). Non-digits are
    // stripped, a pasted +91 / 0 prefix is dropped, and input stops at 10 digits. (No maxLength:
    // it would cut a pasted "+91 98765 43210" before the symbols are removed.)
    sanitize: (v) => {
      let digits = v.replace(/\D/g, '')
      if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
      else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
      return digits.slice(0, 10)
    },
    validate: (v) =>
      !v ? 'Please enter your mobile number.'
        : !/^[6-9][0-9]{9}$/.test(v) ? 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.'
        : '',
  },
]

const validateAddress = (data) =>
  Object.fromEntries(DELIVERY_FIELDS.map((f) => [f.name, f.validate(data[f.name].trim())]).filter(([, msg]) => msg))

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
    products
  } = useContext(ShopContext)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
    phone: ''
  })

  // Checkout needs an account: send guests to the customer login, then back here.
  // The guest cart stays in localStorage and is merged into the account cart on login.
  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=/place-order', { replace: true })
    }
  }, [token, navigate])

  const [touched, setTouched] = useState({})   // fields the user has left; errors show after blur or submit
  const errors = validateAddress(formData)

  const onChangeHandler = (event) => {
    const { name, value } = event.target
    const field = DELIVERY_FIELDS.find((f) => f.name === name)
    setFormData(prev => ({ ...prev, [name]: field?.sanitize ? field.sanitize(value) : value }))
  }

  const onBlurHandler = (event) => {
    const { name } = event.target
    setTouched(prev => ({ ...prev, [name]: true }))
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
        address: Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v.trim()])),
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

        <div className='grid grid-cols-2 gap-x-4 gap-y-5'>
          {DELIVERY_FIELDS.map((field) => {
            const error = touched[field.name] ? errors[field.name] : ''
            return (
              <div key={field.name} className={field.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
                <label htmlFor={`checkout-${field.name}`} className='mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-600'>
                  {field.label}
                </label>
                <input
                  id={`checkout-${field.name}`}
                  required
                  onChange={onChangeHandler}
                  onBlur={onBlurHandler}
                  name={field.name}
                  value={formData[field.name]}
                  aria-invalid={!!error}
                  aria-describedby={error ? `checkout-${field.name}-error` : undefined}
                  className={`w-full border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-neutral-400 focus-visible:outline-none ${error ? 'border-red-700 focus:border-red-700' : 'border-neutral-300 focus:border-ink'}`}
                  {...field.input}
                />
                {error && <p id={`checkout-${field.name}-error`} className='mt-2 text-xs text-red-700'>{error}</p>}
              </div>
            )
          })}
        </div>
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
