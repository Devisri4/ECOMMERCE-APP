import express from 'express'
import {
  placeOrder,
  placeOrderStripe,
  verifyStripe,
  userOrders,
  cancelOrder,
  allOrders,
  updateStatus
} from '../controllers/orderController.js'
import authUser from '../middleware/auth.js'
import adminAuth, { adminReadAuth } from '../middleware/adminAuth.js'
import { orderLimiter } from '../middleware/rateLimit.js'

const orderRouter = express.Router()

// USER
orderRouter.post('/place', orderLimiter, authUser, placeOrder)
orderRouter.post('/stripe', orderLimiter, authUser, placeOrderStripe)
orderRouter.get('/verifyStripe', verifyStripe)
orderRouter.post('/userorders', authUser, userOrders)
orderRouter.post('/cancel', authUser, cancelOrder)

// ADMIN (the read-only demo admin can list orders, with customer details masked)
orderRouter.post('/list', adminReadAuth, allOrders)
orderRouter.post('/status', adminAuth, updateStatus)

export default orderRouter
