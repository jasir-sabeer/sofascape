const express=require('express')
const router=express.Router();
const couponController=require('../../controllers/admin/couponController')
const adminAuth=require('../../middlewares/adminAuth');



router.get('/couponManagement',couponController.loadCouponManagement)
router.get('/addCoupon',couponController.loadAddCoupon)
router.post('/coupons/add',couponController.addCoupons)
router.post('/couponManagement/toggle-status/:id',couponController.toggle_status)
router.delete('/coupon/remove/:id',couponController.removeCoupon)




module.exports=router;
