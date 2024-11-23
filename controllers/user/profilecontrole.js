const { name } = require("ejs");
const mongoose = require("mongoose");
const User = require("../../models/admin/userschema");
const Address = require('../../models/user/addressschema')
const bcrypt = require('bcrypt');


const loadprofile = async (req, res) => {
    const id = req.session.user
    try {
        const users = await User.findOne({ _id: id, isblocked: false });
        console.log(users)

        if (!users) {
            res.status(404).render('login')
        }
        const addresses = await Address.find({ user: id })
        res.render("profile", { users, addresses })
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
const loadChangePasswordPage = async (req, res) => {
    try {
        res.render('changepassword')
    } catch (error) {

        res.redirect('/page-404')
    }
}


const changepassword = async (req, res) => {
    const userId = req.session.user;
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        console.log(currentPassword)

        const user = await User.findById(userId);

        if (!user) {
            return res.render('changepassword', { message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.render('changepassword', { message: 'current password is  incorrect' });
        }

        if (newPassword !== confirmPassword) {
            return res.render('changepassword', { message: 'passwords do not match' });
        }

        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;


        if (!newPassword.match(passwordPattern)) {
            return res.render('changepassword', { message: 'set a 8 character strong password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();


        res.redirect('/profile?success=Password changed successfully.');

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Server error, please try again later.' });
    }

}

const loadAddressPage = async (req, res) => {
    try {
        res.render('add_address')
    } catch (error) {
        res.redirect('/page-404')
    }
}

const addAddress = async (req, res) => {

    const { firstName, lastName, email, phoneNumber, address, street, city, state, pincode } = req.body;
    console.log(req.body)
    const userId = req.session.user;
    try {
        const addresses = new Address({
            user: userId,
            firstName,
            lastName,
            email,
            phoneNumber,
            address,
            street,
            city,
            state,
            pincode
        })
        await addresses.save()
        res.redirect('/profile?success=address added successfully.');


    } catch (error) {
        console.log(error);

        res.status(500).json({ message: 'Error adding adress', error });
    }
}


const loadEditAddressPage = async (req, res) => {
    const userId = req.session.user
    const addressId = req.query.id;
    try {
        const address = await Address.findOne({ user: userId, _id: addressId })
        res.render('edit_address', { address })
    } catch (error) {
        console.log(error)
        res.redirect('/page-404')
    }
}
const editAddress = async (req, res) => {
    const addressId = req.params.id;
    const updatedData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
    };

    try {
        const address = await Address.findByIdAndUpdate(addressId, updatedData, { new: true }); // Update address in database
        if (!address) {
            return res.status(404).send('Address not found');
        }


        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).send('Internal Server Error');
    }
};


const deleteAddress = async (req, res) => {
    const userId = req.session.user;
    const addressId = req.params.id;
    try {
        const address = await Address.findOneAndDelete({ _id: addressId, user: userId });
        if (!address) {
            console.error('Address not found or unauthorized');
            return res.status(404).send('Address not found');
        }
        res.redirect('/profile');
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error');
    }
};






module.exports = {
    loadprofile,
    userlogout,
    changepassword,
    loadChangePasswordPage,
    loadAddressPage,
    addAddress,
    loadEditAddressPage,
    editAddress,
    deleteAddress
}