const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true 
    },
    firstName:{ 
        type: String, 
        required: true 
    },
    lastName:{ 
        type: String,
        required: true
    },
    email:{ 
        type: String, 
        required: true 
    },
    phoneNumber:{ 
        type: String, 
        required: true 
    },
    address:{ 
        type: String, 
        required: true 
    },
    city:{ 
        type: String, 
        required: true 
    },
    state:{
        type: String, 
        required: true 
    },
    pincode:{ 
        type:  Number, 
        required: true 
    },
    street:{ 
        type: String,
        required: true 
    },
    isDefault:{ 
        type: Boolean,
        default: false 
    },
});

module.exports = mongoose.model('address', addressSchema);