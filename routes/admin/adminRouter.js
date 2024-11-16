const express=require('express')
const router=express.Router();
const admincontroller=require('../../controllers/admin/admincontroller')
const adminAuth=require('../../middlewares/adminAuth');
const upload=require('../../controllers/admin/imagecontroller')



router.get('/pageerror',admincontroller.pageerror)
router.get('/adminLogin',admincontroller.loadadminLogin)
router.post('/adminLogin',admincontroller.login)
router.get('/dashboard',adminAuth.adminlogin,admincontroller.loadDashboard)
router.get('/userManagement',adminAuth.adminlogin,admincontroller.loaduserManagement)
router.post('/userManagement/blockUser/:id',admincontroller.blockUser);
router.post('/userManagement/unblockUser/:id', admincontroller.unblockUser);
router.get('/categoryManagement',adminAuth.adminlogin,admincontroller.loadCategory)
router.post("/categoryManagement/add",admincontroller.addCategory)
router.post("/categoryManagement/edit",admincontroller.editCategory)
router.post('/categoryManagement/toggle-status/:id',admincontroller.toggleCategoryStatus);
router.get('/productManagement',adminAuth.adminlogin,admincontroller.loadProduct)
router.post("/productManagement/add", upload.array('images', 3), admincontroller.addProduct);
router.post("/productManagement/edit/:id", upload.array("images", 3), admincontroller.editProduct);
router.post('/productManagement/toggle-status/:id',admincontroller.toggleProductStatus);
router.post('/logout',admincontroller.logout)







module.exports=router;

