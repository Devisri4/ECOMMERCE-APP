# FOREVER — MERN Fashion Store

[![CI](https://github.com/Devisri4/ECOMMERCE-APP/actions/workflows/ci.yml/badge.svg)](https://github.com/Devisri4/ECOMMERCE-APP/actions/workflows/ci.yml)

A full-stack fashion store with a customer storefront, an admin panel and a REST API.

![FOREVER storefront](docs/screenshots/home-hero.png)

## Live demo

- **Store:** https://ecommerce-frontend-beta-lime.vercel.app
- **Admin:** https://ecommerce-admin-indol-rho.vercel.app

| Account | Email | Password |
|---|---|---|
| Shopper | `demo@forever-store.example` | `DemoShop2027` |
| Admin (read-only) | `demo-admin@forever-store.example` | `DemoAdmin2027` |

Or click **Use demo account** on either sign-in page. Card payments run in Stripe test mode (`4242 4242 4242 4242`).
This is a portfolio project: orders aren't shipped and the dashboard shows sample data.

## Features

- **Store:** filters and search, stock per size, reviews, wishlist, saved addresses, guest bag that carries over on sign-in
- **Checkout:** cash on delivery or Stripe, with prices and stock checked on the server
- **Admin:** sales dashboard with charts, product and stock management, order status updates
- **Security:** role-based JWT auth, rate limiting, input validation, a read-only demo role that hides customer details
- **Quality:** automated backend tests plus lint and build checks on every push (GitHub Actions)

## Tech stack

React 19 · Vite · Tailwind CSS · Node.js · Express 5 · MongoDB (Mongoose) · Stripe · Cloudinary · Vercel

## Run locally

Copy each app's `.env.example` to `.env` and fill in your values, then:

```bash
cd backend  && npm install && npm run server   # API on :4000
cd frontend && npm install && npm run dev      # store on :5173
cd admin    && npm install && npm run dev      # admin on :5174
```
