const express = require('express');
const router = express.Router();
const profilecontroller = require('../controllers/user/profilecontrole');
const userAuth=require('../middlewares/userAuth')

router.get('/profile',userAuth.userLogin,profilecontroller.loadprofile)
router.post('/userlogout',profilecontroller.userlogout)




module.exports = router;