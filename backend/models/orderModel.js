import mongoose from 'mongoose'

const orderSchema = new mongoose. Schema ({
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    address: { type: Object, required: true },
    status: { type: String, required: true, default: 'Order Placed' },
    paymentMethod: { type: String , required: true },
    payment: { type: Boolean, required: true, default: false },
    date: {type: Number, required:true},
    // Stripe Checkout Session for card orders — lets the server verify/expire the payment
    stripeSessionId: { type: String },
    // Currency of `amount` and item prices. Orders created before the INR switch don't store it,
    // so the default keeps them reading as USD; new orders always set 'INR' explicitly.
    currency: { type: String, enum: ['USD', 'INR'], default: 'USD' }

})

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema)

export default orderModel;