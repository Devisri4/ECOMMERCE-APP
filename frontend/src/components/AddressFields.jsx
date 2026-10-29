import React from 'react'
import { DELIVERY_FIELDS } from '../utils/deliveryFields'

// The delivery address inputs (checkout and saved addresses). The parent owns the values;
// errors show for fields in `touched` (after blur or a submit attempt).
const AddressFields = ({ idPrefix, values, errors, touched, onChange, onBlur }) => (
  <div className='grid grid-cols-2 gap-x-4 gap-y-5'>
    {DELIVERY_FIELDS.map((field) => {
      const id = `${idPrefix}-${field.name}`
      const error = touched[field.name] ? errors[field.name] : ''
      return (
        <div key={field.name} className={field.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
          <label htmlFor={id} className='mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-600'>
            {field.label}
          </label>
          <input
            id={id}
            required
            name={field.name}
            value={values[field.name]}
            onChange={(e) => onChange(field.name, field.sanitize ? field.sanitize(e.target.value) : e.target.value)}
            onBlur={() => onBlur(field.name)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`w-full border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-neutral-400 focus-visible:outline-none ${error ? 'border-red-700 focus:border-red-700' : 'border-neutral-300 focus:border-ink'}`}
            {...field.input}
          />
          {error && <p id={`${id}-error`} className='mt-2 text-xs text-red-700'>{error}</p>}
        </div>
      )
    })}
  </div>
)

export default AddressFields
