const express = require('express');
const router = express.Router();
const salesController = require('../../controllers/user/salesController');
const userAuth=require('../../middlewares/userAuth')

router.get('/checkout',salesController.loadCheckout)
router.post('/add_address_checkout',salesController.addAddressCheckout)
router.post('/edit_address/:id',salesController.editAddressCheckout)
router.post('/checkout',salesController.saveOrder)
router.get('/thankyou',salesController.loadThankyou)
router.get('/orderTable',salesController.loadOrderTable)
router.get('/orderDetails/:orderId',salesController.loadOrderDetails)
router.post('/cancelOrder/:orderId/:productId', salesController.cancelProduct);






module.exports = router;
