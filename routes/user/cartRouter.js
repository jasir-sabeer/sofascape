const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/user/cartcontroller');
const userAuth=require('../../middlewares/userAuth')


router.get('/cartPage',userAuth.userLogin,cartController.loadCartPage)
router.post('/cart/add/:id',cartController.addCart)
router.post('/updateCart', cartController.updateCartQuantity);
router.delete('/cart/cancel/:productId', cartController.cancelProduct);





module.exports = router;