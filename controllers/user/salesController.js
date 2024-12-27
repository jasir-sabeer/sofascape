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
            return res.status(400).send("Your cart is empty");
        }


        let subtotal = 0;
        let productTotal;
        cartProduct.products.forEach(item => {
            if (item.productId.discountPrice && item.productId.discountPrice < item.productId.regularprice) {
                productTotal = item.quantity * item.productId.discountPrice;
            } else {
                productTotal = item.quantity * item.productId.regularprice;
            }
            item.subtotal = productTotal;
            subtotal += productTotal;
        });


        const usedCouponIds = user.usedCoupons.map(used => used.couponId._id.toString());
        const coupons = await Coupon.find({
            isListed: true,
            isExpired: false,
            _id: { $nin: usedCouponIds }
        });


        const shipping = 50;
        const total = subtotal + shipping;


        const addresses = await Address.find({ user: userId });


        res.render("checkout", { addresses, cartProduct: cartProduct.products, subtotal, total, coupons });

    } catch (error) {
        console.error("Error loading checkout:", error);
        res.status(500).json({ error: 'Server error, please try again later.' });
    }
};

const addAddressCheckout = async (req, res) => {
    const { firstName, lastName, email, phoneNumber, address, street, city, state, pincode } = req.body;
    console.log(req.body)
    const userId = req.session.user;
    try {
        const addresses = new Address({
            user: userId,
            firstName,
            lastName,
            email,
            phoneNumber,
            address,
            street,
            city,
            state,
            pincode
        })
        await addresses.save()
        res.redirect('/checkout?success=address added successfully.');


    } catch (error) {
        console.log(error);

        res.status(500).json({ message: 'Error adding adress', error });
    }
}

const editAddressCheckout = async (req, res) => {
    const addressId = req.params.id;
    const updatedData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
    };

    try {
        const address = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });
        if (!address) {
            return res.status(404).send('Address not found');
        }


        res.redirect('/checkout');
    } catch (error) {
        console.error('Error updating address:', error);
    }
}

const saveOrder = async (req, res) => {
    const userId = req.session.user;
    const {
        addressId, 
        cartItems, 
        subtotal, 
        shippingCost, 
        total,
        paymentMethod, 
        couponCode, 
        couponDiscountValue, 
        finalDiscountAmount, 
        paymentStatus
    } = req.body;
   


    if (isNaN(total) || total <= 0) {
        return res.status(400).json({ error: 'Invalid total amount.' });
    }

    try {
        const orderProducts = cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            name: item.name,
            price: item.price,
            image: item.image,
            status: item.status,
        }));

        const finalPaymentStatus = paymentStatus;

        const newOrder = new Order({
            userId,
            products: orderProducts,
            address: addressId,
            total,
            subtotal,
            shippingCost,
            paymentMethod,
            createdAt: new Date(),
            paymentStatus: finalPaymentStatus,
            couponCode: couponCode || null,
            couponDiscountValue: couponDiscountValue || 0,
            finalDiscountAmount: finalDiscountAmount || 0,
        });

        const savedOrder = await newOrder.save();

        // Clear cart after order
        const cartClearResult = await Cart.findOneAndUpdate(
            { userId },
            { products: [] },
            { new: true }
        );

        if (!cartClearResult) {
            console.warn('Cart not found or already empty.');
            return res.status(404).json({ success: false, message: 'Cart not found or already empty.' });
        }

        if (couponCode) {
            const discountCode = await Coupon.findOne({ code: couponCode });
            if (discountCode) {
                const user = await User.findById(userId);

                const existingCoupon = user.usedCoupons.find(c => c.couponId.equals(discountCode._id));
                if (existingCoupon) {
                    existingCoupon.usageCount += 1;
                } else {
                    user.usedCoupons.push({ couponId: discountCode._id, usageCount: 1 }); // Add new coupon
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
        return res.status(500).json({ error: 'Failed to place order' });
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



        res.render('orderTable', { orders })
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


        res.render('orderDetails', { orders });
    } catch (error) {
        res.status(500).json({ message: 'Error loading order details', error });
    }
};

const cancelProduct = async (req, res) => {
    const { orderId, productId } = req.params;

    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).send('Order not found');

        const product = order.products.find(p => p.productId.toString() === productId);
        if (!product) return res.status(404).send('Product not found in the order');

        // Cancel the product and update the stock
        const originalProduct = await Product.findById(productId);
        product.status = 'Cancelled';
        originalProduct.stock += product.quantity;
        await originalProduct.save();

        // Recalculate order subtotal
        let newSubtotal = order.products.reduce((sum, p) => {
            if (p.status !== 'Cancelled') {
                return sum + (p.offerPrice || p.price) * p.quantity;
            }
            return sum;
        }, 0);
        order.subtotal = newSubtotal;

        // If all products are canceled, update order status
        if (order.products.every(p => p.status === 'Cancelled')) {
            order.shippingCost = 0;
            order.total = 0;
            order.status = 'Cancelled';
        } else {
            const priceToRefund = product.offerPrice || product.price;
            order.total -= priceToRefund * product.quantity;
            if (order.total < 0) order.total = 0;
        }

        // Only process wallet refund if the payment is completed
        if (order.paymentStatus === 'Completed') {
            const priceToRefund = product.offerPrice || product.price;
            let refundAmount = priceToRefund * product.quantity;

            // Apply coupon discount if all products are canceled
            if (order.couponDiscount > 0 && order.products.every(p => p.status === 'Cancelled')) {
                refundAmount -= order.couponDiscount;
            }

            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId: order.userId,
                    balance: refundAmount,
                    transactions: [{
                        type: 'refund',
                        amount: refundAmount,
                        description: `Refund for cancelled product (${product.name}) in order ${orderId}`
                    }]
                });
            } else {
                wallet.balance += refundAmount;
                wallet.transactions.push({
                    type: 'refund',
                    amount: refundAmount,
                    description: `Refund for cancelled product (${product.name}) in order ${orderId}`
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
    const id = req.session.user;

    try {

        const users = await User.findOne({ _id: id, isblocked: false });


        if (!users) {
            res.status(404).render('login')
        }


        const userId = req.session.user;
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId').exec()
        if (!wishlist) {
            return res.render('wishlist', { wishlistProducts: [] });
        }

        res.render('wishlist', { wishlistProducts: wishlist.products });
    } catch (error) {
        console.error('Error loading wishlist page:', error);
        res.redirect('/page-404');
    }
}

const discountCoupon = async (req, res) => {
    const { coupuncode } = req.body;
    console.log('Received coupon code:', coupuncode);
    const userId = req.session.user;

    try {
        const discountCode = await Coupon.findOne({
            code: coupuncode,
            isListed: true,
            isExpired: false,
        });

        if (!discountCode) {
            console.log('No matching coupon found.');
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const currentDate = new Date();
        if (discountCode.expiryDate < currentDate) {
            console.log('Coupon has expired.');
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

        const discountValue = discountCode.discountValue;
        const afterCoupon = subtotal - (subtotal * discountValue / 100);
        const discountAmount = ((subtotal + 50) * discountValue) / 100;

        console.log('Subtotal:', subtotal);
        console.log('Total after applying coupon:', afterCoupon);

        return res.json({ discountCode, afterCoupon, discountAmount });
    } catch (error) {
        console.error('Error during coupon query:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const addWishlist = async (req, res) => {
    const productId = req.params.id;
    console.log('Check product:', productId);

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

        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.render('wallet', {
                wallet: { balance: 0, transactions: [] },
                totalPages: 1,
                currentPage: 1,
            });
        }


        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / pageSize);


        if (page < 1 || page > totalPages) {
            return res.status(400).send('Invalid page number.');
        }


        const paginatedTransactions = wallet.transactions
            .sort((a, b) => b.date - a.date)
            .slice((page - 1) * pageSize, page * pageSize);


        res.render('wallet', {
            wallet: {
                balance: wallet.balance,
                transactions: paginatedTransactions,
            },
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error("Error loading wallet page:", error);
        res.status(500).send('An error occurred while loading the wallet page.');
    }
};

const downloadInvoice = async (req, res) => {
    const { orderId } = req.params;
    console.log('bbbbbbbbb', orderId);

    const order = await Order.findById(orderId).populate('userId').populate('address');

    if (!order) {
        return res.status(404).send('Order not found');
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('SOFASCAPE', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).font('Helvetica').text(`Order ID: ${orderId}`);
    doc.text(`Date: ${order.createdAt.toLocaleDateString('en-US')}`);
    doc.moveDown();

    doc.fontSize(11).text(`Customer Name: ${order.address.firstName}  ${order.address.lastName} `);
    doc.text(`Phone: ${order.address.phoneNumber}`);
    doc.text(`Address: ${order.address.address}`);
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
            orderData: reOrder, // Include this if needed
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


module.exports = {
    loadCheckout,
    addAddressCheckout,
    editAddressCheckout,
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
    paymentSuccess

}







