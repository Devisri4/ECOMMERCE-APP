import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { ShopContext } from '../context/ShopContext';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets';
import { useSearchParams } from 'react-router-dom';
import { meetsPasswordRules } from '../utils/passwordRules';
import PasswordChecklist from '../components/PasswordChecklist';

// Only allow in-app paths so ?redirect= can't send shoppers to another site
const safeRedirect = (value) =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Common misspellings of popular email domains → suggested fix
const DOMAIN_TYPOS = {
  'gamail.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmaill.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com',
};

const suggestEmail = (value) => {
  const [user, domain] = value.trim().toLowerCase().split('@');
  return user && DOMAIN_TYPOS[domain] ? `${user}@${DOMAIN_TYPOS[domain]}` : null;
};


// Backend messages (unchanged API) → friendlier copy and an optional next step
const describeAuthError = (message, isLogin) => {
  // The API gives one message for an unknown email and a wrong password, so accounts can't be probed
  if (message === 'Invalid credentials') return { text: 'Incorrect email or password. Please try again.' };
  if (message === 'User already exists') return { text: 'An account with this email already exists.', action: 'login' };
  if (message === 'Please enter a valid email') return { text: 'Please enter a valid email address.' };
  return { text: message || (isLogin ? 'Could not sign you in. Please try again.' : 'Could not create your account. Please try again.') };
};

const inputBase =
  'w-full border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-neutral-400 focus-visible:outline-none';
const inputClass = (hasError) =>
  `${inputBase} ${hasError ? 'border-red-700 focus:border-red-700' : 'border-neutral-300 focus:border-ink'}`;
const labelClass = 'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-600';
const fieldErrorClass = 'mt-2 text-xs text-red-700';

// Shared demo shopper for portfolio visitors; the backend blocks changing its name or password
const DEMO_ACCOUNT = import.meta.env.VITE_DEMO_EMAIL && import.meta.env.VITE_DEMO_PASSWORD
  ? { email: import.meta.env.VITE_DEMO_EMAIL, password: import.meta.env.VITE_DEMO_PASSWORD }
  : null;

const Login = () => {
  const [currentState, setCurrentState] = useState('Login');
  const { token, setToken, navigate, backendUrl } = useContext(ShopContext);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);   // show field errors after the first submit
  const [formError, setFormError] = useState(null);    // { text, action? } from the server

  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));
  const fromCheckout = redirectTo === '/place-order';

  const isLogin = currentState === 'Login';

  // Client-side checks. Sign-in only needs a valid email and a password.
  const trimmedEmail = email.trim();
  const errors = {};
  if (!isLogin && !name.trim()) errors.name = 'Please enter your name.';
  if (!trimmedEmail) errors.email = 'Please enter your email address.';
  else if (!EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'Enter a valid email, like name@example.com.';
  if (!password) errors.password = 'Please enter your password.';
  else if (!isLogin && !meetsPasswordRules(password)) {
    errors.password = 'Your password doesn’t meet all the requirements below.';
  }
  const showErrors = attempted;
  const emailSuggestion = trimmedEmail && !errors.email ? suggestEmail(trimmedEmail) : null;

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setAttempted(true);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    try {
      if (currentState === 'Sign Up') {
        const response = await axios.post(
          backendUrl + '/api/user/register',
          { name, email: trimmedEmail, password }
        );

        // The register API already returns a token, so sign the new customer straight in
        if (response.data.success) {
          setToken(response.data.token);
          localStorage.setItem('token', response.data.token);
          toast.success('Welcome to FOREVER. Your account has been created.');
          navigate(redirectTo, { replace: true });
        } else {
          setFormError(describeAuthError(response.data.message, false));
        }

      } else {
        const response = await axios.post(
          backendUrl + '/api/user/login',
          { email: trimmedEmail, password }
        );

        if (response.data.success) {
          setToken(response.data.token);
          localStorage.setItem('token', response.data.token);
          toast.success('Welcome back. You’re signed in.');
          navigate(redirectTo, { replace: true });
        } else {
          setFormError(describeAuthError(response.data.message, true));
        }
      }
    } catch (error) {
      setFormError(describeAuthError(error.response?.data?.message, isLogin));
    } finally {
      setSubmitting(false);
    }
  };

  // Already signed in (or just signed in): continue to where the shopper was going
  useEffect(() => {
    if (token) {
      navigate(redirectTo, { replace: true });
    }
  }, [token, navigate, redirectTo]);

  // Email is kept when switching so shoppers don't retype it
  const switchMode = (mode = isLogin ? 'Sign Up' : 'Login') => {
    setCurrentState(mode);
    setShowPassword(false);
    setPassword('');
    setAttempted(false);
    setFormError(null);
  };

  return (
    <div className='flex min-h-[70vh] items-start justify-center border-t border-neutral-200 py-12 sm:items-center sm:py-20'>
      <div className='w-full max-w-md border border-neutral-200 bg-white px-6 py-10 sm:px-10 sm:py-12'>
        <div className='text-center'>
          <img src={assets.logo} alt='FOREVER' className='mx-auto w-28' />
          <h1 className='mt-8 font-display text-3xl text-ink'>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className='mt-3 text-sm text-neutral-600'>
            {isLogin
              ? 'Sign in to view your orders and saved cart.'
              : 'Join FOREVER for faster checkout and order tracking.'}
          </p>
          {fromCheckout && (
            <p role='status' className='mt-6 border border-neutral-200 bg-paper px-4 py-3 text-sm text-neutral-700'>
              {isLogin ? 'Sign in' : 'Create an account'} to continue to checkout. Your bag has been saved.
            </p>
          )}
        </div>

        <form onSubmit={onSubmitHandler} noValidate className='mt-10 flex flex-col gap-5' aria-busy={submitting}>
          {formError && (
            <div role='alert' className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'>
              <p>{formError.text}</p>
              {formError.action === 'login' && (
                <button type='button' onClick={() => switchMode('Login')} className='mt-2 font-medium text-ink underline underline-offset-4 hover:opacity-70'>
                  Sign in instead
                </button>
              )}
            </div>
          )}

          {!isLogin && (
            <div>
              <label htmlFor='name' className={labelClass}>Full name</label>
              <input
                id='name'
                onChange={(e) => setName(e.target.value)}
                value={name}
                type="text"
                className={inputClass(showErrors && errors.name)}
                placeholder='Jane Doe'
                autoComplete='name'
                aria-invalid={showErrors && !!errors.name}
                aria-describedby={showErrors && errors.name ? 'name-error' : undefined}
              />
              {showErrors && errors.name && <p id='name-error' className={fieldErrorClass}>{errors.name}</p>}
            </div>
          )}

          <div>
            <label htmlFor='email' className={labelClass}>Email</label>
            <input
              id='email'
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              type="email"
              inputMode='email'
              className={inputClass(showErrors && errors.email)}
              placeholder='you@example.com'
              autoComplete='email'
              aria-invalid={showErrors && !!errors.email}
              aria-describedby={showErrors && errors.email ? 'email-error' : emailSuggestion ? 'email-suggestion' : undefined}
            />
            {showErrors && errors.email && <p id='email-error' className={fieldErrorClass}>{errors.email}</p>}
            {emailSuggestion && (
              <p id='email-suggestion' className='mt-2 text-xs text-neutral-600'>
                Did you mean{' '}
                <button type='button' onClick={() => setEmail(emailSuggestion)} className='font-medium text-ink underline underline-offset-2 hover:opacity-70'>
                  {emailSuggestion}
                </button>
                ?
              </p>
            )}
          </div>

          <div>
            <label htmlFor='password' className={labelClass}>Password</label>
            <div className='relative'>
              <input
                id='password'
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                type={showPassword ? 'text' : 'password'}
                className={`${inputClass(showErrors && errors.password)} pr-16`}
                placeholder={isLogin ? 'Your password' : 'Create a password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                aria-invalid={showErrors && !!errors.password}
                aria-describedby={[
                  showErrors && errors.password ? 'password-error' : null,
                  !isLogin ? 'password-rules' : null,
                ].filter(Boolean).join(' ') || undefined}
              />
              <button
                type='button'
                onClick={() => setShowPassword((v) => !v)}
                className='absolute inset-y-0 right-0 px-4 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-ink'
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {showErrors && errors.password && <p id='password-error' className={fieldErrorClass}>{errors.password}</p>}

            {/* Live checklist so shoppers see the rules before submitting */}
            {!isLogin && <PasswordChecklist id='password-rules' password={password} />}
          </div>

          <button type='submit' disabled={submitting} className='btn-primary mt-2 w-full'>
            {submitting
              ? (isLogin ? 'Signing in…' : 'Creating account…')
              : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>

          {/* Portfolio visitors: fills in the shared demo shopper (only when VITE_DEMO_EMAIL/PASSWORD are set) */}
          {isLogin && DEMO_ACCOUNT && (
            <button
              type='button'
              onClick={() => { setEmail(DEMO_ACCOUNT.email); setPassword(DEMO_ACCOUNT.password); setFormError(null); }}
              className='btn-secondary w-full'
            >
              Use demo account
            </button>
          )}
        </form>

        <p className='mt-8 text-center text-sm text-neutral-600'>
          {isLogin ? 'New to FOREVER?' : 'Already have an account?'}{' '}
          <button
            type='button'
            onClick={() => switchMode()}
            className='font-medium text-ink underline underline-offset-4 transition-opacity hover:opacity-70'
          >
            {isLogin ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
