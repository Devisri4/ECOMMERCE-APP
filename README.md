# FOREVER — MERN Fashion E-commerce

[![CI](https://github.com/Devisri4/ECOMMERCE-APP/actions/workflows/ci.yml/badge.svg)](https://github.com/Devisri4/ECOMMERCE-APP/actions/workflows/ci.yml)

A full-stack fashion store built with MongoDB, Express, React and Node.js: an editorial customer
storefront, a separate admin panel, and a REST API with Stripe payments and Cloudinary image hosting.

![FOREVER storefront homepage](docs/screenshots/home-hero.png)

## Try it

<!-- Add the deployed URLs here once they are live:
- **Storefront:** https://<storefront>.vercel.app
- **Admin panel:** https://<admin>.vercel.app
-->

Both sign-in screens have a **Use demo account** button when demo accounts are configured:

- **Demo shopper:** browse, fill the bag and check out with cash on delivery, or pay by card with Stripe's test
  card `4242 4242 4242 4242` (any future date, any CVC). The shared account's name and password can't be changed.
- **Read-only demo admin:** see the dashboard, products and orders. Customer names, addresses and phone numbers
  are masked, and every change is refused by the API.

FOREVER is a portfolio project: the store details are fictional and no orders are shipped or charged.

## Features

**Storefront** (`frontend/`)
- Editorial homepage, collection page with URL-based filters, sorting and search, and product pages with an image gallery
- Guest shopping bag that persists across refreshes and merges into the account bag on sign-in
- Checkout with cash on delivery or Stripe card payments, with client- and server-side validation
- Account area: profile, password change, order history with status tracking, and cancellation of unpaid orders
- Newsletter sign-up saved to the database
- Responsive, keyboard-accessible UI with loading, empty and error states, per-page titles and a 404 page

**Admin panel** (`admin/`)
- Dashboard with live product, order, revenue and subscriber figures
- Read-only demo admin role for portfolio visitors, with customer details masked
- Add and edit products with up to four images, sizes, category and bestseller flag
- Order management with status updates

**Backend API** (`backend/`)
- Express 5 REST API with Mongoose models for users, products and orders
- JWT authentication with separate customer, admin and read-only demo-admin roles
- Stripe Checkout integration with a signed webhook, so payments are confirmed even if the customer closes the tab
- Cloudinary image uploads
- Automated tests run on every push with GitHub Actions (backend tests; lint, tests and build for both React apps)

## Screenshots

| Collection | Product | Admin products |
|---|---|---|
| ![Collection page](docs/screenshots/collection.png) | ![Product page](docs/screenshots/product.png) | ![Admin product list](docs/screenshots/admin-products.png) |

## Tech stack

- **Frontend & admin:** React 19, React Router 7, Vite 7, Tailwind CSS 3, Axios
- **Backend:** Node.js, Express 5, MongoDB with Mongoose 8, JWT, bcrypt, Multer
- **Services:** Stripe Checkout, Cloudinary

## Environment variables

Templates are provided in each app's `.env.example`. Never commit real `.env` files.

- **backend:** `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLOUDINARY_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_SECRET_KEY`, `STRIPE_SECRET_KEY`, `FRONTEND_URL`, `ADMIN_URL`, `BACKEND_URL`
- **backend (optional):** `STRIPE_WEBHOOK_SECRET`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_CUSTOMER_EMAIL`, `CORS_ORIGINS`, `MONGODB_DB`
- **frontend:** `VITE_BACKEND_URL`, `VITE_SITE_URL` (for link previews; set automatically on Vercel), optional `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD`
- **admin:** `VITE_BACKEND_URL`, optional `VITE_DEMO_ADMIN_EMAIL`, `VITE_DEMO_ADMIN_PASSWORD`

## Security highlights

- Prices, totals and delivery addresses are validated on the server; client-sent prices are ignored.
- Stripe payments are verified with Stripe before an order is marked paid.
- Role-based, expiring JWTs: customers can access only their own data, and admin routes reject customer tokens.
- Sign-in, admin sign-in and registration are rate limited per IP; login gives one message for an unknown
  email and a wrong password, so accounts can't be discovered through the form.
- Request fields used in database queries or as object keys are type-checked, which blocks MongoDB operator
  injection and prototype pollution through the cart API.
- Security headers on every API response (`nosniff`, no framing, strict referrer policy, HSTS).

## Known limitations

- No password reset by email, saved addresses or product reviews.
- Refunds aren't automated: paid card orders can't be cancelled in the app and are refunded via the Stripe dashboard.
- Products and orders are loaded in full rather than paginated, which suits a catalogue of this size.
