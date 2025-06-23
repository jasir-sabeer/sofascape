const { name } = require("ejs");
const mongoose = require("mongoose");
const User = require("../../models/userschema");
const Address = require('../../models/addressschema')
const Cart = require('../../models/cartSchema')
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema')
const razorpay = require('razorpay')
const Wishlist = require('../../models/wishlist')
const Product = require('../../models/prductschema')
const Wallet = require('../../models/walletSchema')
const Category=require('../../models/categoryschema')
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');



const loadCheckout = async (req, res) => {
    const userId = req.session.user;

    try {
        const user = await User.findById(userId).populate('usedCoupons.couponId');
        if (!user) {
            return res.status(401).send("User not found or not logged in");
        }

        const cartProduct = await Cart.findOne({ userId }).populate("products.productId").exec();
        if (!cartProduct || cartProduct.products.length === 0) {
            return res.status(400).redirect('/cartPage');
        }

        let validProducts = [];
        let subtotal = 0;

        for (const item of cartProduct.products) {
            const product = await Product.findById(item.productId._id);

            if (!product || product.stock < item.quantity) {
                await Cart.updateOne(
                    { userId },
                    { $pull: { products: { productId: item.productId._id } } }
                );
                continue;
            }

            const category = await Category.findById(product.category);
            if (!product.isListed || !category || !category.isListed) {
                await Cart.updateOne(
                    { userId },
                    { $pull: { products: { productId: item.productId._id } } }
                );
                continue;
            }

            const price = product.discountPrice && product.discountPrice < product.regularprice
                ? product.discountPrice
                : product.regularprice;

            item.subtotal = item.quantity * price;
            subtotal += item.subtotal;

            validProducts.push(item);
        }

        if (validProducts.length === 0) {
            return res.status(400).send("No valid products in your cart");
        }

        const usedCouponIds = user.usedCoupons.map(used => used.couponId._id.toString());
        const coupons = await Coupon.find({
            isListed: true,
            isExpired: false,
            _id: { $nin: usedCouponIds }
        });

        const shipping = 50;
        const total = subtotal + shipping;

        const addresses = await Address.find({ user: userId });

        const cartCount = validProducts.length;

        res.render("checkout", { addresses, cartProduct: validProducts, subtotal, total, coupons, cartCount });
    } catch (error) {
        console.error("Error loading checkout:", error);
        res.status(500).json({ error: 'Server error, please try again later.' });
    }
};




function generateOrderId(prefix = "ORD") {
    const timestamp = Date.now().toString(36); 
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `${prefix}-${timestamp}-${randomString}`;
    return orderId;
  }
  

const saveOrder = async (req, res) => {
    const userId = req.session.user;
    const {
        addressItems,
        cartItems,
        subtotal,
        shippingCost,
        total,
        paymentMethod,
        couponCode,
        couponDiscountValue,
        finalDiscountAmount,
        paymentStatus,
        couponPercentage
    } = req.body;


    if (isNaN(total) || total <= 0) {
        return res.status(400).json({ message: 'Invalid total amount.' });
    }

    try {
        let wallet = null;
        const realTotal = finalDiscountAmount || total;

        if (paymentMethod === "wallet") {
            wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < realTotal) {
                return res.status(400).json({ message: 'Insufficient wallet balance.' });
            }
        }

        const orderAddress={
            
                customerName: addressItems.customerName,
                email: addressItems.email,
                phone: addressItems.phone,
                localaddress: addressItems.address, 
                street: addressItems.street,
                city: addressItems.city,
                state: addressItems.state,
                pincode: addressItems.pincode,
            
        }

          

        const orderProducts = cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            name: item.name,
            price: item.price,
            image: item.image,
            status: item.status,
        }));

        for (const item of cartItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for product ${product.name}.` });
            }
            product.stock -= item.quantity;
            await product.save();
        }

        if (paymentMethod === "wallet") {
            wallet.balance -= realTotal;
            wallet.transactions.push({
                type: 'debit',
                amount: realTotal,
                description: `Order payment for order total ${realTotal}`,
            });
            await wallet.save();
        }
    console.log('address',addressItems)
    const newOrder = new Order({
    userId,
    products: orderProducts,
    total,
    subtotal,
    shippingCost,
    paymentMethod,
    createdAt: new Date(),
    paymentStatus: paymentMethod === "wallet" ? "Completed" : paymentStatus,
    couponCode: couponCode || null,
    couponDiscountValue: couponDiscountValue || 0,
    finalDiscountAmount: finalDiscountAmount || 0,
    address:orderAddress,
    couponDiscountPercentage: couponPercentage || 0,
    orderId: generateOrderId(prefix = "ORD"),
});


        const savedOrder = await newOrder.save();
        const cartClearResult = await Cart.findOneAndUpdate(
            { userId },
            { products: [] },
            { new: true }
        );

        if (!cartClearResult) {
            return res.status(404).json({ message: 'Cart not found or already empty.' });
        }

        if (couponCode) {
            const discountCode = await Coupon.findOne({ code: couponCode });
            if (discountCode) {
                const user = await User.findById(userId);
                const existingCoupon = user.usedCoupons.find(c => c.couponId.equals(discountCode._id));
                if (existingCoupon) {
                    existingCoupon.usageCount += 1;
                } else {
                    user.usedCoupons.push({ couponId: discountCode._id, usageCount: 1 });
                }
                await user.save();
            }
        }

        return res.status(200).json({
            success: true,
            orderId: savedOrder._id,
            message: 'Order placed successfully',
        });
    } catch (error) {
        console.error('Error saving order:', error);
        return res.status(500).json({ message: 'Failed to place order. Please try again later.' });
    }
};


const loadThankyou = async (req, res) => {
    const { orderId } = req.query;
    const user = req.session.user;
    try {
        const orders = await Order.findOne({ _id: orderId, userId: user }).populate('address');
        console.log('Order with address:', orders);
        res.render('thankyou', { orders });
    } catch (error) {
        console.error('Error loading thank you page:', error);
        res.status(500).json({ message: 'Error adding order', error });
    }
};

const loadOrderTable = async (req, res) => {
    const userId = req.session.user;
    try {
        const orders = await Order.find({ userId })
            .populate('products.productId')
            .populate('address')
            .sort({ _id: -1 })
        const cart = await Cart.findOne({ userId: req.session.user });
        let cartCount = 0;
        if (cart && cart.products) {
            cartCount = cart.products.length;
        }


        res.render('orderTable', { orders, cartCount })
    } catch (error) {
        console.error('Error loading thank you page:', error);
        res.status(500).json({ message: 'Error adding order', error });
    }
}

const loadOrderDetails = async (req, res) => {
    const { orderId } = req.params;
    const user = req.session.user;

    try {
        const orders = await Order.findOne({ _id: orderId, userId: user }).populate('address');

        if (!orders) {
            return res.status(404).json({ message: 'Order not found' });
        }


        const cart = await Cart.findOne({ userId: req.session.user });
        let cartCount = 0;
        if (cart && cart.products) {
            cartCount = cart.products.length;
        }


        res.render('orderDetails', { orders, cartCount });
    } catch (error) {
        res.status(500).json({ message: 'Error loading order details', error });
    }
};

const cancelProduct = async (req, res) => {
    const { orderId, productId } = req.params;

    try {
        const order = await Order.findById(orderId).populate('couponCode');
        if (!order) return res.status(404).send('Order not found');

        const product = order.products.find(p => p.productId.toString() === productId);
        if (!product) return res.status(404).send('Product not found in the order');

        const originalProduct = await Product.findById(productId);
        product.status = 'Cancelled';
        originalProduct.stock += product.quantity;
        await originalProduct.save();

        let newSubtotal = order.products.reduce((sum, p) => {
            if (p.status !== 'Cancelled') {
                return sum + (p.offerPrice || p.price) * p.quantity;
            }
            return sum;
        }, 0);

        const canceledProductValue = (product.offerPrice || product.price) * product.quantity;

        order.subtotal = newSubtotal;

        const currentDate = new Date();
        const coupon = await Coupon.findOne({
            code: order.couponCode,
            isExpired: false,
            isListed: true,
            startDate: { $lte: currentDate },
            expiryDate: { $gte: currentDate }
        });

        let couponDiscount = 0; 
        let canceledDiscount = 0;

        if (coupon) {

            const discountPercentage = coupon.discountValue / 100;

            canceledDiscount = canceledProductValue * discountPercentage;

            couponDiscount = newSubtotal * discountPercentage;
            order.couponDiscountValue = couponDiscount;

           
        } else {
            order.couponDiscountValue = 0;
        }

        order.total = newSubtotal - order.couponDiscountValue + 50; 

        if(coupon){
            order.finalDiscountAmount = newSubtotal - order.couponDiscountValue + 50; 
        }

        let refundAmount = canceledProductValue;

        if (coupon) {
            refundAmount -= canceledDiscount;
        }

        const isLastProduct = order.products.every(p => p.status === 'Cancelled');

        if (isLastProduct) {
            refundAmount += order.shippingCost;
            order.shippingCost = 0; 
            order.total = 0;
            order.status = 'Cancelled';
            if(coupon){
                order.finalDiscountAmount = 0;
            } 
        }

        if (order.paymentStatus === 'Completed') {
            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId: order.userId,
                    balance: refundAmount,
                    transactions: [{
                        type: 'refund',
                        amount: refundAmount,
                        description: `Refund for cancelled product (${product.name}) in order ${order.orderId} ${
                            isLastProduct ? 'including shipping cost' : ''
                        }`
                    }]
                });
            } else {
                wallet.balance += refundAmount;
                wallet.transactions.push({
                    type: 'refund',
                    amount: refundAmount,
                    description: `Refund for cancelled product (${product.name}) in order ${order.orderId} ${
                        isLastProduct ? 'including shipping cost' : ''
                    }`
                });
            }

            await wallet.save();
        }

        await order.save();

        res.redirect('/wallet');
    } catch (error) {
        console.error("Error cancelling product:", error);
        res.status(500).send({ message: 'Error processing cancellation', error });
    }
};


const loadWishList = async (req, res) => {

    const userId = req.session.user;

    try {
        if (!userId) {
            return res.status(401).redirect('/login'); 
        }

        const user = await User.findOne({ _id: userId, isblocked: false });
        if (!user) {
            return res.status(404).render('login');
        }

        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId').exec();
        if (!wishlist) {
            return res.render('wishlist', { wishlistProducts: [], cartCount: 0 });
        }

        const cart = await Cart.findOne({ userId });

        let cartCount = 0;
        if (cart && Array.isArray(cart.products)) {
            cartCount = cart.products.length;
        }

        res.render('wishlist', { wishlistProducts: wishlist.products, cartCount });
    } catch (error) {
        console.error('Error loading wishlist page:', error);
        res.redirect('/page-404');
    }
};


const discountCoupon = async (req, res) => {
    const { coupuncode } = req.body;
    const userId = req.session.user;

    try {

        const discountCode = await Coupon.findOne({
            code: coupuncode,
            isListed: true,
            isExpired: false,
        });

        if (!discountCode) {
            return res.status(404).json({ message: 'Please Enter a Valied code' });
        }

      

        const currentDate = new Date();
        if (discountCode.expiryDate < currentDate) {

            await Coupon.updateOne(
                { _id: discountCode._id },
                { $set: { isExpired: true } }
            );

            return res.status(400).json({ message: 'Coupon has expired' });
        }

        const cart = await Cart.findOne({ userId }).populate('products.productId').exec();
        if (!cart || cart.products.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        let subtotal = 0;
        cart.products.forEach(item => {
            const price = item.productId.discountPrice && item.productId.discountPrice < item.productId.regularprice
                ? item.productId.discountPrice
                : item.productId.regularprice;
            const productTotal = item.quantity * price;
            subtotal += productTotal;
        });


        if (subtotal < discountCode.minPurchase) {
            return res.status(400).json({
                message: `This coupon requires a minimum purchase of ${discountCode.minPurchase}.`
            });
        }

        const discountValue = discountCode.discountValue;
        
        const discountAmount = (subtotal * discountValue) / 100;
        const afterCoupon = subtotal - discountAmount;


        return res.json({ discountCode, afterCoupon, discountAmount });
    } catch (error) {
        console.error('Error during coupon query:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const addWishlist = async (req, res) => {
    const productId = req.params.id;

    const userId = req.session.user;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }


        let wishlist = await Wishlist.findOne({ userId });

        if (wishlist && wishlist.products && wishlist.products.length > 0) {
            for (let item of wishlist.products) {
                if (item.productId.toString() === productId) {
                    return res.status(200).send(' Already Added');
                }
            }
        }


        if (!wishlist) {
            wishlist = await Wishlist.create({
                userId,
                products: [
                    {
                        productId,
                        productname: product.productname || 'Unknown',
                        image: product.images?.length ? product.images[0] : '',
                        regularprice: product.discountPrice && product.discountPrice < product.regularprice
                            ? product.discountPrice
                            : product.regularprice || 0,
                    },
                ],
            });

            return res.status(201).send('product added in wishlist');
        }




        wishlist.products.push({
            productId,
            productname: product.productname || 'Unknown',
            image: product.images?.length ? product.images[0] : '',
            regularprice: product.discountPrice && product.discountPrice < product.regularprice
                ? product.discountPrice
                : product.regularprice || 0,
        });

        await wishlist.save();

        return res.status(200).send('product added in wishlist');
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const cancelProductWshlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId').exec();

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'product not found' });
        }

        const productIndex = wishlist.products.findIndex(
            (item) => item.productId._id.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        wishlist.products.splice(productIndex, 1);

        if (wishlist.products.length === 0) {

            await Wishlist.deleteOne({ _id: wishlist._id });
            return res.json({ success: true, message: ' deleted as no products are left' });
        } else {

            await wishlist.save();
            return res.json({ success: true, message: 'Product removed from wishlist' });
        }
    } catch (error) {
        console.error('Error canceling product:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

const instance = new razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_SECRET
});

const createOrder = async (req, res) => {
    const { addressId, cartItems, subtotal, shippingCost, total, paymentMethod, couponDiscountValue, finalDiscountAmount } = req.body;
    const userId = req.session?.user;
    try {
        const finalAmount = finalDiscountAmount
            ? parseFloat(finalDiscountAmount)
            : parseFloat(total);

        const options = {
            amount: finalAmount * 100,
            currency: "INR",
            receipt: "order_receipt_" + new Date().getTime(),
            payment_capture: 1
        };

        const order = await instance.orders.create(options);

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: options.amount
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create Razorpay order'
        });
    }
};

const paymentFailer = async (req, res) => {
    const { orderId, paymentStatus } = req.body;

    try {
        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.paymentStatus = paymentStatus;
        await order.save();

        res.status(200).json({ message: 'Payment status updated successfully' });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
}

const loadWalletPage = async (req, res) => {
    const userId = req.session.user; 
    const page = parseInt(req.query.page) || 1; 
    const pageSize = 5; 

    try {
        if (!userId) {
            return res.status(401).redirect('/login');
        }

        const cart = await Cart.findOne({ userId });
        let cartCount = 0;
        if (cart && Array.isArray(cart.products)) {
            cartCount = cart.products.length;
        }

        const wallet = await Wallet.findOne({ userId }).populate('transactions');
        if (!wallet) {
            return res.render('wallet', {
                wallet: { balance: 0, transactions: [] },
                totalPages: 1,
                currentPage: 1,
                cartCount,
            });
        }

        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.max(1, Math.ceil(totalTransactions / pageSize));

        if (page < 1 || page > totalPages) {
            return res.status(400).send('Invalid page number.');
        }

        const paginatedTransactions = wallet.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date)) 
            .slice((page - 1) * pageSize, page * pageSize); 

        res.render('wallet', {
            wallet: {
                balance: wallet.balance,
                transactions: paginatedTransactions,
            },
            totalPages,
            currentPage: page,
            cartCount,
        });
    } catch (error) {
        console.error('Error loading wallet page:', error);
        res.status(500).send('An error occurred while loading the wallet page.');
    }
};



const downloadInvoice = async (req, res) => {
    const { Id } = req.params;

    const order = await Order.findById(Id).populate('userId').populate('address');
    if (!order) {
        return res.status(404).send('Order not found');
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('SOFASCAPE', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).font('Helvetica').text(`Order ID: ${order.orderId}`);
    doc.text(`Date: ${order.createdAt.toLocaleDateString('en-US')}`);
    doc.moveDown();

    doc.fontSize(11).text(`Customer Name: ${order.address.customerName}`);
    doc.text(`Phone: ${order.address.phone}`);
    doc.text(`Address: ${order.address.localaddress}`);
    doc.text(`${order.address.street},${order.address.city}, ${order.address.state}  `);
    doc.text(`pincode:${order.address.pincode}`);


    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Products: ', { underline: true });
    order.products.forEach((item) => {
        doc.fontSize(12).font('Helvetica')
            .text(`${item.name} (x${item.quantity})`, { continued: true })
            .text(`₹${item.price}`, { align: 'right' });

    });
    doc.moveDown();

    doc.fontSize(14).font('Helvetica').text(`Subtotal: ₹${order.subtotal}`, { align: 'right' });
    doc.text(`Shipping Cost: ₹${order.shippingCost}`, { align: 'right' });

    if (order.finalDiscountAmount) {
        doc.text(`Discount: -₹${order.couponDiscountValue}`, { align: 'right' });
        doc.moveDown();
        doc.fontSize(16).font('Helvetica-Bold').text(`Total: ₹${order.finalDiscountAmount}`, { align: 'right' });
    } else {
        doc.moveDown();
        doc.fontSize(16).font('Helvetica-Bold').text(`Total: ₹${order.total}`, { align: 'right' });
    }

    doc.moveDown()
    doc.text(`Thank You For Business`, { align: 'center' });
    doc.moveDown()
     doc.fontSize(10).font('Helvetica-Bold').text(`Thank you for purchasing our product! We truly appreciate your trust in our brand and are delighted to have you as a valued customer. Your support means a lot to us, and we are committed to providing you with high-quality products and excellent service. We hope you enjoy your purchase and that it meets all your expectations. If you have any questions, feedback, or need assistance, please don’t hesitate to reach out to our support team. Your satisfaction is our top priority, and we look forward to serving you again in the future. Thank you once again for choosing us!`, { align: 'center' });



    doc.end();
};

const retryPayment = async (req, res) => {
    const orderId = req.params.id;
    console.log('Retry Payment for Order ID:', orderId);

    try {
        const reOrder = await Order.findById(orderId).populate("address");
        if (!reOrder) {
            return res.status(400).json({ error: "Order not found" });
        }

        const finalAmount = reOrder.finalDiscountAmount
            ? parseFloat(reOrder.finalDiscountAmount)
            : parseFloat(reOrder.total);

        const options = {
            amount: finalAmount * 100,
            currency: "INR",
            receipt: `order_receipt_${orderId}`,
            payment_capture: 1
        };

        const order = await instance.orders.create(options);

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: options.amount,
            orderData: reOrder,
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create Razorpay order'
        });
    }
};

const paymentSuccess = async (req, res) => {
    const { orderId } = req.body;

    try {
        const order = await Order.findById(orderId)


        if (!order) {
            return res.status(400).json({ success: false, message: "Order not found" });
        }


        order.paymentStatus = "Completed"

        await order.save();


        return res.status(200).json({
            success: true,
            orderId: order._id,
            message: 'success'

        });

    } catch (error) {
        console.error("Error in payment success:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const rturnProduct = async (req, res) => {
    const { orderId, productId } = req.params;
    const { returnReason } = req.body;

    try {
        const order = await Order.findById(orderId).populate('couponCode');
        if (!order) return res.status(404).send('Order not found');

        const product = order.products.find(p => p.productId.toString() === productId);
        if (!product) return res.status(404).send('Product not found in the order');

        product.status = 'Returned';
        product.returnReason = returnReason;

        const originalProduct = await Product.findById(productId);
        originalProduct.stock += product.quantity;
        await originalProduct.save();

        let newSubtotal = order.products.reduce((sum, p) => {
            if (p.status !== 'Returned') { 
                return sum + (p.offerPrice || p.price) * p.quantity;
            }
            return sum;
        }, 0);

        order.subtotal = newSubtotal;

        const currentDate = new Date();
        const coupon = await Coupon.findOne({
            code: order.couponCode,
            isExpired: false,
            isListed: true,
            startDate: { $lte: currentDate },
            expiryDate: { $gte: currentDate }
        });

        let couponDiscount = 0; 
        let returnedProductDiscount = 0; 

        if (coupon) {
            console.log('Coupon found:', coupon.code);

            const discountPercentage = coupon.discountValue / 100;

            returnedProductDiscount = (product.offerPrice || product.price) * product.quantity * discountPercentage;

            couponDiscount = newSubtotal * discountPercentage;
            order.couponDiscountValue = couponDiscount;

            console.log(`Returned Product Discount: ${returnedProductDiscount}`);
            console.log(`Updated Coupon Discount: ${couponDiscount}`);
        } else {
            order.couponDiscountValue = 0; 
        }

        order.total = newSubtotal - order.couponDiscountValue; 
        if(coupon){
            order.finalDiscountAmount = newSubtotal - order.couponDiscountValue; 

        }

        let refundAmount = (product.offerPrice || product.price) * product.quantity;

        if (coupon) {
            refundAmount -= returnedProductDiscount; 
        }

        const isLastProduct = order.products.every(p => p.status === 'Returned');

        if (isLastProduct) {
            order.total = 0; 
            order.status = 'Returned'; 
        }

        if (order.paymentStatus === 'Completed') {
            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId: order.userId,
                    balance: refundAmount,
                    transactions: [{
                        type: 'refund',
                        amount: refundAmount,
                        description: `Refund for returned product (${product.name}) in order ${order.orderId}, Reason: ${returnReason}`
                    }]
                });
            } else {
                wallet.balance += refundAmount;
                wallet.transactions.push({
                    type: 'refund',
                    amount: refundAmount,
                    description: `Refund for returned product (${product.name}) in order ${order.orderId}, Reason: ${returnReason}`
                });
            }

            await wallet.save();
        }

        await order.save();

        res.redirect('/wallet');
    } catch (error) {
        console.error("Error processing return:", error);
        res.status(500).send({ message: 'Error processing return', error });
    }
};



module.exports = {
    loadCheckout,
    saveOrder,
    loadThankyou,
    loadOrderTable,
    loadOrderDetails,
    cancelProduct,
    loadWishList,
    discountCoupon,
    addWishlist,
    cancelProductWshlist,
    createOrder,
    loadWalletPage,
    downloadInvoice,
    paymentFailer,
    retryPayment,
    paymentSuccess,
    rturnProduct

}







