import express from 'express'
import { subscribe, subscriberCount } from '../controllers/newsletterController.js'
import { adminReadAuth } from '../middleware/adminAuth.js'
import { newsletterLimiter } from '../middleware/rateLimit.js'

const newsletterRouter = express.Router()

newsletterRouter.post('/subscribe', newsletterLimiter, subscribe)

// ADMIN (read-only, so the demo admin can see it too)
newsletterRouter.post('/count', adminReadAuth, subscriberCount)

export default newsletterRouter
