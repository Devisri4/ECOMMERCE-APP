import express from 'express';
import { loginUser, registerUser, adminLogin, getProfile, updateProfile, changePassword } from '../controllers/userController.js';
import authUser from '../middleware/auth.js';
import { listAddresses, saveAddress, removeAddress, getWishlist, toggleWishlist, mergeWishlist } from '../controllers/accountController.js';
import { loginLimiter, adminLoginLimiter, registerLimiter } from '../middleware/rateLimit.js';



const userRouter = express. Router();

// Rate limited per IP to slow down password guessing
userRouter.post('/register', registerLimiter, registerUser)
userRouter.post('/login', loginLimiter, loginUser)
userRouter.post('/admin', adminLoginLimiter, adminLogin)

// Customer account (token required; user comes from the token, never the request body)
userRouter.post('/profile', authUser, getProfile)
userRouter.post('/profile/update', authUser, updateProfile)
userRouter.post('/password', loginLimiter, authUser, changePassword)

// Saved addresses and wishlist
userRouter.post('/addresses', authUser, listAddresses)
userRouter.post('/addresses/save', authUser, saveAddress)
userRouter.post('/addresses/remove', authUser, removeAddress)
userRouter.post('/wishlist', authUser, getWishlist)
userRouter.post('/wishlist/toggle', authUser, toggleWishlist)
userRouter.post('/wishlist/merge', authUser, mergeWishlist)

export default userRouter;
