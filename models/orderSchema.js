const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            requried: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        image: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
            default: 'Pending'
        }
    }
    ],
    address: {
        type: mongoose.Schema.ObjectId,
        ref: 'address',
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['COD', "Razorpay", "Wallet"],
        default: "COD"
    },
    shippingCost: {
        type: Number,
        required: true
    },
  
    createdAt: {
        type: Date,
        default: Date.now
    },
    

}, { timestamps: true });

const orderModel = mongoose.model('order', orderSchema);
module.exports = orderModel;