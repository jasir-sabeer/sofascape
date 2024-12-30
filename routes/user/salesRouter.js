const express = require('express');
const router = express.Router();
const salesController = require('../../controllers/user/salesController');
const userAuth=require('../../middlewares/userAuth')

router.get('/checkout',userAuth.userLogin,salesController.loadCheckout)
router.post('/add_address_checkout',salesController.addAddressCheckout)
router.post('/edit_address/:id',salesController.editAddressCheckout)
router.post('/checkout',salesController.saveOrder)
router.get('/thankyou',userAuth.userLogin,salesController.loadThankyou)
router.get('/orderTable',userAuth.userLogin,salesController.loadOrderTable)
router.get('/orderDetails/:orderId',salesController.loadOrderDetails)
router.post('/cancelOrder/:orderId/:productId', salesController.cancelProduct);
router.get('/wishlist',userAuth.userLogin,salesController.loadWishList)
router.post('/discount',salesController.discountCoupon)
router.post('/wishlist/add/:id',salesController.addWishlist)
router.delete('/wishlist/cancel/:productId', salesController.cancelProductWshlist);
router.post('/create-order',salesController.createOrder)
router.post("/checkout",salesController.paymentFailer)
router.get('/wallet',userAuth.userLogin,salesController.loadWalletPage)
router.get('/downloadInvoice/:orderId',salesController.downloadInvoice)
router.post('/razorpay/retry/:id',salesController.retryPayment)
router.post('/payment-sucsess',salesController.paymentSuccess)
router.post('/rturnProduct/:orderId/:productId', salesController.rturnProduct);



    
   









module.exports = router;
