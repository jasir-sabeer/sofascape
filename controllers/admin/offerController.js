const Offer = require('../../models/offerSchema')
const Product = require('../../models/prductschema')
const Category = require('../../models/categoryschema')
const mongoose = require('mongoose')

const loadOfferManagement = async (req, res) => {
    try {

        const offers = await Offer.find()
        res.render('offerManagement', { offers })
    } catch (error) {
        console.error("Error i", error.message);
        res.status(500).send("An error in load offer managemet");
    }
}

const loadAddOffer = async (req, res) => {
    try {
        const products = await Product.find();
        const categories = await Category.find();
        res.render('addOffer', { products, categories });


    } catch (error) {
        console.error("Error in", error.message);
        res.status(500).send("An error in load addOffer");
    }
}

const addOffer = async (req, res) => {
    try {
        const { offerName, applicableTo, discountValue, expiryDate } = req.body;

        const selectedIds = req.body[applicableTo === 'Product' ? 'products' : 'categories'];

        if (!selectedIds || selectedIds.length === 0) {
            return res.status(400).send('At least one item must be selected');
        }

        const applicableToId = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
        const newobjectids = applicableToId.map(id => new mongoose.Types.ObjectId(id));

        const newOffer = new Offer({
            offerName,
            applicableTo,
            applicableToId: newobjectids,
            discountValue,
            expiryDate,
        });

        await newOffer.save();

        if (applicableTo === 'Product') {
            // Handle direct product offers
            const products = await Product.find({ _id: { $in: newobjectids } });
            for (let product of products) {
                const discountedPrice = product.regularprice - (product.regularprice * (discountValue / 100));
                await Product.findByIdAndUpdate(
                    product._id,
                    {
                        offer: newOffer._id,
                        discountPrice: discountedPrice,
                        total: discountedPrice // Update total field if needed
                    },
                    { new: true }
                );
            }
        } else if (applicableTo === 'Category') {
            // Handle category-wide offers
            const products = await Product.find({ category: { $in: newobjectids } });
            for (let product of products) {
                const discountedPrice = product.regularprice - (product.regularprice * (discountValue / 100));
                await Product.findByIdAndUpdate(
                    product._id,
                    {
                        offer: newOffer._id,
                        discountPrice: discountedPrice,
                        total: discountedPrice // Update total field if needed
                    },
                    { new: true }
                );
            }

            await Category.updateMany(
                { _id: { $in: newobjectids } },
                { offer: newOffer._id }
            );
        }

        res.redirect('/admin/offerManagement');
    } catch (error) {
        console.error('Error in addOffer controller:', error.message);
        res.status(500).send('An error occurred while adding the offer');
    }
};







const removeOffer = async (req, res) => {
    try {
        const offerId = req.params.id;


        const deletedOffer = await Offer.findByIdAndDelete(offerId);

        if (!deletedOffer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }


        const productsWithOffer = await Product.find({ offer: offerId });

        for (const product of productsWithOffer) {
            await Product.findByIdAndUpdate(
                product._id,
                {
                    $unset: { offer: "" },
                    discountPrice: product.regularprice,
                },
                { new: true }
            );
        }


        await Category.updateMany(
            { offer: offerId },
            { $unset: { offer: "" } }
        );

        res.status(200).json({ success: true, message: 'Offer removed successfully' });
    } catch (error) {
        console.error('Error removing Offer:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


module.exports = {
    loadOfferManagement,
    loadAddOffer,
    addOffer,
    removeOffer
}
