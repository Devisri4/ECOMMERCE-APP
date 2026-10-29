// Store details shown in the footer and on the Contact page, kept in one place so they always match.
// FOREVER is a portfolio demo: the studio address is fictional and the email uses a reserved
// .example domain, so nothing here points at a real business or person.
export const STORE_INFO = {
  email: 'care@forever-store.example',
  hours: 'Monday to Saturday, 10:00–19:00 IST',
  studio: ['FOREVER Studio, 3rd Floor', 'Road No. 12, Banjara Hills', 'Hyderabad, Telangana 500034', 'India'],
  city: 'Hyderabad, India',
  returnDays: 7,
  sourceUrl: 'https://github.com/DeviSri4',
};

// The email split at "@" so narrow columns wrap there instead of mid-word (render with <wbr /> between)
export const [EMAIL_USER, EMAIL_DOMAIN] = STORE_INFO.email.split('@');
