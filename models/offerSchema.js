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
   
    applicableToId: {
        type: [String],
        required: true,
        validate: [array => array.length > 0, 'At least one ID must be selected']
    }
    ,
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    expiryDate: {
        type: Date,
        required: true,
    },
  
}, { timestamps: true });

module.exports = mongoose.model('offer', offerSchema);