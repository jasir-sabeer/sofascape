const express = require('express');
const router = express.Router();
const profilecontroller = require('../../controllers/user/profilecontrole');
const userAuth=require('../../middlewares/userAuth')

router.get('/profile',userAuth.userLogin,profilecontroller.loadprofile)
router.post('/userlogout',profilecontroller.userlogout)
router.get('/changePassword',userAuth.userLogin,profilecontroller.loadChangePasswordPage)
router.post('/change-password',profilecontroller.changepassword)
router.get('/addAddressPage',userAuth.userLogin,profilecontroller.loadAddressPage)
router.post('/add_address',profilecontroller.addAddress)


module.exports = router;