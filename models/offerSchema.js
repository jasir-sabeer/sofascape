const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerName: {
        type: String,
        required: true,
        unique: true,
    },
    applicableTo: {
        type: String,
        enum: ['Product', 'Category'],
        required: true
    },
    applicableToId: [{
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'applicableTo'  
    }],
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category'
    }],
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    expiryDate: {
        type: Date,
        required: true,
    }
  
}, { timestamps: true });

module.exports = mongoose.model('offer', offerSchema);