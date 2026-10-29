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
const MAX_PRICE = 1000000 // ₹10,00,000

// Only real ObjectId strings reach findById (an object like { "$ne": null } would otherwise match a product)
const isId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)

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

// Turns "the form loaded `before`, the admin saved `after`" into one MongoDB update: tracked sizes change
// by the difference ($inc), newly tracked sizes are set, sizes no longer tracked are removed. A decrease
// also requires enough units to be left, so stock can't go below zero. Returns { filter, update } (update
// is null when nothing changed).
export const stockChange = (before = {}, after = {}) => {
    const filter = {}, $inc = {}, $set = {}, $unset = {}
    for (const size of SIZES) {
        const path = `stock.${size}`
        const had = Object.hasOwn(before, size), has = Object.hasOwn(after, size)
        if (had && has) {
            const delta = after[size] - before[size]
            if (delta !== 0) $inc[path] = delta
            if (delta < 0) filter[path] = { $gte: -delta }
        } else if (has) {
            $set[path] = after[size]
        } else if (had) {
            $unset[path] = ""
        }
    }
    const update = Object.fromEntries(Object.entries({ $inc, $set, $unset }).filter(([, ops]) => Object.keys(ops).length))
    return { filter, update: Object.keys(update).length ? update : null }
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
    // Whole rupees only: order totals and Stripe amounts are then always exact
    if (!Number.isInteger(numericPrice) || numericPrice < 1 || numericPrice > MAX_PRICE) {
        return { error: "Price must be a whole number of rupees from 1 to 10,00,000" }
    }
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
        if (!isId(req.body.id)) return res.json({ success: false, message: "Product not found" })
        const removed = await productModel.findByIdAndDelete(req.body.id)
        if (!removed) return res.json({ success: false, message: "Product not found" })
        // Its reviews go with it (reviews store the product id as a string)
        await reviewModel.deleteMany({ productId: req.body.id })
        res.json({success: true, message: "Product Removed"})
    } catch (error) {
        sendServerError(res, error, "Couldn't remove the product. Please try again.")
    }
}

//function for single product info
const singleProduct = async (req, res) => {
    try {
        const { productId } = req.body
        // An invalid id is simply "not found" (the admin edit page shows that state)
        const product = isId(productId) ? await productModel.findById(productId) : null
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
        if (!isId(req.body.id)) return res.json({ success: false, message: "Product not found" })
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

        // Stock: when the form says what it loaded (stockBase), only the admin's change is applied, so units
        // ordered while the form was open aren't overwritten. Done first, so a conflict changes nothing.
        let { stock, ...otherFields } = fields
        if (stock !== undefined && req.body.stockBase !== undefined) {
            const base = parseStock(req.body.stockBase, SIZES)
            if (base.error) return res.json({ success: false, message: base.error })
            const { filter, update } = stockChange(base.stock, stock)
            if (update) {
                const applied = await productModel.updateOne({ _id: product._id, ...filter }, update)
                if (applied.matchedCount === 0) {
                    return res.json({ success: false, message: "Stock changed while you were editing (an order took some units). Reload the page and check the numbers." })
                }
            }
            stock = undefined
        }

        // Each slot: newly uploaded file > kept existing URL > empty
        const slots = await Promise.all(files.map((file, i) => (file ? uploadImageBuffer(file) : kept[i])))

        Object.assign(product, otherFields, stock !== undefined ? { stock } : {}, { image: slots.filter(Boolean) })
        await product.save()

        res.json({ success: true, message: "Product Updated", product: await productModel.findById(product._id) })
    } catch (error) {
        sendServerError(res, error, "Couldn't update the product. Please try again.")
    }
}

export {listProducts,addProduct,removeProduct,singleProduct,updateProduct}
