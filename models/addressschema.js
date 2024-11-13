const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema({
    userid: {
        type: Schema.Types.ObjectId, 
        ref: "user",
        required: true
    },
    address: [{
        addresstype: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        landmark: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        pincode: {
            type: Number,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        altphone: {
            type: String,
            required: true
        }
    }]
});

const Address = mongoose.model("address", addressSchema);
module.exports = Address;
