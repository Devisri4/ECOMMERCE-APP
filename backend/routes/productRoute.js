import express from 'express'
import { listProducts, addProduct, removeProduct, singleProduct, updateProduct } from '../controllers/productController.js'
import Upload from '../middleware/multer.js'
import adminAuth from '../middleware/adminAuth.js';

const imageFields = Upload.fields([{name:'image1',maxCount:1},{name:'image2',maxCount:1},{name:'image3',maxCount:1},{name:'image4',maxCount:1}]);

const productRouter = express. Router();

productRouter.post('/add',adminAuth,imageFields,addProduct);
productRouter.post('/update',adminAuth,imageFields,updateProduct);
productRouter.post('/remove',adminAuth, removeProduct);
productRouter.post('/single',singleProduct);
productRouter.get('/list', listProducts)

export default productRouter
