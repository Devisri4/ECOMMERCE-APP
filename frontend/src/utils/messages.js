// Turns raw backend / network errors into customer-friendly copy for toasts.
const KNOWN_MESSAGES = {
  'Not Authorized Login Again': 'Your session has expired. Please sign in again.',
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
  if (message === 'Network Error') return 'We couldn’t reach the server. Please check your connection and try again.';
  // Technical messages (status codes, stack-ish text) are replaced with the fallback
  if (/status code|timed out|ECONN|undefined|null|Cast to ObjectId/i.test(message)) return fallback;
  return message;
};
