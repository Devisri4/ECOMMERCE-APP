import productModel from "../models/productModel.js"
import reviewModel from "../models/reviewModel.js"
import { uploadImageBuffer } from "../utils/uploadImage.js"
import { isCloudinaryConfigured } from "../config/env.js"
import { sendServerError } from "../utils/http.js"

const CATEGORIES = ["Men", "Women", "Kids"]
const SUB_CATEGORIES = ["Topwear", "Bottomwear", "Winterwear"]
const SIZES = ["S", "M", "L", "XL", "XXL"]

const parseJson = (value, fallback) => {
    try { return JSON.parse(value) } catch { return fallback }
}

const MAX_STOCK = 9999

// Stock arrives as JSON { size: units } for the sizes the admin tracks. Only selected sizes are kept;
// a size left out isn't tracked. Returns { error } or { stock }.
const parseStock = (value, sizes) => {
    const raw = typeof value === "string" ? parseJson(value, null) : value
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "Invalid stock levels" }
    const stock = {}
    for (const size of sizes) {
        if (!Object.hasOwn(raw, size) || raw[size] === "" || raw[size] === null) continue
        const units = Number(raw[size])
        if (!Number.isInteger(units) || units < 0 || units > MAX_STOCK) {
            return { error: `Stock for size ${size} must be a whole number from 0 to ${MAX_STOCK}` }
        }
        stock[size] = units
    }
    return { stock }
}

// Shared by add + update. Returns { error } or { fields } with cleaned values.
// Prices are whole rupees (INR), the store currency. `stock` is optional: when it isn't sent at all,
// fields.stock is left out so an update keeps the current stock levels.
export const validateProductFields = ({ name, description, price, category, subCategory, sizes, bestseller, stock }) => {
    const parsedSizes = Array.isArray(sizes) ? sizes : parseJson(sizes, [])
    const numericPrice = Number(price)

    if (typeof name !== "string" || !name.trim() || typeof description !== "string" || !description.trim()) {
        return { error: "Name and description are required" }
    }
    if (!(numericPrice > 0)) return { error: "Price must be greater than 0" }
    if (!CATEGORIES.includes(category) || !SUB_CATEGORIES.includes(subCategory)) return { error: "Invalid category" }
    if (!Array.isArray(parsedSizes) || parsedSizes.length === 0 || !parsedSizes.every((s) => SIZES.includes(s))) {
        return { error: "Select at least one valid size" }
    }
    const fields = {
        name: name.trim(),
        description: description.trim(),
        price: numericPrice,
        category,
        subCategory,
        sizes: parsedSizes,
        bestseller: bestseller === "true" || bestseller === true,
    }
    if (stock !== undefined) {
        const parsed = parseStock(stock, parsedSizes)
        if (parsed.error) return { error: parsed.error }
        fields.stock = parsed.stock
    }
    return { fields }
}

const uploadedFiles = (req) => [1, 2, 3, 4].map((n) => req.files?.[`image${n}`]?.[0] || null)

//function for add product
const addProduct = async (req, res) => {
    try {
        const { error, fields } = validateProductFields(req.body)
        if (error) return res.json({ success: false, message: error })

        const files = uploadedFiles(req).filter(Boolean)
        if (files.length === 0) return res.json({ success: false, message: "A product needs at least one image" })
        if (!isCloudinaryConfigured()) return res.json({ success: false, message: "Image uploads are not configured on the server" })

        // Streamed from memory to Cloudinary — no temporary files on disk
        const imagesUrl = await Promise.all(files.map(uploadImageBuffer))

        const product = new productModel({ ...fields, image: imagesUrl, date: Date.now() });
        await product.save();

        res.json({ success:true,message:"product Added"})
    } catch (error) {
        sendServerError(res, error, "Couldn't add the product. Please try again.")
    }
}

//function for list product
const listProducts = async (req, res) => {
    try {
        const products = await productModel.find({});
        res.json({success: true, products})
    } catch (error) {
        sendServerError(res, error, "Couldn't load products. Please try again.")
    }
}

//function for removing product
const removeProduct = async (req, res) => {
    try {
        await productModel.findByIdAndDelete(req.body.id)
        // Its reviews go with it (reviews store the product id as a string)
        if (typeof req.body.id === "string") await reviewModel.deleteMany({ productId: req.body.id })
        res.json({success: true, message: "Product Removed"})
    } catch (error) {
        sendServerError(res, error, "Couldn't remove the product. Please try again.")
    }
}

//function for single product info
const singleProduct = async (req, res) => {
    try {
        const { productId } = req.body
        const product = await productModel.findById(productId)
        res.json({success: true, product})
    } catch (error){
        sendServerError(res, error, "Couldn't load this product.")
    }
}

//function for updating product
// Body (multipart, like /add): id, name, description, price, category, subCategory, bestseller,
// sizes (JSON array) and existingImages (JSON array of 4 slots: current URL to keep, or null).
// A new file in image1–image4 replaces that slot. Only URLs the product already has can be kept.
const updateProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.body.id)
        if (!product) return res.json({ success: false, message: "Product not found" })

        const { error, fields } = validateProductFields(req.body)
        if (error) return res.json({ success: false, message: error })

        const existingImages = parseJson(req.body.existingImages, [])
        const files = uploadedFiles(req)
        const kept = [0, 1, 2, 3].map((i) => {
            const keep = Array.isArray(existingImages) ? existingImages[i] : null
            return typeof keep === "string" && product.image.includes(keep) ? keep : null
        })
        if (!files.some(Boolean) && !kept.some(Boolean)) {
            return res.json({ success: false, message: "A product needs at least one image" })
        }
        if (files.some(Boolean) && !isCloudinaryConfigured()) {
            return res.json({ success: false, message: "Image uploads are not configured on the server" })
        }

        // Each slot: newly uploaded file > kept existing URL > empty
        const slots = await Promise.all(files.map((file, i) => (file ? uploadImageBuffer(file) : kept[i])))

        Object.assign(product, fields, { image: slots.filter(Boolean) })
        await product.save()

        res.json({ success: true, message: "Product Updated", product })
    } catch (error) {
        sendServerError(res, error, "Couldn't update the product. Please try again.")
    }
}

export {listProducts,addProduct,removeProduct,singleProduct,updateProduct}
