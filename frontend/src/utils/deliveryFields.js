// Delivery address fields, shared by checkout and the account's saved addresses.
// Same rules as the backend (orderController.validateAddress). Field names match the address
// object stored on each order. `validate` returns an error message or ''; `sanitize` strips
// characters as the user types.

// Letters (incl. accented), spaces, apostrophes, dots and hyphens — e.g. "O'Neil", "St. Louis", "Jean-Luc"
const NAME_LIKE = /^[\p{L}][\p{L}\s'.-]*$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const nameRule = (label, min = 2) => (v) =>
  !v ? `Please enter your ${label}.`
    : v.length < min || v.length > 50 ? `${label[0].toUpperCase() + label.slice(1)} must be ${min}–50 characters.`
    : !NAME_LIKE.test(v) ? `${label[0].toUpperCase() + label.slice(1)} can only contain letters, spaces, hyphens and apostrophes.`
    : ''

export const DELIVERY_FIELDS = [
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

export const EMPTY_ADDRESS = Object.fromEntries(DELIVERY_FIELDS.map((f) => [f.name, '']))

// Only the delivery fields of a saved address (drops _id, label, isDefault), as form values
export const toAddressForm = (address = {}) =>
  Object.fromEntries(DELIVERY_FIELDS.map((f) => [f.name, typeof address[f.name] === 'string' ? address[f.name] : '']))

export const trimAddress = (values) => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]))

// { field: message } for each invalid field
export const validateAddress = (data) =>
  Object.fromEntries(DELIVERY_FIELDS.map((f) => [f.name, f.validate((data[f.name] || '').trim())]).filter(([, msg]) => msg))

export const sameAddress = (a, b) => DELIVERY_FIELDS.every((f) => (a[f.name] || '').trim() === (b[f.name] || '').trim())
