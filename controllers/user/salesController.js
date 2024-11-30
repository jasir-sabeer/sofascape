const { name } = require("ejs");
const mongoose = require("mongoose");
const User = require("../../models/userschema");
const Address = require('../../models/addressschema')


const loadCheckout=async(req,res)=>{
try {
    res.render('checkout')
} catch (error) {
    res.status(500).json({ error: 'Server error, please try again later.' });
}
}

module.exports = {
loadCheckout
}







