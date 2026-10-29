// "Devi Sri" → "DS", "Ravi" → "R": first letter of the first and last word (for the header badge)
export const initialsOf = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
};
