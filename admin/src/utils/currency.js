// The store sells in Indian rupees. Catalogue prices and new orders are INR; orders placed before
// the INR switch have no `currency` field and are USD — always format order amounts with orderCurrency().
export const STORE_CURRENCY = 'INR';

const LOCALES = { INR: 'en-IN', USD: 'en-US' };

// formatPrice(2799) → "₹2,799"; formatPrice(191, 'USD') → "$191"
export const formatPrice = (amount, currency = STORE_CURRENCY) => {
  const code = LOCALES[currency] ? currency : STORE_CURRENCY;
  const value = Number(amount) || 0;
  return new Intl.NumberFormat(LOCALES[code], {
    style: 'currency',
    currency: code,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const orderCurrency = (order) => order?.currency || 'USD';
