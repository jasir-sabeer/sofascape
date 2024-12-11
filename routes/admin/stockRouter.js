const express=require('express')
const router=express.Router();
const stockController=require('../../controllers/admin/stockController')
const adminAuth=require('../../middlewares/adminAuth');

router.get('/inventoryManagement',adminAuth.adminlogin,stockController.loadInventoryPage)
router.post("/inventoryManagement/edit/:id", stockController.editStock);




module.exports=router;