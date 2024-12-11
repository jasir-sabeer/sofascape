const express=require('express')
const router=express.Router();
const offerController=require('../../controllers/admin/offerController')
const adminAuth=require('../../middlewares/adminAuth');

router.get('/offerManagement',offerController.loadOfferManagement)
router.get('/addOffer',offerController.loadAddOffer)
router.post('/offers/add',offerController.addOffer)
router.delete('/offer/remove/:id',offerController.removeOffer)



module.exports=router;
