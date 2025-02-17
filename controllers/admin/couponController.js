const Coupon = require('../../models/couponSchema')



const loadCouponManagement = async (req, res) => {
    try {
        const coupons = await Coupon.find({ isExpired: false })

        res.render('couponManagement', { coupons })
    } catch (error) {
        console.error("Error i", error.message);
        res.status(500).send("An error in load coupon managemet");
    }
}

const loadAddCoupon = async (req, res) => {
    try {

        res.render('addCoupon')
    } catch (error) {
        console.error("Error i", error.message);
        res.status(500).send("An error in load coupon managemet");
    }
}


const addCoupons = async (req, res) => {
    try {
        const { code, discountValue, minPurchase, startDate, expiryDate } = req.body;
         
        if (!code || !discountValue || !minPurchase || !startDate || !expiryDate) {
            return res.render('addCoupon', { message: 'All fields are required!' });
        }


        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.render('addCoupon', { message: 'This coupon code already exists. Please use a different code.' });
        }

        const coupons = new Coupon({
            code,
            discountValue,
            minPurchase,
            startDate: new Date(startDate),
            expiryDate: new Date(expiryDate),
        });

        await coupons.save();

        res.redirect('/admin/couponManagement');
    } catch (error) {
        console.error('Error in addCoupons:', error.message);
        res.status(500).render('addCoupon', { message: 'An error occurred. Please try again later.' });
    }
};


const toggleCouponStatus = async (req, res) => {
    const couponId = req.params.id;
    try {
       const coupon = await Coupon.findById(couponId);
       if (!coupon) {
           return res.status(404).json({ success: false, message: "Coupon not found" });
       }
       const newStatus = !coupon.isListed;
       const updatedCoupon = await Coupon.findByIdAndUpdate(
           couponId,
           { isListed: newStatus },
           { new: true } 
       );

       res.json({ success: true, newStatus: updatedCoupon.isListed });
    } catch (error) {
        console.error('Error toggling coupon status:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const removeCoupon = async (req, res) => {
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
    toggleCouponStatus,
    removeCoupon
}





