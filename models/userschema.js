const mongoose = require('mongoose');
const { Schema } = mongoose; 

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleid: {
        type: String,
        unique: true,
        sparse: true       
    },
    password: {
        type: String,
        required: false,
    },
    isblocked: {
        type: Boolean,
        default: false,
    },
    isadmin: {
        type: Boolean,
        default: false
    },
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    usedCoupons: [
        {
            couponId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'coupon'
            },
            usageCount: {
                type: Number,
                default: 0
            }
        }
    ]
    
},{timestamps:true});

const User = mongoose.model("user", userSchema);
module.exports = User;
