const express=require('express')
const router=express.Router();
const salesReportController=require('../../controllers/admin/salesReportController')
const adminAuth=require('../../middlewares/adminAuth');


router.get('/salesReport',adminAuth.adminlogin,salesReportController.loadSalesReportPage)
router.post('/sales-report/download/pdf',salesReportController.downloadPDF)
router.post('/sales-report/download/excel',salesReportController.downloadExel)
router.post('/salesReport/filter',salesReportController.filter)
router.get('/dashboard',adminAuth.adminlogin,salesReportController.loadDashboard)
router.get('/sales-data',salesReportController.getSalesData)




module.exports=router;
