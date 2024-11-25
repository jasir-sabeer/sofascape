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
    
},{timestamps:true});

const User = mongoose.model("user", userSchema);
module.exports = User;
