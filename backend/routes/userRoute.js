import express from 'express';
import { loginUser, registerUser, adminLogin, getProfile, updateProfile, changePassword } from '../controllers/userController.js';
import authUser from '../middleware/auth.js';
import { loginLimiter, adminLoginLimiter, registerLimiter } from '../middleware/rateLimit.js';



const userRouter = express. Router();

// Rate limited per IP to slow down password guessing
userRouter.post('/register', registerLimiter, registerUser)
userRouter.post('/login', loginLimiter, loginUser)
userRouter.post('/admin', adminLoginLimiter, adminLogin)

// Customer account (token required; user comes from the token, never the request body)
userRouter.post('/profile', authUser, getProfile)
userRouter.post('/profile/update', authUser, updateProfile)
userRouter.post('/password', authUser, changePassword)

export default userRouter;
