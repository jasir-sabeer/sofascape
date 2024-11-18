const { name } = require("ejs");
const mongoose = require("mongoose");
const User = require("../../models/userschema");
const Address=require('../../models/addressschema')
const bcrypt = require('bcrypt');


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


const changepassword= async (req,res)=>{
    const userId= req.session.user;
  try {
  const {currentPassword,newPassword,confirmPassword} = req.body;
     console.log(currentPassword)

     const user=await User.findById(userId);

     if (!user) {
        return res.status(404).json({message: 'User not found.' });
    }

    const isMatch=await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return res.status(404).json({message: 'current password is  incorrect' });
    }
   
    if(newPassword!==confirmPassword){
        return res.status(404).json({message: 'passwords do not match' });
    }

    const passwordPattern=/^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    

    if(!newPassword.match(passwordPattern)){
        return res.status(404).json({message: 'set a 8 character strong password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();


        res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Server error, please try again later.' });
  }

}

module.exports={
    loadprofile,
    userlogout,
    changepassword
}