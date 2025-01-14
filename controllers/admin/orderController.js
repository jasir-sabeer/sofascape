const User = require('../../models/userschema');
const Admin = require('../../models/adminschema')
const Category = require('../../models/categoryschema');
const Product = require('../../models/prductschema');
const Order = require('../../models/orderSchema')
const mongoose = require('mongoose');

const loadOrderManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;
        const skip = (page - 1) * limit;

        const [totalOrders, orders] = await Promise.all([
            Order.countDocuments(),
            Order.find()
                .populate("userId")
                .populate("products.productId")
                .skip(skip)
                .sort({ _id: -1 })
                .limit(limit),
        ]);

        const totalPages = Math.ceil(totalOrders / limit);
        const previousPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        res.render("orderManagement", {
            orders,
            currentPage: page,
            totalPages: totalPages || 1, // Handle empty orders case
            previousPage,
            nextPage,
        });
    } catch (error) {
        console.error("Error in product management:", error.message);
        res.status(500).send("An error occurred while fetching orders");
    }
};


const changeStatus = async (req, res) => {
    const { orderId, productId, status } = req.params;

    try {


        if (!['Pending', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
            return res.status(400).send("Invalid status");
        }

        await Order.updateOne(
            { _id: orderId, "products.productId": productId },
            { $set: { "products.$.status": status } }
        );

        res.status(200).send('status changed');
    } catch (error) {
        console.error("Error updating product status:", error.message);
        res.status(500).send("An error occurred while updating the product status");
    }
}

const cancelProduct = async (req, res) => {
    const { orderId, productId } = req.params;

    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).send('Order not found');

        const product = order.products.find(p => p.productId.toString() === productId);
        if (!product) return res.status(404).send('Product not found in the order');

        product.status = 'Cancelled';

        await order.save();

        res.status(200).send('Product cancelled successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing request');
    }
}

const orderDetails = async(req,res)=>{
    const { orderId, productId } = req.params;
    try {
        const order = await Order.findById(orderId).populate('address');
        if (!order) return res.status(404).send('Order not found');

        const product = order.products.find(p => p.productId.toString() === productId);
        if (!product) return res.status(404).send('Product not found in the order');
     
        res.render('orderDetailsPage',{order,product})

    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing request');
        
        
    }
}



module.exports = {
    loadOrderManagement,
    changeStatus,
    cancelProduct,
    orderDetails
}