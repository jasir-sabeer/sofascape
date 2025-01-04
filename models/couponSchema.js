const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    minPurchase: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    isExpired: {
        type: Boolean,
        default: false
    },
    isListed: {
        type: Boolean,
        default: true
    }
    
}, { timestamps: true });

module.exports = mongoose.model('coupon', couponSchema);