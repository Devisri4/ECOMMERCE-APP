// product.stock maps size → units left; a size without an entry isn't tracked (always available).
// Same rule as backend/utils/stock.js. The server re-checks at checkout, so this is for display only.
export const LOW_STOCK = 5;

export const unitsLeft = (product, size) =>
  product?.stock && Object.hasOwn(product.stock, size) ? product.stock[size] : Infinity;

export const isSoldOut = (product) =>
  Array.isArray(product?.sizes) && product.sizes.length > 0 && product.sizes.every((size) => unitsLeft(product, size) === 0);
