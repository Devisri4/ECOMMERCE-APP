import React, { useContext, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'
import OrderHistory from '../components/OrderHistory'
import AccountOverview from '../components/account/AccountOverview'
import SavedAddresses from '../components/account/SavedAddresses'
import WishlistPanel from '../components/account/WishlistPanel'
import PasswordChecklist from '../components/PasswordChecklist'
import { meetsPasswordRules } from '../utils/passwordRules'
import { friendlyError } from '../utils/messages'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'My orders' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'profile', label: 'My profile' },
]

// The shared demo shopper can't change its name or password (the API refuses), so say so up front
const DemoProfileNote = ({ profile }) => (
  <div className='border border-neutral-200 bg-white px-5 py-6 sm:px-8 sm:py-8'>
    <h2 className='font-display text-xl text-ink'>Personal details</h2>
    <dl className='mt-5 grid gap-4 text-sm sm:grid-cols-2'>
      <div><dt className='text-xs text-neutral-500'>Name</dt><dd className='mt-1 text-ink'>{profile.name}</dd></div>
      <div><dt className='text-xs text-neutral-500'>Email</dt><dd className='mt-1 break-all text-ink'>{profile.email}</dd></div>
    </dl>
    <p className='mt-6 border-t border-neutral-200 pt-5 text-sm leading-relaxed text-neutral-600'>
      This is a shared demo account, so its name and password can’t be changed. Create your own account to try editing
      your profile and password.
    </p>
  </div>
)

const inputClass =
  'w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink focus-visible:outline-none disabled:bg-neutral-50 disabled:text-neutral-500'
const labelClass = 'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-600'
const panelClass = 'border border-neutral-200 bg-white px-5 py-6 sm:px-8 sm:py-8'

/* ---------------- Profile details (name editable, email read-only) ---------------- */
const ProfileDetails = ({ profile, onSaved }) => {
  const { backendUrl, token, setUser } = useContext(ShopContext)
  const [name, setName] = useState(profile.name)
  const [saving, setSaving] = useState(false)

  const trimmed = name.trim()
  const unchanged = trimmed === profile.name
  const invalid = !trimmed || trimmed.length > 60

  const onSubmit = async (e) => {
    e.preventDefault()
    if (saving || unchanged || invalid) return
    setSaving(true)
    try {
      const res = await axios.post(backendUrl + '/api/user/profile/update', { name: trimmed }, { headers: { token } })
      if (res.data.success) {
        onSaved(res.data.user)
        setUser((current) => ({ ...current, ...res.data.user })) // header initials update straight away
        toast.success('Your profile has been updated.')
      } else {
        toast.error(friendlyError(res.data.message, 'We couldn’t update your profile. Please try again.'))
      }
    } catch (error) {
      toast.error(friendlyError(error, 'We couldn’t update your profile. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={panelClass} aria-labelledby='details-heading'>
      <h2 id='details-heading' className='font-display text-xl text-ink'>Personal details</h2>
      <div className='mt-6 grid gap-5 sm:grid-cols-2'>
        <div>
          <label htmlFor='account-name' className={labelClass}>Full name</label>
          <input
            id='account-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete='name'
            className={inputClass}
            aria-invalid={invalid}
            aria-describedby={invalid ? 'account-name-error' : undefined}
          />
          {invalid && <p id='account-name-error' className='mt-2 text-xs text-red-700'>Please enter your name.</p>}
        </div>
        <div>
          <label htmlFor='account-email' className={labelClass}>Email</label>
          <input id='account-email' value={profile.email} disabled className={inputClass} aria-describedby='account-email-hint' />
          <p id='account-email-hint' className='mt-2 text-xs text-neutral-500'>To change your email, please contact support.</p>
        </div>
      </div>
      <div className='mt-6 flex justify-end'>
        <button type='submit' disabled={saving || unchanged || invalid} className='btn-primary'>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

/* ---------------- Change password ---------------- */
const ChangePassword = () => {
  const { backendUrl, token } = useContext(ShopContext)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const errors = {}
  if (!currentPassword) errors.current = 'Please enter your current password.'
  if (!meetsPasswordRules(newPassword)) errors.new = 'Your new password doesn’t meet all the requirements below.'
  if (confirmPassword !== newPassword) errors.confirm = 'Passwords don’t match.'

  const onSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setAttempted(true)
    setFormError('')
    if (Object.keys(errors).length) return

    setSaving(true)
    try {
      const res = await axios.post(backendUrl + '/api/user/password', { currentPassword, newPassword }, { headers: { token } })
      if (res.data.success) {
        toast.success('Your password has been updated.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setAttempted(false)
      } else {
        setFormError(friendlyError(res.data.message, 'We couldn’t update your password. Please try again.'))
      }
    } catch (error) {
      setFormError(friendlyError(error, 'We couldn’t update your password. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const type = show ? 'text' : 'password'

  return (
    <form onSubmit={onSubmit} noValidate className={panelClass} aria-labelledby='password-heading'>
      <div className='flex items-center justify-between gap-4'>
        <h2 id='password-heading' className='font-display text-xl text-ink'>Change password</h2>
        <button
          type='button'
          onClick={() => setShow((v) => !v)}
          aria-pressed={show}
          className='text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 hover:text-ink'
        >
          {show ? 'Hide passwords' : 'Show passwords'}
        </button>
      </div>

      {formError && (
        <p role='alert' className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'>{formError}</p>
      )}

      <div className='mt-6 flex flex-col gap-5'>
        <div>
          <label htmlFor='current-password' className={labelClass}>Current password</label>
          <input
            id='current-password'
            type={type}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete='current-password'
            className={inputClass}
            aria-invalid={attempted && !!errors.current}
          />
          {attempted && errors.current && <p className='mt-2 text-xs text-red-700'>{errors.current}</p>}
        </div>
        <div className='grid gap-5 sm:grid-cols-2'>
          <div>
            <label htmlFor='new-password' className={labelClass}>New password</label>
            <input
              id='new-password'
              type={type}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete='new-password'
              className={inputClass}
              aria-invalid={attempted && !!errors.new}
              aria-describedby='new-password-rules'
            />
          </div>
          <div>
            <label htmlFor='confirm-password' className={labelClass}>Confirm new password</label>
            <input
              id='confirm-password'
              type={type}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete='new-password'
              className={inputClass}
              aria-invalid={attempted && !!errors.confirm}
            />
            {attempted && errors.confirm && <p className='mt-2 text-xs text-red-700'>{errors.confirm}</p>}
          </div>
        </div>
        <div>
          <PasswordChecklist id='new-password-rules' password={newPassword} />
          {attempted && errors.new && <p className='mt-2 text-xs text-red-700'>{errors.new}</p>}
        </div>
      </div>

      <div className='mt-6 flex justify-end'>
        <button type='submit' disabled={saving} className='btn-primary'>
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  )
}

/* ---------------- Page ---------------- */
const Account = () => {
  const { backendUrl, token, navigate, logout } = useContext(ShopContext)
  const [searchParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'

  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('')

  const loadProfile = async () => {
    setStatus('loading')
    try {
      const res = await axios.post(backendUrl + '/api/user/profile', {}, { headers: { token } })
      if (res.data.success) {
        setProfile(res.data.user)
        setStatus('ready')
      } else {
        setErrorMessage(friendlyError(res.data.message, 'We couldn’t load your account. Please try again.'))
        setStatus('error')
      }
    } catch (error) {
      setErrorMessage(friendlyError(error, 'We couldn’t load your account. Please try again.'))
      setStatus('error')
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=/account', { replace: true })
      return
    }
    loadProfile()
  }, [token])

  if (!token) return null

  return (
    <div className='border-t border-neutral-200 pt-12 sm:pt-14'>
      {/* Greeting */}
      <div className='mb-10'>
        <p className='eyebrow text-neutral-500'>My account</p>
        {status === 'loading' ? (
          <div aria-hidden='true' className='mt-4 h-9 w-64 animate-pulse bg-neutral-200/70' />
        ) : (
          <h1 className='mt-3 font-display text-3xl text-ink sm:text-4xl'>
            {profile ? `Hello, ${profile.name}` : 'Your account'}
          </h1>
        )}
        {profile && <p className='mt-2 text-sm text-neutral-600'>{profile.email}</p>}
      </div>

      <div className='grid gap-8 md:grid-cols-[220px_1fr] md:gap-12'>
        {/* Account navigation */}
        <nav aria-label='Account'>
          <ul className='no-scrollbar flex gap-2 overflow-x-auto border-b border-neutral-200 md:flex-col md:gap-0 md:border-b-0 md:border-l'>
            {TABS.map((t) => {
              const active = t.id === tab
              return (
                <li key={t.id}>
                  <Link
                    to={t.id === 'overview' ? '/account' : `/account?tab=${t.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={`-mb-px block whitespace-nowrap border-b-2 px-1 py-3 text-xs uppercase tracking-[0.18em] transition-colors md:-ml-px md:mb-0 md:border-b-0 md:border-l-2 md:px-5 ${active ? 'border-ink text-ink' : 'border-transparent text-neutral-500 hover:text-ink'}`}
                  >
                    {t.label}
                  </Link>
                </li>
              )
            })}
            <li>
              <button
                type='button'
                onClick={logout}
                className='-mb-px block whitespace-nowrap border-b-2 border-transparent px-1 py-3 text-left text-xs uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:text-ink md:-ml-px md:mb-0 md:border-b-0 md:border-l-2 md:px-5'
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>

        {/* Panel */}
        {/* Not a live region: re-reading whole order lists on every tab change is noise for screen readers */}
        <section>
          {tab === 'orders' ? (
            <OrderHistory />
          ) : tab === 'wishlist' ? (
            <WishlistPanel />
          ) : status === 'loading' ? (
            <div role='status' className='flex flex-col gap-6'>
              <span className='sr-only'>Loading your account…</span>
              <div aria-hidden='true' className='h-56 animate-pulse border border-neutral-200 bg-neutral-100/70' />
              <div aria-hidden='true' className='h-72 animate-pulse border border-neutral-200 bg-neutral-100/70' />
            </div>
          ) : status === 'error' ? (
            <div role='alert' className='border border-neutral-200 bg-white px-6 py-14 text-center'>
              <p className='text-sm text-neutral-600'>{errorMessage}</p>
              <button type='button' onClick={loadProfile} className='btn-secondary mt-6'>Try again</button>
            </div>
          ) : tab === 'overview' ? (
            <AccountOverview demo={profile.demo} />
          ) : tab === 'addresses' ? (
            <SavedAddresses demo={profile.demo} />
          ) : profile.demo ? (
            <DemoProfileNote profile={profile} />
          ) : (
            <div className='flex flex-col gap-6'>
              <ProfileDetails key={profile.name} profile={profile} onSaved={setProfile} />
              <ChangePassword />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Account
