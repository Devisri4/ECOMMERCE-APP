import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { checkConfig, allowedOrigins } from './config/env.js'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import userRouter from './routes/userRoute.js'
import productRouter from './routes/productRoute.js'
import cartRouter from './routes/cartRoute.js'
import orderRouter from './routes/orderRoute.js'
import newsletterRouter from './routes/newsletterRoute.js'
import { stripeWebhook } from './controllers/orderController.js'

// App Config
checkConfig()
const app = express()
const port = process.env.PORT || 4000

connectDB()
connectCloudinary()

// Vercel sits in front of the API as a proxy; this makes req.ip the real client IP for rate limiting
app.set('trust proxy', 1)
app.disable('x-powered-by')

// middlewares
// Security headers for a JSON API (the API serves no pages, so nothing may frame or embed it)
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  })
  next()
})
// Stripe webhook needs the unparsed body to check its signature, so it is registered before express.json()
app.post('/api/order/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhook)
app.use(express.json())
// Only the configured storefront/admin origins may call the API from a browser.
// Requests without an Origin header (server-to-server, Stripe redirects, curl) are not affected.
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins().includes(origin)),
}))

// api endpoints
app.use('/api/user', userRouter)
app.use('/api/product', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/order', orderRouter)
app.use('/api/newsletter', newsletterRouter)

app.get('/', (req, res) => {
  res.send('API Working')
})

// Last-resort error handler: log details, return a generic message
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err)
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
})

// On Vercel the exported app handles each request; everywhere else (local dev, other hosts) start a server
if (!process.env.VERCEL) {
  app.listen(port, () => console.log('Server started on PORT:' + port))
}

export default app
