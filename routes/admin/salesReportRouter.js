const express=require('express')
const router=express.Router();
const salesReportController=require('../../controllers/admin/salesReportController')


router.get('/salesReport',salesReportController.loadSalesReportPage)
router.post('/sales-report/download/pdf',salesReportController.downloadPDF)
router.post('/sales-report/download/excel',salesReportController.downloadExel)
router.post('/salesReport/filter',salesReportController.filter)
module.exports=router;
