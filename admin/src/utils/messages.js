// Turns raw backend / network errors into clear copy for admin toasts.
const KNOWN_MESSAGES = {
  'Not Authorized Login Again': 'Your session has expired. Please sign in again.',
  'Invalid credentials': 'Incorrect email or password.',
  'jwt malformed': 'Your session has expired. Please sign in again.',
  'invalid signature': 'Your session has expired. Please sign in again.',
};

export const friendlyError = (errorOrMessage, fallback = 'Something went wrong. Please try again.') => {
  const message =
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : errorOrMessage?.response?.data?.message || errorOrMessage?.message;

  if (!message) return fallback;
  if (KNOWN_MESSAGES[message]) return KNOWN_MESSAGES[message];
  if (message === 'Network Error') return 'Can’t reach the server. Check that the backend is running and try again.';
  if (/status code|timed out|ECONN|undefined|null|Cast to ObjectId/i.test(message)) return fallback;
  return message;
};
