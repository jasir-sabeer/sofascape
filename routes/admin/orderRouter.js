const express=require('express')
const router=express.Router();
const orderController=require('../../controllers/admin/orderController')
const adminAuth=require('../../middlewares/adminAuth');

router.get('/orderManagement',adminAuth.adminlogin,orderController.loadOrderManagement)
router.post('/update-product-status/:orderId/:productId/:status',orderController.changeStatus)
router.post('/cancelOrder/:orderId/:productId', orderController.cancelProduct);
router.get('/viewMore/:orderId/:productId',orderController.orderDetails)







module.exports=router;