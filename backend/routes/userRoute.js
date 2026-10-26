import express from 'express';
import { loginUser, registerUser, adminLogin, getProfile, updateProfile, changePassword } from '../controllers/userController.js';
import authUser from '../middleware/auth.js';



const userRouter = express. Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/admin', adminLogin)

// Customer account (token required; user comes from the token, never the request body)
userRouter.post('/profile', authUser, getProfile)
userRouter.post('/profile/update', authUser, updateProfile)
userRouter.post('/password', authUser, changePassword)

export default userRouter;
