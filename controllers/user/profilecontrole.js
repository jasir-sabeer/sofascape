const { name } = require("ejs");
const User = require("../../models/userschema");
const Address=require('../../models/addressschema')


const loadprofile = async (req,res) => {
    try {
        const userAddressData = await Address.findOne({ user: user._id });

        // If no addresses are found, initialize as an empty array
        const addresses = userAddressData ? userAddressData.address : [];
        return res.render("profile",{addresses});
    } catch (error) {
        console.log("profile page not found.");
        res.status(500).send('Server error');
    }
}
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