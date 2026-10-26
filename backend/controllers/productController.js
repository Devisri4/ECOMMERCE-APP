import {v2 as cloudinary} from "cloudinary" 
import productModel from "../models/productModel.js" 


//function for add product 
const addProduct = async (req, res) => {
    try {
        
        const { name, description, price, category, subCategory, sizes, bestseller } = req.body
        
        const image1 = req.files.image1 && req.files.image1[0] 
        const image2 = req.files.image2 && req.files.image2[0] 
        const image3 = req.files.image3 && req.files.image3[0] 
        const image4 = req.files.image4 && req.files.image4[0]
        
        const images =[image1,image2,image3,image4].filter((item)=> item !== undefined)
        
        
        let imagesUrl = await Promise.all(
            images.map(async (item) => {
                let result = await cloudinary.uploader.upload(item.path, { resource_type: "image" })
                return result.secure_url
            })
        )
        
        
        const productData = {
            name,
            description,
            category,
            price: Number(price),
            subCategory,
            bestseller: bestseller === "true" ? true : false,
            sizes: JSON.parse(sizes),
            image:imagesUrl,date: Date.now()
        }
        console.log(productData);
        const product = new productModel(productData);
        await product.save();
        
        
        res.json({ success:true,message:"product Added"})

    } catch (error) {
        console.log(error)
    
    res.json({success: false, message: error.message})
    }

}






//function for list product 
const listProducts = async (req, res) => {
    try {
        const products = await productModel.find({});
        res.json({success: true, products})
    } catch (error) {
        
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

//function for removing product 
const removeProduct = async (req, res) => {
    try {
        await productModel.findByIdAndDelete(req.body.id)
        res.json({success: true, message: "Product Removed"})
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

//function for single product info 


const singleProduct = async (req, res) => {
    try {
        const { productId } = req.body
        const product = await productModel.findById(productId)
        res.json({success: true, product})
    } catch (error){
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

//function for updating product
// Body (multipart, like /add): id, name, description, price, category, subCategory, bestseller,
// sizes (JSON array) and existingImages (JSON array of 4 slots: current URL to keep, or null).
// A new file in image1–image4 replaces that slot. Only URLs the product already has can be kept.
const CATEGORIES = ["Men", "Women", "Kids"]
const SUB_CATEGORIES = ["Topwear", "Bottomwear", "Winterwear"]
const SIZES = ["S", "M", "L", "XL", "XXL"]

const parseJson = (value, fallback) => {
    try { return JSON.parse(value) } catch { return fallback }
}

const updateProduct = async (req, res) => {
    try {
        const { id, name, description, price, category, subCategory, bestseller } = req.body
        const product = await productModel.findById(id)
        if (!product) return res.json({ success: false, message: "Product not found" })

        const sizes = parseJson(req.body.sizes, [])
        const existingImages = parseJson(req.body.existingImages, [])
        const numericPrice = Number(price)

        if (!name?.trim() || !description?.trim()) return res.json({ success: false, message: "Name and description are required" })
        if (!(numericPrice > 0)) return res.json({ success: false, message: "Price must be greater than 0" })
        if (!CATEGORIES.includes(category) || !SUB_CATEGORIES.includes(subCategory)) return res.json({ success: false, message: "Invalid category" })
        if (!Array.isArray(sizes) || sizes.length === 0 || !sizes.every((s) => SIZES.includes(s))) return res.json({ success: false, message: "Select at least one valid size" })

        // Build the 4 image slots: uploaded file > kept existing URL > empty
        const files = req.files || {}
        const slots = await Promise.all([1, 2, 3, 4].map(async (n, i) => {
            const file = files[`image${n}`]?.[0]
            if (file) {
                const result = await cloudinary.uploader.upload(file.path, { resource_type: "image" })
                return result.secure_url
            }
            const keep = Array.isArray(existingImages) ? existingImages[i] : null
            return typeof keep === "string" && product.image.includes(keep) ? keep : null
        }))
        const image = slots.filter(Boolean)
        if (image.length === 0) return res.json({ success: false, message: "A product needs at least one image" })

        product.name = name.trim()
        product.description = description.trim()
        product.price = numericPrice
        product.category = category
        product.subCategory = subCategory
        product.sizes = sizes
        product.bestseller = bestseller === "true" || bestseller === true
        product.image = image
        await product.save()

        res.json({ success: true, message: "Product Updated", product })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {listProducts,addProduct,removeProduct,singleProduct,updateProduct}