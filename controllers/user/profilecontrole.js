const { name } = require("ejs");
const mongoose = require("mongoose");
const User = require("../../models/userschema");
const Address=require('../../models/addressschema')


const loadprofile = async (req, res) => {
    const id=req.session.user
    try {
        const users = await User.findOne({ _id:id, isblocked:false });
        console.log(users)

        if(!users){
         res.status(404).render('login')
        }
        const addresses=await Address.find({ user: id })
        res.render("profile",{users,addresses})
    } catch (error) {
        res.send(error)
    }

};

const userlogout = async (req, res) => {
    req.session.user = false; 


    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.render('login'); 
    })
}


module.exports={
    loadprofile,
    userlogout
}