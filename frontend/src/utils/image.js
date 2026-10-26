// Ask Cloudinary for a resized, auto-format (WebP/AVIF/JPEG) copy of a product photo.
// e.g. a 251 KB PNG becomes ~25 KB at w=600. Non-Cloudinary URLs (local assets) pass through untouched.
export const optimizeImage = (url, width = 600) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  if (url.includes('/upload/f_auto')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
};
