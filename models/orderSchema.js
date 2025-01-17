const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        required: true
    },
    orderId: {
        type: String,
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
        offerPrice: {
            type: Number,  
            required: false
        },
        status: {
            type: String,
            enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled','Returned'],
            default: 'Pending'
        },
        returnReason: {
            type: String,
            required: false

        },
    }
    ],
    address: {
        customerName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: Number,
            required: true,
        },
        localaddress: {
            type: String,
            required: true,
        },
        street: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        pincode: {
            type: Number,
            required: true,
        },
    },
    total: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    couponDiscountValue:{
        type:Number,
        required:false,
    },
    couponDiscountPercentage:{
        type:Number,
        required:false,
    },
    finalDiscountAmount:{
        type:Number,
        required:false,
    },
    status: {
        type: String,
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled','Returned'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['CashOnDelivery', 'razorpay', 'wallet'],
        default: "CashOnDelivery"
    },
    shippingCost: {
        type: Number,
        required: true
    },
    couponCode: {
        type: String,
        default: null
    },
    discountAmount: {
        type: Number
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

const orderModel = mongoose.model('order', orderSchema);
module.exports = orderModel;