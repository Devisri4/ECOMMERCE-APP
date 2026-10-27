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

// App Config
checkConfig()
const app = express()
const port = process.env.PORT || 4000

connectDB()
connectCloudinary()

// middlewares
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

app.get('/', (req, res) => {
  res.send('API Working')
})

// Last-resort error handler: log details, return a generic message
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err)
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
})

app.listen(port, () => console.log('Server started on PORT:' + port))
