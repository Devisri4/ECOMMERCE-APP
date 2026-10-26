import axios from 'axios'
import React, { useState } from 'react'
import {backendUrl} from '../App'
import { toast } from 'react-toastify'
import { friendlyError } from '../utils/messages'

const inputClass =
    'w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40'

const Login = ({setToken}) => {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            const Response = await axios.post(backendUrl + '/api/user/admin',{email,password})
            if (Response.data.success) {
                setToken(Response.data.token)
            } else {
                toast.error(friendlyError(Response.data.message, "Couldn’t sign you in. Please try again."))

            }
        } catch (error) {
            console.log(error);
            toast.error(friendlyError(error, "Couldn’t sign you in. Please try again."))

        } finally {
            setSubmitting(false);
        }
    }

return (
    <main className='flex min-h-screen w-full items-center justify-center bg-[#18181b] px-4 py-12 text-zinc-100'>
        <div className='w-full max-w-sm'>
            {/* Wordmark — text rather than the logo image, which is dark-on-transparent */}
            <div className='mb-8 text-center'>
                <p className='text-2xl font-semibold tracking-[0.3em] text-white'>
                    FOREVER<span className='text-violet-400'>.</span>
                </p>
                <p className='mt-2 inline-block rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-violet-300'>
                    Admin
                </p>
            </div>

            <div className='rounded-xl border border-zinc-800 bg-[#202024] px-6 py-8 shadow-2xl shadow-black/40 sm:px-8'>
                <h1 className='text-xl font-semibold text-white'>Sign in to the admin panel</h1>
                <p className='mt-1.5 text-sm text-zinc-400'>Manage products and orders. Authorized staff only.</p>

                <form onSubmit={onSubmitHandler} className='mt-7 flex flex-col gap-5' aria-busy={submitting}>
                    <div>
                        <label htmlFor='admin-email' className='mb-2 block text-sm font-medium text-zinc-300'>Email address</label>
                        <input
                            id='admin-email'
                            onChange={(e)=>setEmail(e.target.value)}
                            value={email}
                            className={inputClass}
                            type="email"
                            placeholder='admin@example.com'
                            autoComplete='username'
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor='admin-password' className='mb-2 block text-sm font-medium text-zinc-300'>Password</label>
                        <div className='relative'>
                            <input
                                id='admin-password'
                                onChange={(e)=>setPassword(e.target.value)}
                                value={password}
                                className={`${inputClass} pr-16`}
                                type={showPassword ? 'text' : 'password'}
                                placeholder='Enter your password'
                                autoComplete='current-password'
                                required
                            />
                            <button
                                type='button'
                                onClick={() => setShowPassword((v) => !v)}
                                className='absolute inset-y-0 right-0 rounded-r-md px-3.5 text-xs font-medium text-zinc-400 transition-colors hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60'
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className='mt-1 w-full rounded-md bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202024] disabled:cursor-not-allowed disabled:opacity-60'
                    >
                        {submitting ? 'Signing in…' : 'Login'}
                    </button>
                </form>
            </div>

            <p className='mt-6 text-center text-xs text-zinc-500'>Shopping on FOREVER? Customers sign in on the main store.</p>
        </div>
    </main>
)

}

export default Login
