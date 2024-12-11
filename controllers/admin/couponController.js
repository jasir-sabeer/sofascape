const Coupon=require('../../models/couponSchema')



const loadCouponManagement =async(req,res)=>{
try {
    const coupons= await Coupon.find({isExpired:false})

    res.render('couponManagement',{coupons})
} catch (error) {
    console.error("Error i", error.message);
        res.status(500).send("An error in load coupon managemet");
}
}

const loadAddCoupon=async(req,res)=>{
    try {

        res.render('addCoupon')
    } catch (error) {
        console.error("Error i", error.message);
        res.status(500).send("An error in load coupon managemet");
    }
}


const addCoupons=async(req,res)=>{
    const {code,discountValue,minPurchase,startDate,expiryDate,limit}=req.body;
   
    console.log(code);
    try {

        const coupons= new Coupon({
            code,
            discountValue,
            minPurchase,
            startDate,
            expiryDate,
            userLimit:limit

        })

        await coupons.save()
        res.redirect('/admin/couponManagement')
        
        
    } catch (error) {
        console.error("Error i", error.message);
        res.status(500).send("An error in load coupon managemet");
    }
}

const toggle_status=async(req,res)=>{
    const couponId = req.params.id;
    try {
        const coupon = await Coupon.findById(couponId);
        const newStatus = !coupon.isListed;
        await Coupon.findByIdAndUpdate(couponId, { isListed: newStatus });
        res.redirect("/admin/couponManagement");
    } catch (error) {
        console.error('Error toggling product status:', error);
        res.status(500).send('Internal Server Error');
    }
}

const removeCoupon=async(req,res)=>{
    try {
        const couponId = req.params.id;

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        res.status(200).json({ success: true, message: 'Coupon removed successfully' });
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}


module.exports = {
loadCouponManagement,
loadAddCoupon,
addCoupons,
toggle_status,
removeCoupon
}





