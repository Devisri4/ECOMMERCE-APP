// INR formatting and per-order currency (node:test, no browser needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, orderCurrency, STORE_CURRENCY } from '../src/utils/currency.js';

test('store currency is INR', () => assert.equal(STORE_CURRENCY, 'INR'));

test('INR uses the rupee sign and Indian digit grouping', () => {
  assert.equal(formatPrice(2799), '₹2,799');
  assert.equal(formatPrice(129999), '₹1,29,999');
  assert.equal(formatPrice(99), '₹99');
});

test('fractional amounts show two decimals', () => assert.equal(formatPrice(2799.5), '₹2,799.50'));

test('legacy USD orders keep the dollar sign', () => {
  assert.equal(formatPrice(191, 'USD'), '$191');
  assert.equal(orderCurrency({ amount: 191 }), 'USD');
  assert.equal(orderCurrency({ amount: 2898, currency: 'INR' }), 'INR');
});

test('unknown currency codes fall back to INR', () => assert.equal(formatPrice(10, 'XYZ'), '₹10'));
