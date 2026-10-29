// Small Cloudinary thumbnail (the stored URL is unchanged); other URLs are returned as they are
export const thumb = (url, w = 96, h = 110) =>
  typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/f_auto')
    ? url.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${w},h_${h}/`)
    : url
