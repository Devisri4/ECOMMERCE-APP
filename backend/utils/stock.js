// product.stock maps size → units left; a size without an entry isn't tracked (always available).
export const unitsLeft = (product, size) =>
    product?.stock && Object.hasOwn(product.stock, size) ? product.stock[size] : Infinity;

export const stockMessage = (name, size, left) =>
    left > 0 ? `Only ${left} left of ${name} in size ${size}` : `${name} in size ${size} is sold out`;
