import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { ShopContext } from '../../context/ShopContext'
import AddressFields from '../AddressFields'
import { DELIVERY_FIELDS, EMPTY_ADDRESS, toAddressForm, trimAddress, validateAddress } from '../../utils/deliveryFields'
import { friendlyError } from '../../utils/messages'

const MAX_ADDRESSES = 5 // same limit as backend/controllers/accountController.js
const panelClass = 'border border-neutral-200 bg-white px-5 py-6 sm:px-8 sm:py-8'
const linkButton = 'text-xs uppercase tracking-[0.16em] text-neutral-600 underline-offset-4 hover:text-ink hover:underline disabled:opacity-40'

// Add / edit form. `editing` is the saved address being changed, or null for a new one.
const AddressForm = ({ editing, isFirst, onCancel, onSaved }) => {
  const { backendUrl, token } = useContext(ShopContext)
  const [values, setValues] = useState(editing ? toAddressForm(editing) : EMPTY_ADDRESS)
  const [label, setLabel] = useState(editing?.label || '')
  const [makeDefault, setMakeDefault] = useState(Boolean(editing?.isDefault) || isFirst)
  const [touched, setTouched] = useState({})
  const [saving, setSaving] = useState(false)
  const errors = validateAddress(values)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    if (Object.keys(errors).length) {
      setTouched(Object.fromEntries(DELIVERY_FIELDS.map((f) => [f.name, true])))
      document.getElementById(`address-${DELIVERY_FIELDS.find((f) => errors[f.name]).name}`)?.focus()
      return
    }
    setSaving(true)
    try {
      const body = { address: trimAddress(values), label: label.trim(), makeDefault, ...(editing ? { id: editing._id } : {}) }
      const res = await axios.post(backendUrl + '/api/user/addresses/save', body, { headers: { token } })
      if (res.data.success) {
        toast.success(editing ? 'Address updated.' : 'Address saved.')
        onSaved(res.data.addresses)
      } else {
        toast.error(friendlyError(res.data.message, 'We couldn’t save the address. Please try again.'))
      }
    } catch (error) {
      toast.error(friendlyError(error, 'We couldn’t save the address. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={saving} className={panelClass} aria-labelledby='address-form-heading'>
      <h2 id='address-form-heading' className='font-display text-xl text-ink'>{editing ? 'Edit address' : 'Add an address'}</h2>
      <div className='mt-6'>
        <label htmlFor='address-label' className='mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-600'>
          Name this address <span className='normal-case tracking-normal text-neutral-400'>(optional, e.g. Home or Work)</span>
        </label>
        <input
          id='address-label'
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 30))}
          className='mb-5 w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink focus-visible:outline-none sm:w-1/2'
        />
        <AddressFields
          idPrefix='address'
          values={values}
          errors={errors}
          touched={touched}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
          onBlur={(name) => setTouched((prev) => ({ ...prev, [name]: true }))}
        />
      </div>
      <label className='mt-6 flex cursor-pointer items-center gap-3 text-sm text-neutral-700'>
        <input type='checkbox' checked={makeDefault} disabled={isFirst} onChange={(e) => setMakeDefault(e.target.checked)} className='h-4 w-4 accent-ink' />
        Use as my default delivery address
      </label>
      <div className='mt-8 flex flex-wrap items-center gap-4'>
        <button type='submit' disabled={saving} className='btn-primary'>{saving ? 'Saving…' : 'Save address'}</button>
        <button type='button' onClick={onCancel} className={linkButton}>Cancel</button>
      </div>
    </form>
  )
}

const SavedAddresses = ({ demo = false }) => {
  const { backendUrl, token } = useContext(ShopContext)
  const [addresses, setAddresses] = useState(null)
  const [error, setError] = useState(false)
  const [form, setForm] = useState(null) // null | { editing: address | null }
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setError(false)
    try {
      const res = await axios.post(backendUrl + '/api/user/addresses', {}, { headers: { token } })
      if (res.data.success) setAddresses(res.data.addresses)
      else setError(true)
    } catch {
      setError(true)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const post = async (path, body, success) => {
    setBusyId(body.id)
    try {
      const res = await axios.post(backendUrl + path, body, { headers: { token } })
      if (res.data.success) {
        setAddresses(res.data.addresses)
        toast.success(success)
      } else {
        toast.error(friendlyError(res.data.message, 'Something went wrong. Please try again.'))
      }
    } catch (err) {
      toast.error(friendlyError(err, 'Something went wrong. Please try again.'))
    } finally {
      setBusyId(null)
    }
  }

  if (demo) {
    return (
      <div className={panelClass}>
        <h2 className='font-display text-xl text-ink'>Saved addresses</h2>
        <p className='mt-3 text-sm leading-relaxed text-neutral-600'>
          This is a shared demo account, so it can’t store addresses: the next visitor would see them.
          Create your own account to save addresses and pick them at checkout.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div role='alert' className={`${panelClass} text-center`}>
        <p className='text-sm text-neutral-600'>We couldn’t load your addresses.</p>
        <button type='button' onClick={load} className='btn-secondary mt-6'>Try again</button>
      </div>
    )
  }

  if (!addresses) {
    return <div role='status' className='h-40 animate-pulse bg-neutral-200/70'><span className='sr-only'>Loading addresses…</span></div>
  }

  if (form) {
    return (
      <AddressForm
        key={form.editing?._id || 'new'}
        editing={form.editing}
        isFirst={addresses.length === 0}
        onCancel={() => setForm(null)}
        onSaved={(next) => { setAddresses(next); setForm(null) }}
      />
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <p className='text-sm text-neutral-600'>
          {addresses.length ? `${addresses.length} of ${MAX_ADDRESSES} addresses saved` : 'No saved addresses yet.'}
        </p>
        <button type='button' onClick={() => setForm({ editing: null })} disabled={addresses.length >= MAX_ADDRESSES} className='btn-primary'>
          Add an address
        </button>
      </div>

      {addresses.length > 0 && (
        <ul className='grid gap-4 sm:grid-cols-2'>
          {addresses.map((a) => (
            <li key={a._id} className={`${panelClass} flex flex-col`}>
              <div className='flex items-center gap-3'>
                <p className='font-medium text-ink'>{a.label || 'Address'}</p>
                {a.isDefault && <span className='bg-ink px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white'>Default</span>}
              </div>
              <address className='mt-3 flex-1 text-sm not-italic leading-relaxed text-neutral-600'>
                {a.firstName} {a.lastName}<br />
                {a.street}<br />
                {a.city}, {a.state} {a.zipcode}<br />
                {a.country}<br />
                {a.phone}
              </address>
              <div className='mt-5 flex flex-wrap gap-4'>
                <button type='button' onClick={() => setForm({ editing: a })} className={linkButton}>Edit</button>
                {!a.isDefault && (
                  <button
                    type='button'
                    disabled={busyId === a._id}
                    onClick={() => post('/api/user/addresses/save', { id: a._id, address: toAddressForm(a), label: a.label, makeDefault: true }, 'Default address updated.')}
                    className={linkButton}
                  >
                    Make default
                  </button>
                )}
                <button
                  type='button'
                  disabled={busyId === a._id}
                  onClick={() => post('/api/user/addresses/remove', { id: a._id }, 'Address removed.')}
                  className={linkButton}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SavedAddresses
