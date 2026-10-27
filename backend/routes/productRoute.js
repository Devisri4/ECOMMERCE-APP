import express from 'express'
import { listProducts, addProduct, removeProduct, singleProduct, updateProduct } from '../controllers/productController.js'
import { productImages } from '../middleware/multer.js'
import adminAuth from '../middleware/adminAuth.js';

const productRouter = express. Router();

productRouter.post('/add',adminAuth,productImages,addProduct);
productRouter.post('/update',adminAuth,productImages,updateProduct);
productRouter.post('/remove',adminAuth, removeProduct);
productRouter.post('/single',singleProduct);
productRouter.get('/list', listProducts)

export default productRouter
