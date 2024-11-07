const mongoose = require('mongoose');
const { Schema } = mongoose;
const Category=require('./categoryschema')

const productSchema = new Schema({
    productname: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true, 
    },
    category: {
         type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: true,
    },
    regularprice: {
        type: Number,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
    },
    images: [{
        type: String, // Paths to uploaded images
        required: true
    }],
    isListed: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Product', productSchema);
