import express from 'express'
import { listReviews, myReview, addReview, removeReview } from '../controllers/reviewController.js'
import authUser from '../middleware/auth.js'
import { reviewLimiter } from '../middleware/rateLimit.js'

const reviewRouter = express.Router()

reviewRouter.get('/list', listReviews)

// Customer (token required; the reviewer always comes from the token)
reviewRouter.post('/mine', authUser, myReview)
reviewRouter.post('/add', reviewLimiter, authUser, addReview)
reviewRouter.post('/remove', authUser, removeReview)

export default reviewRouter
