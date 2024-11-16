
const express = require('express');
const router = express.Router();
const usercontroller = require('../../controllers/user/usercontrole');
const passport = require('passport');

router.get('/pagenotfound', usercontroller.pagenotfound);
router.get('/homepage', usercontroller.loadhomepage);
router.get('/products', usercontroller.loadproductpage);
router.get('/userlogin', usercontroller.loadloginpage);
router.get('/signup', usercontroller.loadsignuppage);
router.post('/signup', usercontroller.signup);
router.post('/otppage', usercontroller.loadotppage);
router.post('/resendOTP', usercontroller.resendOTP);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/signup' }), 
  (req, res) => {
    res.redirect('/homepage');
  }
);

router.post("/login",usercontroller.login)
router.get("/productpage/:id",usercontroller.loadsingleproductpage)


module.exports = router;
